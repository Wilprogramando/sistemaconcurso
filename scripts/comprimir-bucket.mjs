/**
 * Recomprime o que já está guardado no bucket `anotacoes`.
 *
 * O envio pelo navegador já reduz a imagem antes de subir, mas o que entrou
 * antes dessa regra — ou veio de outro projeto numa migração — continua do
 * tamanho original. Este script baixa cada imagem, redesenha no tamanho
 * máximo útil, reescreve em WebP e devolve no mesmo caminho, então nenhuma
 * anotação precisa ser alterada.
 *
 * PDF fica de fora: comprimir PDF é outro trabalho (veja comprimir-pdf.mjs).
 *
 * Uso:
 *   node scripts/comprimir-bucket.mjs --conferir   só lista tamanhos
 *   node scripts/comprimir-bucket.mjs              recomprime de verdade
 */
import { readFileSync, existsSync } from 'node:fs';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

if (existsSync('.env.local')) {
  for (const linha of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error('faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local');
  process.exit(1);
}

// o supabase-js monta um cliente de tempo real que exige WebSocket nativo
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class {
    constructor() {
      throw new Error('tempo real não é usado aqui');
    }
  };
}

const supabase = createClient(url, chave, { auth: { persistSession: false } });

const BUCKET = 'anotacoes';
const LADO_MAXIMO = 1280;
const QUALIDADE = 72;
const SO_CONFERIR = process.argv.includes('--conferir');

/** Todos os arquivos do bucket, varrendo as pastas de cada usuário. */
async function listar(prefixo = '') {
  const achados = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(prefixo, { limit: 1000 });
  if (error) throw new Error(`${prefixo || '/'}: ${error.message}`);

  for (const item of data ?? []) {
    const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
    if (item.id) achados.push({ caminho, tamanho: item.metadata?.size ?? 0 });
    else achados.push(...(await listar(caminho)));
  }
  return achados;
}

const kb = (n) => `${Math.round(n / 1024)} KB`;

const arquivos = await listar();
const imagens = arquivos.filter((a) => /\.(png|jpe?g|webp)$/i.test(a.caminho));
const resto = arquivos.filter((a) => !imagens.includes(a));

console.log(`${arquivos.length} arquivos: ${imagens.length} imagens, ${resto.length} outros`);
console.log('total hoje:', kb(arquivos.reduce((s, a) => s + a.tamanho, 0)));

let antes = 0;
let depois = 0;

for (const img of imagens) {
  const { data, error } = await supabase.storage.from(BUCKET).download(img.caminho);
  if (error) {
    console.log(`  falhou ao baixar ${img.caminho}: ${error.message}`);
    continue;
  }

  const original = Buffer.from(await data.arrayBuffer());
  const menor = await sharp(original)
    .rotate() // respeita a orientação da foto antes de perder o metadado
    .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALIDADE })
    .toBuffer();

  antes += original.length;

  if (menor.length >= original.length) {
    depois += original.length;
    console.log(`  ${img.caminho.slice(-16)}: já está no menor tamanho (${kb(original.length)})`);
    continue;
  }

  depois += menor.length;
  const corte = Math.round((100 * (original.length - menor.length)) / original.length);
  console.log(
    `  ${img.caminho.slice(-16)}: ${kb(original.length)} -> ${kb(menor.length)} (${corte}% menor)` +
      (SO_CONFERIR ? '  [só conferindo]' : ''),
  );

  if (SO_CONFERIR) continue;

  // mesmo caminho e mesmo nome: as anotações continuam apontando para cá
  const { error: erroSubir } = await supabase.storage
    .from(BUCKET)
    .upload(img.caminho, menor, { contentType: 'image/webp', upsert: true });
  if (erroSubir) console.log(`  falhou ao subir ${img.caminho}: ${erroSubir.message}`);
}

console.log(
  `\nimagens: ${kb(antes)} -> ${kb(depois)}` +
    (antes ? ` (${Math.round((100 * (antes - depois)) / antes)}% menor)` : ''),
);
