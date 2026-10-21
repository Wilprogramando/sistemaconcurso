// Valida o conteudo antes do seed: estrutura, gabaritos e referencias cruzadas.
// Uso: node scripts/validar-conteudo.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const apostila = ler('content/apostila.json');
const provas = ler('content/provas.json');
const comentarios = ler('content/provas-comentarios.json').comentarios;
const comentariosApostila = ler('content/apostila-comentarios.json').comentarios;
const resumos = ler('content/resumos.json');
const guia = ler('content/guia-materias.json').disciplinas;

const aulas = readdirSync(join(root, 'content'))
  .filter((f) => /^aulas-[a-z-]+.json$/.test(f))
  .reduce((acc, f) => ({ ...acc, ...ler(`content/${f}`).aulas }), {});

const ineditas = readdirSync(join(root, 'content'))
  .filter((f) => /^questoes-ineditas-\d+\.json$/.test(f))
  .sort()
  .flatMap((f) => {
    const arq = ler(`content/${f}`);
    return arq.questoes.map((q) => ({ ...q, _arquivo: f }));
  });

const erros = [];
const avisos = [];

const slugs = new Set(apostila.disciplines.map((d) => d.slug));
const refsPorSlug = new Map(
  apostila.disciplines.map((d) => [d.slug, new Set(d.topics.map((t) => t.ref))])
);

/** Toda questao precisa de justificativa: ou veio da apostila, ou foi escrita aqui. */
const temFundamento = (q, extId) =>
  (q.explanation && q.explanation.length > 5) ||
  (comentariosApostila[extId] && comentariosApostila[extId].length > 40);

// ---------- apostila ----------
for (const d of apostila.disciplines) {
  for (const q of d.questions) {
    if (q.type === 'ce' && !['C', 'E'].includes(q.answer)) {
      erros.push(`apostila ${d.slug} q${q.number}: resposta invalida (${q.answer})`);
    }
    if (q.statement.length < 15) erros.push(`apostila ${d.slug} q${q.number}: enunciado curto`);
    if (!temFundamento(q, `apostila:${d.slug}:${q.number}`))
      erros.push(`apostila:${d.slug}:${q.number}: sem justificativa`);
  }
  for (const t of d.topics) {
    if (!t.blocks?.length) avisos.push(`topico ${t.ref} sem blocos estruturados`);
  }
}

for (const q of apostila.simulado) {
  if (!temFundamento(q, `apostila:simulado:${q.number}`))
    erros.push(`apostila:simulado:${q.number}: sem justificativa`);
}

// ---------- provas oficiais ----------
const uteisPorExame = new Map();
for (const exame of provas.exames) {
  const uteis = exame.questoes.filter((q) => q.slug && !q.anulada && !q.dependeDeImagem);
  uteisPorExame.set(exame.id, uteis);

  for (const q of uteis) {
    if (q.alternativas.length !== 5) erros.push(`${q.extId}: ${q.alternativas.length} alternativas`);
    if (!q.alternativas.some((a) => a.letra === q.resposta))
      erros.push(`${q.extId}: gabarito ${q.resposta} ausente nas alternativas`);
    if (!slugs.has(q.slug)) erros.push(`${q.extId}: disciplina desconhecida ${q.slug}`);
    if (!comentarios[q.extId]) erros.push(`${q.extId}: sem comentario`);
    if (q.textoId && !exame.textos[q.textoId]) erros.push(`${q.extId}: texto-base ausente`);
    for (const a of q.alternativas) {
      if (a.texto.length < 2) erros.push(`${q.extId}: alternativa ${a.letra} vazia`);
      if (/86\d001|CEBRASPE|Espaço livre/.test(a.texto))
        erros.push(`${q.extId}: alternativa ${a.letra} com ruido do PDF`);
    }
  }
}

const todosExtIdsProva = new Set([...uteisPorExame.values()].flat().map((q) => q.extId));
for (const k of Object.keys(comentarios)) {
  if (!todosExtIdsProva.has(k)) avisos.push(`comentario orfao: ${k}`);
}

// ---------- ineditas ----------
const vistos = new Set();
for (const q of ineditas) {
  const id = q.extId;
  if (!id) erros.push(`inedita sem extId em ${q._arquivo}`);
  if (vistos.has(id)) erros.push(`extId duplicado: ${id}`);
  vistos.add(id);

  if (!slugs.has(q.disciplina)) erros.push(`${id}: disciplina desconhecida (${q.disciplina})`);
  if (q.topicoRef && !refsPorSlug.get(q.disciplina)?.has(q.topicoRef))
    avisos.push(`${id}: topico ${q.topicoRef} nao existe em ${q.disciplina}`);

  if (!Array.isArray(q.alternativas) || q.alternativas.length !== 5) {
    erros.push(`${id}: precisa de 5 alternativas`);
    continue;
  }
  const letras = q.alternativas.map((a) => a.letra).join('');
  if (letras !== 'ABCDE') erros.push(`${id}: letras fora de ordem (${letras})`);
  if (!q.alternativas.some((a) => a.letra === q.resposta))
    erros.push(`${id}: gabarito ${q.resposta} ausente nas alternativas`);
  if (!q.justificativa || q.justificativa.length < 40)
    erros.push(`${id}: justificativa ausente ou curta`);
  if (q.enunciado.length < 20) erros.push(`${id}: enunciado curto`);
  for (const a of q.alternativas) {
    if (!a.texto || a.texto.length < 2) erros.push(`${id}: alternativa ${a.letra} vazia`);
  }
}

// ---------- resumos didaticos ----------
for (const d of apostila.disciplines) {
  if (!resumos.disciplinas[d.slug]) erros.push(`resumo ausente para a disciplina ${d.slug}`);
  if (!guia[d.slug]) erros.push(`guia ausente para a disciplina ${d.slug}`);
  else {
    const g = guia[d.slug];
    if (!g.perguntaQueResponde || !g.exemplo || !g.comoEstudar || !g.oQueEstudar?.length)
      erros.push(`guia incompleto em ${d.slug}`);
  }
  for (const t of d.topics) {
    if (!resumos.topicos[`${d.slug}:${t.ref}`])
      erros.push(`resumo ausente para o topico ${d.slug}:${t.ref}`);
  }
}

// ---------- aulas didaticas ----------
let comAula = 0;
for (const d of apostila.disciplines) {
  for (const t of d.topics) {
    const a = aulas[`${d.slug}:${t.ref}`];
    if (!a) {
      avisos.push(`sem aula didatica: ${d.slug}:${t.ref}`);
      continue;
    }
    comAula += 1;
    if (!a.emUmaFrase || a.emUmaFrase.length < 30)
      erros.push(`${d.slug}:${t.ref}: emUmaFrase ausente ou curta`);
    if (!Array.isArray(a.explicacao) || a.explicacao.length < 2)
      erros.push(`${d.slug}:${t.ref}: explicacao precisa de ao menos 2 paragrafos`);
    if (a.explicacao?.some((x) => x.length < 60))
      erros.push(`${d.slug}:${t.ref}: paragrafo curto demais na explicacao`);
  }
}

// ---------- resumo ----------
const porDisciplina = new Map();
const soma = (slug, n) => porDisciplina.set(slug, (porDisciplina.get(slug) ?? 0) + n);
for (const d of apostila.disciplines) soma(d.slug, d.questions.length);
for (const uteis of uteisPorExame.values()) for (const q of uteis) soma(q.slug, 1);
for (const q of ineditas) soma(q.disciplina, 1);

const totalApostila = apostila.disciplines.reduce((a, d) => a + d.questions.length, 0);
const totalProvas = [...uteisPorExame.values()].reduce((a, u) => a + u.length, 0);
const total = totalApostila + apostila.simulado.length + totalProvas + ineditas.length;

console.log('--- banco de questoes por disciplina ---');
for (const d of apostila.disciplines) {
  const n = porDisciplina.get(d.slug) ?? 0;
  const marca = d.questionCount ? ` (${d.questionCount} na prova)` : '';
  console.log(`  ${String(n).padStart(3)}  ${d.name}${marca}`);
}

console.log('\n--- por origem ---');
console.log(`  apostila: ${totalApostila} comentadas + ${apostila.simulado.length} do simulado`);
for (const exame of provas.exames) {
  console.log(`  ${exame.nome}: ${uteisPorExame.get(exame.id).length}`);
}
console.log(`  ineditas: ${ineditas.length}`);
console.log(`\nTOTAL: ${total} questoes`);

const totalTopicos = apostila.disciplines.reduce((a, d) => a + d.topics.length, 0);
console.log(`aulas didaticas: ${comAula}/${totalTopicos} topicos`);

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
