// Popula o Supabase com o conteudo de content/apostila.json
// Uso: npm run seed   (precisa de .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// carrega .env.local sem dependencia externa
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
const data = JSON.parse(readFileSync(join(root, 'content/apostila.json'), 'utf8'));

const die = (step, error) => {
  if (!error) return;
  console.error(`erro em ${step}:`, error.message ?? error);
  process.exit(1);
};

let nTopics = 0;
let nQuestions = 0;

for (const d of data.disciplines) {
  const { data: disc, error } = await db
    .from('disciplines')
    .upsert(
      {
        slug: d.slug,
        chapter: d.chapter,
        name: d.name,
        question_count: d.questionCount,
        weight: d.weight,
        priority: d.priority,
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single();
  die(`disciplina ${d.slug}`, error);

  if (d.topics.length) {
    const rows = d.topics.map((t) => ({
      discipline_id: disc.id,
      ref: t.ref,
      ord: t.order,
      slug: t.slug,
      title: t.title,
      body: t.body,
    }));
    const { error: e2 } = await db.from('topics').upsert(rows, { onConflict: 'discipline_id,ref' });
    die(`topicos ${d.slug}`, e2);
    nTopics += rows.length;
  }

  if (d.questions.length) {
    const rows = d.questions.map((q) => ({
      source: 'apostila',
      discipline_id: disc.id,
      number: q.number,
      type: q.type,
      statement: q.statement,
      answer: q.answer,
      explanation: q.explanation,
    }));
    const { error: e3 } = await db
      .from('questions')
      .upsert(rows, { onConflict: 'source,discipline_id,number' });
    die(`questoes ${d.slug}`, e3);
    nQuestions += rows.length;
  }

  console.log(`ok ${d.chapter}. ${d.name} (${d.topics.length} topicos, ${d.questions.length} questoes)`);
}

if (data.simulado.length) {
  const rows = data.simulado.map((q) => ({
    source: 'simulado',
    discipline_id: null,
    number: q.number,
    type: q.type,
    statement: q.statement,
    answer: q.answer,
    explanation: q.explanation,
  }));
  // onConflict com coluna nula nao funciona via upsert: limpa e reinsere
  const { error: eDel } = await db.from('questions').delete().eq('source', 'simulado');
  die('limpar simulado', eDel);
  const { error: eIns } = await db.from('questions').insert(rows);
  die('simulado', eIns);
  nQuestions += rows.length;
  console.log(`ok simulado final (${rows.length} questoes)`);
}

console.log(`\nconcluido: ${data.disciplines.length} disciplinas, ${nTopics} topicos, ${nQuestions} questoes`);
