/**
 * Reescreve um PDF com o lixo recolhido: objetos repetidos (as fontes do
 * edital vinham embutidas de novo a cada página) viram um só, o que sobra
 * sem dono é descartado e tudo é regravado comprimido.
 *
 * Uso: node scripts/comprimir-pdf.mjs public/edital-002-2026.pdf
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import * as mupdf from 'mupdf';

const caminho = process.argv[2];
if (!caminho) {
  console.error('informe o caminho do PDF');
  process.exit(1);
}

const antes = statSync(caminho).size;
const doc = mupdf.PDFDocument.openDocument(readFileSync(caminho), 'application/pdf');

// garbage: 4 = recolhe, funde duplicatas e renumera; compress: streams em flate
const saida = doc.saveToBuffer('compress,compress-images,compress-fonts,garbage=4,sanitize');
writeFileSync(caminho, saida.asUint8Array());

const depois = statSync(caminho).size;
const mb = (n) => (n / 1048576).toFixed(2);
console.log(
  `${caminho}: ${mb(antes)} MB -> ${mb(depois)} MB (${Math.round((100 * (antes - depois)) / antes)}% menor)`,
);
