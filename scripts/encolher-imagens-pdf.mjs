/**
 * Recomprime as imagens de dentro de um PDF.
 *
 * O comprimir-pdf.mjs funde objetos repetidos e recolhe o lixo, mas não
 * mexe no conteúdo das figuras. Aqui cada JPEG embutido é reduzido e
 * reescrito em qualidade menor, que é onde ainda sobra peso num edital
 * cheio de brasões e tabelas digitalizadas.
 *
 * O texto não é tocado: continua selecionável e pesquisável.
 *
 * Uso: node scripts/encolher-imagens-pdf.mjs public/edital-002-2026.pdf
 *      (grava ao lado, com sufixo .novo, para você conferir antes de trocar)
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import * as mupdf from 'mupdf';
import sharp from 'sharp';

const ARQUIVO = process.argv[2] ?? 'public/edital-002-2026.pdf';
const LADO = 900;      // nenhuma figura do edital precisa de mais que isso na tela
const QUALIDADE = 58;  // JPEG; abaixo disso começa a sujar texto dentro de print

const antes = statSync(ARQUIVO).size;
const doc = mupdf.PDFDocument.openDocument(readFileSync(ARQUIVO), 'application/pdf');

let trocadas = 0;
let ganho = 0;

for (let i = 1; i < doc.countObjects(); i++) {
  const ref = doc.newIndirect(i);
  const o = ref.resolve();
  if (!o.isDictionary?.()) continue;
  if (String(o.get('Subtype')) !== '/Image') continue;
  if (String(o.get('Filter')) !== '/DCTDecode') continue; // só JPEG: o resto é máscara

  let bruto;
  try {
    bruto = Buffer.from(ref.readRawStream().asUint8Array());
  } catch {
    continue;
  }

  const larg = Number(o.get('Width'));
  const alt = Number(o.get('Height'));

  // imagem com máscara de transparência não pode encolher: a máscara é outro
  // objeto, do tamanho antigo, e o PDF exige que os dois batam
  const temMascara = !o.get('SMask').isNull() || !o.get('Mask').isNull();

  const menor = await sharp(bruto)
    .resize(
      temMascara
        ? { width: larg, height: alt }
        : { width: LADO, height: LADO, fit: 'inside', withoutEnlargement: true },
    )
    .jpeg({ quality: QUALIDADE, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  if (menor.data.length >= bruto.length) continue;

  o.put('Width', menor.info.width);
  o.put('Height', menor.info.height);
  o.put('ColorSpace', doc.newName(menor.info.channels === 1 ? 'DeviceGray' : 'DeviceRGB'));
  o.put('BitsPerComponent', 8);
  o.put('Filter', doc.newName('DCTDecode'));
  o.delete('DecodeParms');
  ref.writeRawStream(menor.data);

  trocadas++;
  ganho += bruto.length - menor.data.length;
  console.log(
    `  obj ${i}: ${larg}x${alt} ${Math.round(bruto.length / 1024)} KB -> ` +
      `${menor.info.width}x${menor.info.height} ${Math.round(menor.data.length / 1024)} KB`,
  );
}

const saida = doc.saveToBuffer('compress,compress-fonts,garbage=4,sanitize');
writeFileSync(ARQUIVO + '.novo', Buffer.from(saida.asUint8Array()));

const depois = statSync(ARQUIVO + '.novo').size;
const kb = (n) => Math.round(n / 1024) + ' KB';
console.log(`\n${trocadas} imagens trocadas (${kb(ganho)} a menos nelas)`);
console.log(`arquivo: ${kb(antes)} -> ${kb(depois)} (${Math.round((100 * (antes - depois)) / antes)}% menor)`);
