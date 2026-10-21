// Popula o Supabase com o conteudo de content/apostila.json
// Uso: node scripts/seed.mjs  (precisa de .env.local com NEXT_PUBLIC_SUPABASE_URL
// e SUPABASE_SERVICE_ROLE_KEY). Idempotente: pode rodar quantas vezes quiser.
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

const db = createClient(url, key, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 1 } },
});
const data = JSON.parse(readFileSync(join(root, 'content/apostila.json'), 'utf8'));

const die = (step, error) => {
  if (!error) return;
  console.error(`erro em ${step}:`, error.message ?? error);
  process.exit(1);
};

/**
 * Sincroniza questoes sem depender de ON CONFLICT: compara pelo numero dentro
 * do escopo (source + disciplina) e decide entre insert e update, preservando
 * os ids — e portanto o historico de tentativas e revisoes do usuario.
 */
async function syncQuestions(scope, items) {
  let query = db.from('questions').select('id, number').eq('source', scope.source);
  query = scope.discipline_id
    ? query.eq('discipline_id', scope.discipline_id)
    : query.is('discipline_id', null);

  const { data: existentes, error } = await query;
  die(`consultar questoes (${scope.source}/${scope.discipline_id ?? 'geral'})`, error);

  const idPorNumero = new Map((existentes ?? []).map((q) => [q.number, q.id]));
  const novas = [];
  let atualizadas = 0;

  for (const q of items) {
    const payload = {
      source: scope.source,
      discipline_id: scope.discipline_id,
      number: q.number,
      type: q.type,
      statement: q.statement,
      answer: q.answer,
      explanation: q.explanation,
    };

    const id = idPorNumero.get(q.number);
    if (id) {
      const { error: e } = await db.from('questions').update(payload).eq('id', id);
      die(`atualizar questao ${q.number}`, e);
      atualizadas += 1;
    } else {
      novas.push(payload);
    }
  }

  if (novas.length) {
    const { error: e } = await db.from('questions').insert(novas);
    die(`inserir questoes (${scope.source}/${scope.discipline_id ?? 'geral'})`, e);
  }

  return { inseridas: novas.length, atualizadas };
}

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

  let resumo = { inseridas: 0, atualizadas: 0 };
  if (d.questions.length) {
    resumo = await syncQuestions({ source: 'apostila', discipline_id: disc.id }, d.questions);
    nQuestions += d.questions.length;
  }

  console.log(
    `ok ${d.chapter}. ${d.name} — ${d.topics.length} topicos, ${d.questions.length} questoes ` +
      `(${resumo.inseridas} novas, ${resumo.atualizadas} atualizadas)`
  );
}

if (data.simulado.length) {
  const resumo = await syncQuestions({ source: 'simulado', discipline_id: null }, data.simulado);
  nQuestions += data.simulado.length;
  console.log(
    `ok simulado final — ${data.simulado.length} questoes ` +
      `(${resumo.inseridas} novas, ${resumo.atualizadas} atualizadas)`
  );
}

console.log(
  `\nconcluido: ${data.disciplines.length} disciplinas, ${nTopics} topicos, ${nQuestions} questoes`
);
process.exit(0);
