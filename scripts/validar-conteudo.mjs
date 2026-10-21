// Valida o conteudo antes do seed: estrutura, gabaritos e referencias cruzadas.
// Uso: node scripts/validar-conteudo.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const apostila = ler('content/apostila.json');
const prova = ler('content/prova-2023.json');
const comentarios = ler('content/prova-2023-comentarios.json').comentarios;

const ineditas = ['content/questoes-ineditas-1.json', 'content/questoes-ineditas-2.json']
  .filter((p) => existsSync(join(root, p)))
  .flatMap((p) => {
    const arq = ler(p);
    return arq.questoes.map((q) => ({ ...q, _arquivo: p, _rotulo: arq.rotulo }));
  });

const erros = [];
const avisos = [];

// ---------- disciplinas e topicos ----------
const slugs = new Set(apostila.disciplines.map((d) => d.slug));
const refsPorSlug = new Map(
  apostila.disciplines.map((d) => [d.slug, new Set(d.topics.map((t) => t.ref))])
);

// ---------- apostila ----------
for (const d of apostila.disciplines) {
  for (const q of d.questions) {
    if (q.type === 'ce' && !['C', 'E'].includes(q.answer)) {
      erros.push(`apostila ${d.slug} q${q.number}: resposta invalida (${q.answer})`);
    }
    if (q.statement.length < 15) erros.push(`apostila ${d.slug} q${q.number}: enunciado curto`);
  }
  for (const t of d.topics) {
    if (!t.blocks?.length) avisos.push(`topico ${t.ref} sem blocos estruturados`);
  }
}

// ---------- prova 2023 ----------
const uteis = prova.questoes.filter((q) => q.slug && !q.anulada && !q.dependeDeImagem);
for (const q of uteis) {
  if (q.alternativas.length !== 5) erros.push(`prova2023 Q${q.numero}: ${q.alternativas.length} alternativas`);
  if (!q.alternativas.some((a) => a.letra === q.resposta)) {
    erros.push(`prova2023 Q${q.numero}: gabarito ${q.resposta} nao existe entre as alternativas`);
  }
  if (!slugs.has(q.slug)) erros.push(`prova2023 Q${q.numero}: disciplina desconhecida ${q.slug}`);
  if (!comentarios[String(q.numero)]) erros.push(`prova2023 Q${q.numero}: sem comentario`);
  if (q.textoId && !prova.textos[q.textoId]) {
    erros.push(`prova2023 Q${q.numero}: texto-base ${q.textoId} ausente`);
  }
  for (const a of q.alternativas) {
    if (a.texto.length < 2) erros.push(`prova2023 Q${q.numero}: alternativa ${a.letra} vazia`);
    if (/862001|CEBRASPE|Espaço livre/.test(a.texto)) {
      erros.push(`prova2023 Q${q.numero}: alternativa ${a.letra} com ruido do PDF`);
    }
  }
}

// ---------- ineditas ----------
const vistos = new Set();
for (const q of ineditas) {
  const id = q.extId;
  if (!id) erros.push(`inedita sem extId em ${q._arquivo}`);
  if (vistos.has(id)) erros.push(`extId duplicado: ${id}`);
  vistos.add(id);

  if (!slugs.has(q.disciplina)) erros.push(`${id}: disciplina desconhecida (${q.disciplina})`);
  if (q.topicoRef && !refsPorSlug.get(q.disciplina)?.has(q.topicoRef)) {
    avisos.push(`${id}: topico ${q.topicoRef} nao existe em ${q.disciplina}`);
  }
  if (!Array.isArray(q.alternativas) || q.alternativas.length !== 5) {
    erros.push(`${id}: precisa de 5 alternativas`);
    continue;
  }
  const letras = q.alternativas.map((a) => a.letra).join('');
  if (letras !== 'ABCDE') erros.push(`${id}: letras fora de ordem (${letras})`);
  if (!q.alternativas.some((a) => a.letra === q.resposta)) {
    erros.push(`${id}: gabarito ${q.resposta} nao existe entre as alternativas`);
  }
  if (!q.justificativa || q.justificativa.length < 40) {
    erros.push(`${id}: justificativa ausente ou curta`);
  }
  if (q.enunciado.length < 20) erros.push(`${id}: enunciado curto`);
  for (const a of q.alternativas) {
    if (!a.texto || a.texto.length < 2) erros.push(`${id}: alternativa ${a.letra} vazia`);
  }
}

// ---------- resumo ----------
const porDisciplina = new Map();
const soma = (slug, n) => porDisciplina.set(slug, (porDisciplina.get(slug) ?? 0) + n);
for (const d of apostila.disciplines) soma(d.slug, d.questions.length);
for (const q of uteis) soma(q.slug, 1);
for (const q of ineditas) soma(q.disciplina, 1);

console.log('--- banco de questoes por disciplina ---');
for (const d of apostila.disciplines) {
  const total = porDisciplina.get(d.slug) ?? 0;
  const marca = d.question_count ?? d.questionCount;
  console.log(`  ${String(total).padStart(3)}  ${d.name}${marca ? ` (${marca} na prova)` : ''}`);
}
console.log(
  `\napostila: ${apostila.disciplines.reduce((a, d) => a + d.questions.length, 0)} · simulado: ${apostila.simulado.length} · prova 2023: ${uteis.length} · ineditas: ${ineditas.length}`
);
console.log(
  `total: ${apostila.disciplines.reduce((a, d) => a + d.questions.length, 0) + apostila.simulado.length + uteis.length + ineditas.length} questoes`
);

if (avisos.length) {
  console.log(`\navisos (${avisos.length}):`);
  for (const a of avisos.slice(0, 15)) console.log('  ! ' + a);
}

if (erros.length) {
  console.log(`\nERROS (${erros.length}):`);
  for (const e of erros) console.log('  x ' + e);
  process.exit(1);
}
console.log('\nvalidacao ok');
