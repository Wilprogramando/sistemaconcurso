// Popula o Supabase com todo o conteudo do sistema.
// Uso: node scripts/seed.mjs  (.env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY)
//
// Fontes:
//   content/apostila.json             teoria, questoes comentadas e simulado da apostila
//   content/provas.json               provas oficiais Cebraspe 2023 (Soldado e Oficial) + textos
//   content/provas-comentarios.json   justificativas das provas, escritas para este sistema
//   content/apostila-comentarios.json justificativas das questoes da apostila sem fundamento
//   content/resumos.json              resumos didaticos de disciplinas e topicos
//   content/questoes-ineditas-*.json  questoes ineditas no estilo da banca
//
// Idempotente: tudo e casado por ext_id (questoes), slug (disciplinas) e
// discipline_id+ref (topicos), entao rodar de novo atualiza em vez de duplicar,
// preservando os ids e, com eles, o historico de tentativas e revisoes.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const file of ['.env.local', '.env']) {
  try {
    for (const line of readFileSync(join(root, file), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const ler = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const die = (passo, error) => {
  if (!error) return;
  console.error(`\nerro em ${passo}: ${error.message ?? error}`);
  if (/column|ext_id|schema cache|relation .* does not exist/i.test(String(error.message))) {
    console.error('\nParece que a migracao 0002 ainda nao foi aplicada.');
    console.error('Rode supabase/migrations/0002_questoes_multipla_escolha.sql no SQL Editor.');
  }
  process.exit(1);
};

/** Envia em lotes: payloads grandes (teoria em blocos) estouram o limite do PostgREST. */
async function upsertEmLotes(tabela, linhas, opcoes, tamanho = 100) {
  for (let i = 0; i < linhas.length; i += tamanho) {
    const { error } = await db.from(tabela).upsert(linhas.slice(i, i + tamanho), opcoes);
    die(`${tabela} (lote ${i / tamanho + 1})`, error);
  }
}

const apostila = ler('content/apostila.json');
const provas = ler('content/provas.json');
const comentarios = ler('content/provas-comentarios.json').comentarios;
const comentariosApostila = ler('content/apostila-comentarios.json').comentarios;
const resumos = ler('content/resumos.json');

const ineditas = readdirSync(join(root, 'content'))
  .filter((f) => /^questoes-ineditas-\d+\.json$/.test(f))
  .sort()
  .flatMap((f) => {
    const arq = ler(`content/${f}`);
    return arq.questoes.map((q) => ({ ...q, rotulo: q.rotulo ?? arq.rotulo }));
  });

// =====================================================================
// 1. Disciplinas e topicos
// =====================================================================
const idPorSlug = new Map();
const idTopico = new Map(); // `${slug}:${ref}` -> id

for (const d of apostila.disciplines) {
  const { data, error } = await db
    .from('disciplines')
    .upsert(
      {
        slug: d.slug,
        chapter: d.chapter,
        name: d.name,
        question_count: d.questionCount,
        weight: d.weight,
        priority: d.priority,
        summary: resumos.disciplinas[d.slug]?.resumo ?? null,
        what_for: resumos.disciplinas[d.slug]?.paraQue ?? null,
        how_it_falls: resumos.disciplinas[d.slug]?.comoCai ?? null,
        traps: resumos.disciplinas[d.slug]?.armadilhas ?? null,
        key_numbers: resumos.disciplinas[d.slug]?.numerosChave ?? null,
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single();
  die(`disciplina ${d.slug}`, error);
  idPorSlug.set(d.slug, data.id);
}
console.log(`disciplinas: ${idPorSlug.size}`);

let totalTopicos = 0;
for (const d of apostila.disciplines) {
  if (!d.topics.length) continue;
  const linhas = d.topics.map((t) => ({
    discipline_id: idPorSlug.get(d.slug),
    ref: t.ref,
    ord: t.order,
    slug: t.slug,
    title: t.title,
    body: t.body,
    blocks: t.blocks ?? null,
    reading_minutes: t.readingMinutes ?? null,
    summary: resumos.topicos[`${d.slug}:${t.ref}`]?.resumo ?? null,
    what_for: resumos.topicos[`${d.slug}:${t.ref}`]?.paraQue ?? null,
  }));
  await upsertEmLotes('topics', linhas, { onConflict: 'discipline_id,ref', defaultToNull: false }, 25);
  totalTopicos += linhas.length;
}

const { data: topicosSalvos, error: eTop } = await db
  .from('topics')
  .select('id, ref, discipline_id');
die('reler topicos', eTop);
const slugPorId = new Map([...idPorSlug].map(([s, i]) => [i, s]));
for (const t of topicosSalvos ?? []) {
  idTopico.set(`${slugPorId.get(t.discipline_id)}:${t.ref}`, t.id);
}
console.log(`topicos: ${totalTopicos}`);

// =====================================================================
// 2. Textos de apoio da prova 2023
// =====================================================================
const passages = provas.exames.flatMap((e) =>
  Object.entries(e.textos).map(([id, body]) => ({
    id: `${e.id}:${id}`,
    label: `Texto ${id}`,
    body,
    source: e.fonte,
  }))
);
if (passages.length) {
  await upsertEmLotes('passages', passages, { onConflict: 'id' }, 10);
  console.log(`textos de apoio: ${passages.length}`);
}

// =====================================================================
// 3. Questoes
// =====================================================================
const questoes = [];

// 3a. questoes comentadas da apostila
for (const d of apostila.disciplines) {
  for (const q of d.questions) {
    questoes.push({
      ext_id: `apostila:${d.slug}:${q.number}`,
      source: 'apostila',
      origin: 'apostila',
      origin_label: 'Apostila PM SC 2026',
      discipline_id: idPorSlug.get(d.slug),
      topic_id: null,
      number: q.number,
      kind: q.type,
      type: q.type,
      options: null,
      statement: q.statement,
      answer: q.answer,
      explanation: q.explanation || comentariosApostila[`apostila:${d.slug}:${q.number}`] || '',
      year: null,
      banca: null,
      source_url: null,
      passage_id: null,
    });
  }
}

// 3b. simulado final da apostila
for (const q of apostila.simulado) {
  questoes.push({
    ext_id: `apostila:simulado:${q.number}`,
    source: 'simulado',
    origin: 'apostila',
    origin_label: 'Simulado da apostila',
    discipline_id: null,
    topic_id: null,
    number: q.number,
    kind: q.type,
    type: q.type,
    options: null,
    statement: q.statement,
    answer: q.answer,
    explanation: q.explanation || comentariosApostila[`apostila:simulado:${q.number}`] || '',
    year: null,
    banca: null,
    source_url: null,
    passage_id: null,
  });
}

// 3c. provas oficiais (Soldado e Oficial, Cebraspe 2023)
let totalProva = 0;
// O indice legado questions_unique_idx (source + disciplina + numero) nao sabe
// distinguir duas provas do mesmo ano: ambas tem uma Q1 de Constitucional.
// A identidade real e o ext_id; aqui so deslocamos o numero interno por exame
// para nao colidir. O numero original continua visivel no rotulo de origem.
let faixa = 0;
for (const exame of provas.exames) {
  const uteis = exame.questoes.filter((q) => q.slug && !q.anulada && !q.dependeDeImagem);
  for (const q of uteis) {
    questoes.push({
      ext_id: q.extId,
      source: 'prova',
      origin: 'prova',
      origin_label: `Prova oficial PMSC ${exame.ano} · ${exame.cargo} · ${exame.banca} · Q${q.numero}`,
      discipline_id: idPorSlug.get(q.slug),
      topic_id: null,
      number: faixa + q.numero,
      kind: 'mc',
      type: 'ce',
      options: q.alternativas.map((a) => ({ letter: a.letra, text: a.texto })),
      statement: q.enunciado,
      answer: q.resposta,
      explanation: comentarios[q.extId] ?? '',
      year: exame.ano,
      banca: exame.banca,
      source_url: exame.fonte,
      passage_id: q.textoId ? `${exame.id}:${q.textoId}` : null,
    });
    totalProva += 1;
  }
  faixa += 1000;
}
console.log(`questoes de prova oficial: ${totalProva}`);

// 3d. questoes ineditas
let numeroInedita = 0;
for (const q of ineditas) {
  numeroInedita += 1;
  questoes.push({
    ext_id: q.extId,
    source: 'inedita',
    origin: 'inedita',
    origin_label: q.rotulo ?? 'Inédita — baseada no edital',
    discipline_id: idPorSlug.get(q.disciplina),
    topic_id: q.topicoRef ? (idTopico.get(`${q.disciplina}:${q.topicoRef}`) ?? null) : null,
    number: numeroInedita,
    kind: 'mc',
    type: 'ce',
    options: q.alternativas.map((a) => ({ letter: a.letra, text: a.texto })),
    statement: q.enunciado,
    answer: q.resposta,
    explanation: q.justificativa,
    year: null,
    banca: null,
    source_url: null,
    passage_id: null,
  });
}

await upsertEmLotes('questions', questoes, { onConflict: 'ext_id', defaultToNull: false }, 50);

// =====================================================================
// Resumo
// =====================================================================
const porOrigem = questoes.reduce((acc, q) => ({ ...acc, [q.origin]: (acc[q.origin] ?? 0) + 1 }), {});
console.log('questoes:', questoes.length);
for (const [origem, n] of Object.entries(porOrigem)) console.log(`  ${origem}: ${n}`);

const { count } = await db.from('questions').select('id', { count: 'exact', head: true });
console.log(`\nno banco agora: ${count} questoes`);
console.log('concluido');
process.exit(0);
