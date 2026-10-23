/**
 * Copia os dados de um projeto Supabase para outro, sem pg_dump e sem Docker.
 *
 * O schema NÃO vem por aqui: rode as migrações 0001 a 0009 no SQL Editor do
 * projeto novo antes de começar. Este script leva o conteúdo das tabelas, na
 * ordem em que as chaves estrangeiras exigem, e os arquivos do bucket.
 *
 * Antes de rodar, ponha no .env.local (as chaves service_role estão em
 * Project Settings → API; elas ignoram o RLS, então nunca vão para o git):
 *
 *   ORIGEM_URL=https://<ref-antigo>.supabase.co
 *   ORIGEM_SERVICE_KEY=...
 *   DESTINO_URL=https://<ref-novo>.supabase.co
 *   DESTINO_SERVICE_KEY=...
 *   DE_USER_ID=<id da sua conta no projeto antigo>     (opcional)
 *   PARA_USER_ID=<id da sua conta no projeto novo>     (opcional)
 *
 * Uso:
 *   node scripts/migrar-supabase.mjs --exportar <pasta>  baixa tudo para o computador
 *   node scripts/migrar-supabase.mjs --conferir   só compara as contagens
 *   node scripts/migrar-supabase.mjs              copia tabelas e arquivos
 *   node scripts/migrar-supabase.mjs --so-dados   copia só as tabelas
 *   node scripts/migrar-supabase.mjs --so-arquivos
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

/* ---------------- ambiente ---------------- */

if (existsSync('.env.local')) {
  for (const linha of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const soExportar = process.argv.includes('--exportar');

const exigidas = soExportar
  ? ['ORIGEM_URL', 'ORIGEM_SERVICE_KEY']
  : ['ORIGEM_URL', 'ORIGEM_SERVICE_KEY', 'DESTINO_URL', 'DESTINO_SERVICE_KEY'];
const faltando = exigidas.filter((k) => !process.env[k]);
if (faltando.length) {
  console.error('faltam variáveis no .env.local:', faltando.join(', '));
  process.exit(1);
}

const opcoes = { auth: { persistSession: false } };
const origem = createClient(process.env.ORIGEM_URL, process.env.ORIGEM_SERVICE_KEY, opcoes);
const destino = soExportar
  ? null
  : createClient(process.env.DESTINO_URL, process.env.DESTINO_SERVICE_KEY, opcoes);

const DE = process.env.DE_USER_ID || null;
const PARA = process.env.PARA_USER_ID || null;

/**
 * Ordem importa: quem é apontado vem antes de quem aponta. `conflito` é a
 * coluna (ou as colunas) que identificam a linha, para repetir o script sem
 * duplicar nada.
 */
const TABELAS = [
  { nome: 'disciplines', conflito: 'id' },
  { nome: 'topics', conflito: 'id' },
  { nome: 'passages', conflito: 'id' },
  { nome: 'questions', conflito: 'id' },
  { nome: 'profiles', conflito: 'id', doUsuario: 'id' },
  { nome: 'topic_progress', conflito: 'user_id,topic_id', doUsuario: 'user_id' },
  { nome: 'exam_sessions', conflito: 'id', doUsuario: 'user_id' },
  { nome: 'attempts', conflito: 'id', doUsuario: 'user_id' },
  { nome: 'reviews', conflito: 'user_id,question_id', doUsuario: 'user_id' },
  { nome: 'error_notes', conflito: 'id', doUsuario: 'user_id' },
  { nome: 'bookmarks', conflito: 'user_id,question_id', doUsuario: 'user_id' },
  { nome: 'daily_sets', conflito: 'user_id,day', doUsuario: 'user_id' },
  { nome: 'study_days', conflito: 'user_id,plan,day', doUsuario: 'user_id' },
  { nome: 'notes', conflito: 'id', doUsuario: 'user_id' },
  { nome: 'essays', conflito: 'id', doUsuario: 'user_id' },
];

const BUCKET = 'anotacoes';
const LOTE = 500;

/* ---------------- tabelas ---------------- */

async function contar(cliente, tabela) {
  const { count, error } = await cliente.from(tabela).select('*', { count: 'exact', head: true });
  if (error) return error.message.includes('does not exist') ? null : `erro: ${error.message}`;
  return count ?? 0;
}

async function conferir() {
  console.log('tabela'.padEnd(18), 'origem'.padStart(8), 'destino'.padStart(9));
  for (const { nome } of TABELAS) {
    const [a, b] = await Promise.all([contar(origem, nome), contar(destino, nome)]);
    const marca = a === b ? '' : '  <-- diferente';
    console.log(nome.padEnd(18), String(a ?? '—').padStart(8), String(b ?? '—').padStart(9), marca);
  }
}

async function copiarTabela({ nome, conflito, doUsuario }) {
  let movidas = 0;
  let inicio = 0;

  for (;;) {
    const { data, error } = await origem
      .from(nome)
      .select('*')
      .range(inicio, inicio + LOTE - 1);

    if (error) {
      if (/does not exist/.test(error.message)) {
        console.log(`  ${nome}: não existe na origem, pulando`);
        return 0;
      }
      throw new Error(`${nome}: ${error.message}`);
    }
    if (!data?.length) break;

    // a conta nova tem outro id: troca na hora de gravar
    const linhas =
      DE && PARA && doUsuario
        ? data.map((l) => (l[doUsuario] === DE ? { ...l, [doUsuario]: PARA } : l))
        : data;

    const { error: erroGravar } = await destino
      .from(nome)
      .upsert(linhas, { onConflict: conflito, defaultToNull: false });
    if (erroGravar) throw new Error(`${nome} (gravando): ${erroGravar.message}`);

    movidas += linhas.length;
    inicio += LOTE;
    process.stdout.write(`  ${nome}: ${movidas}\r`);
    if (data.length < LOTE) break;
  }

  console.log(`  ${nome}: ${movidas} linhas`.padEnd(40));
  return movidas;
}

/* ---------------- arquivos do bucket ---------------- */

async function listarArquivos(prefixo = '') {
  const achados = [];
  let pagina = 0;

  for (;;) {
    const { data, error } = await origem.storage
      .from(BUCKET)
      .list(prefixo, { limit: 100, offset: pagina * 100 });
    if (error) throw new Error(`storage list ${prefixo}: ${error.message}`);
    if (!data?.length) break;

    for (const item of data) {
      const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
      // pasta não tem id; o conteúdo dela é listado recursivamente
      if (item.id) achados.push(caminho);
      else achados.push(...(await listarArquivos(caminho)));
    }

    if (data.length < 100) break;
    pagina += 1;
  }

  return achados;
}

async function copiarArquivos() {
  const arquivos = await listarArquivos();
  console.log(`  ${arquivos.length} arquivos no bucket`);

  let n = 0;
  for (const caminho of arquivos) {
    const { data, error } = await origem.storage.from(BUCKET).download(caminho);
    if (error) {
      console.log(`  falhou ao baixar ${caminho}: ${error.message}`);
      continue;
    }

    // o caminho começa com o id do usuário; na conta nova ele muda
    const destinoCaminho = DE && PARA ? caminho.replace(new RegExp(`^${DE}/`), `${PARA}/`) : caminho;

    const { error: erroSubir } = await destino.storage
      .from(BUCKET)
      .upload(destinoCaminho, await data.arrayBuffer(), {
        contentType: data.type || 'application/octet-stream',
        upsert: true,
      });
    if (erroSubir) {
      console.log(`  falhou ao subir ${destinoCaminho}: ${erroSubir.message}`);
      continue;
    }

    n += 1;
    process.stdout.write(`  copiados: ${n}/${arquivos.length}\r`);
  }
  console.log(`  copiados: ${n}/${arquivos.length}`.padEnd(40));
}

/* ---------------- cópia para o computador ---------------- */

/** Lê a tabela inteira da origem, em lotes. */
async function lerTudo(tabela) {
  const tudo = [];
  for (let inicio = 0; ; inicio += LOTE) {
    const { data, error } = await origem
      .from(tabela)
      .select('*')
      .range(inicio, inicio + LOTE - 1);
    if (error) {
      if (/does not exist/.test(error.message)) return null;
      throw new Error(`${tabela}: ${error.message}`);
    }
    if (!data?.length) break;
    tudo.push(...data);
    if (data.length < LOTE) break;
  }
  return tudo;
}

/**
 * Guarda no computador uma cópia completa: um JSON por tabela e os arquivos
 * do bucket, com a mesma estrutura de pastas. É o backup que fica com você,
 * independente do que aconteça com o projeto no Supabase.
 */
async function exportar(pasta) {
  mkdirSync(join(pasta, 'tabelas'), { recursive: true });
  console.log('Tabelas →', pasta);

  const resumo = {};
  for (const { nome } of TABELAS) {
    const linhas = await lerTudo(nome);
    if (linhas === null) {
      console.log(`  ${nome}: não existe, pulando`);
      continue;
    }
    writeFileSync(join(pasta, 'tabelas', `${nome}.json`), JSON.stringify(linhas, null, 2));
    resumo[nome] = linhas.length;
    console.log(`  ${nome}: ${linhas.length} linhas`);
  }

  console.log('Arquivos do bucket');
  const arquivos = await listarArquivos();
  let n = 0;
  for (const caminho of arquivos) {
    const { data, error } = await origem.storage.from(BUCKET).download(caminho);
    if (error) {
      console.log(`  falhou: ${caminho} — ${error.message}`);
      continue;
    }
    const destinoLocal = join(pasta, 'arquivos', caminho);
    mkdirSync(dirname(destinoLocal), { recursive: true });
    writeFileSync(destinoLocal, Buffer.from(await data.arrayBuffer()));
    n += 1;
    process.stdout.write(`  ${n}/${arquivos.length}\r`);
  }
  console.log(`  ${n}/${arquivos.length} arquivos`.padEnd(40));

  writeFileSync(
    join(pasta, 'resumo.json'),
    JSON.stringify(
      {
        quando: new Date().toISOString(),
        origem: process.env.ORIGEM_URL,
        tabelas: resumo,
        arquivos: n,
      },
      null,
      2,
    ),
  );
  console.log('\nPronto. Backup em', pasta);
}

/* ---------------- roteiro ---------------- */

const args = process.argv.slice(2);

if (args.includes('--exportar')) {
  const i = args.indexOf('--exportar');
  await exportar(args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'backup-supabase');
} else if (args.includes('--conferir')) {
  await conferir();
} else {
  if (!args.includes('--so-arquivos')) {
    console.log('Tabelas:');
    for (const t of TABELAS) await copiarTabela(t);
  }
  if (!args.includes('--so-dados')) {
    console.log('Arquivos:');
    await copiarArquivos();
  }
  console.log('\nConferindo o resultado:');
  await conferir();
}
