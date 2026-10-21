// Gera supabase/seed.sql a partir de content/apostila.json.
// Alternativa ao `npm run seed`: basta colar o arquivo no SQL Editor do Supabase,
// sem precisar da service_role key.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'content/apostila.json'), 'utf8'));

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

const out = [
  '-- Seed gerado por scripts/export-seed-sql.mjs — nao editar a mao.',
  '-- Conteudo da Apostila PM SC 2026 (Soldado QPPM), edital 002/CCP/2026.',
  'begin;',
  '',
];

for (const d of data.disciplines) {
  out.push(
    `insert into disciplines (slug, chapter, name, question_count, weight, priority) values (${q(d.slug)}, ${d.chapter}, ${q(d.name)}, ${d.questionCount}, ${d.weight}, ${q(d.priority)})`,
    `on conflict (slug) do update set chapter = excluded.chapter, name = excluded.name, question_count = excluded.question_count, weight = excluded.weight, priority = excluded.priority;`,
    ''
  );

  for (const t of d.topics) {
    out.push(
      `insert into topics (discipline_id, ref, ord, slug, title, body)`,
      `select id, ${q(t.ref)}, ${t.order}, ${q(t.slug)}, ${q(t.title)}, ${q(t.body)} from disciplines where slug = ${q(d.slug)}`,
      `on conflict (discipline_id, ref) do update set ord = excluded.ord, slug = excluded.slug, title = excluded.title, body = excluded.body;`,
      ''
    );
  }

  for (const item of d.questions) {
    out.push(
      `insert into questions (source, discipline_id, number, type, statement, answer, explanation)`,
      `select 'apostila', id, ${item.number}, ${q(item.type)}, ${q(item.statement)}, ${q(item.answer)}, ${q(item.explanation)} from disciplines where slug = ${q(d.slug)}`,
      `on conflict (source, coalesce(discipline_id, 0), number) do update set type = excluded.type, statement = excluded.statement, answer = excluded.answer, explanation = excluded.explanation;`,
      ''
    );
  }
}

out.push("delete from questions where source = 'simulado';", '');
for (const item of data.simulado) {
  out.push(
    `insert into questions (source, discipline_id, number, type, statement, answer, explanation) values ('simulado', null, ${item.number}, ${q(item.type)}, ${q(item.statement)}, ${q(item.answer)}, ${q(item.explanation)});`
  );
}

out.push('', 'commit;', '');

const sql = out.join('\n');
writeFileSync(join(root, 'supabase/seed.sql'), sql, 'utf8');

const topics = data.disciplines.reduce((a, d) => a + d.topics.length, 0);
const questions =
  data.disciplines.reduce((a, d) => a + d.questions.length, 0) + data.simulado.length;
console.log(
  `supabase/seed.sql gerado: ${data.disciplines.length} disciplinas, ${topics} topicos, ${questions} questoes (${Math.round(sql.length / 1024)} KB)`
);
