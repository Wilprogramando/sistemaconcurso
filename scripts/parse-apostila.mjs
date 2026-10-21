// Converte content/apostila.txt (pdftotext -layout -enc UTF-8) em content/apostila.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { estruturar } from './lib/estrutura.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = readFileSync(join(root, 'content/apostila.txt'), 'utf8');

const FOOTER = /^\s*APOSTILA PM SC 2026 .*$/;
const lines = raw.split(/\r?\n/).filter((l) => !FOOTER.test(l));

// metadados das disciplinas (Tabela 8.1 do edital 002/CCP/2026)
const META = [
  ['direito-constitucional', 1, 'Direito Constitucional', 8, 'ALTA'],
  ['direito-penal-comum', 2, 'Direito Penal Comum', 6, 'ALTA'],
  ['direito-processual-penal', 3, 'Direito Processual Penal Comum', 6, 'MEDIA'],
  ['direito-penal-militar', 4, 'Direito Penal Militar', 6, 'ALTA'],
  ['legislacao-especial', 5, 'Legislação Especial', 6, 'ALTA'],
  ['legislacao-transito', 6, 'Legislação de Trânsito', 5, 'MEDIA'],
  ['legislacao-institucional', 7, 'Legislação Institucional', 10, 'MAXIMA'],
  ['lingua-portuguesa', 8, 'Língua Portuguesa', 8, 'ALTA'],
  ['informatica', 9, 'Informática', 5, 'MEDIA'],
  ['redacao', 10, 'Prova de Redação — Ordem Pública', 0, 'ALTA'],
];

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

const SECTION = /^\s{0,8}(\d{1,2})\.(\d{1,2})\s+(\S.*)$/;
const marks = [];
lines.forEach((line, i) => {
  const m = line.match(SECTION);
  if (!m) return;
  const chapter = Number(m[1]);
  const section = Number(m[2]);
  if (chapter < 1 || chapter > 12) return;
  const title = m[3].trim();
  if (/\s{4,}/.test(title) || title.length < 6 || /^[a-z]/.test(title)) return;
  if (/^(§|art)/i.test(title)) return;
  marks.push({ chapter, section, title, line: i });
});

const seen = new Set();
const ordered = [];
let lastChapter = 0;
let lastSection = 0;
for (const mk of marks) {
  const key = `${mk.chapter}.${mk.section}`;
  if (seen.has(key)) continue;
  if (mk.chapter < lastChapter) continue;
  if (mk.chapter === lastChapter && mk.section <= lastSection) continue;
  seen.add(key);
  ordered.push(mk);
  lastChapter = mk.chapter;
  lastSection = mk.section;
}

/** remove o quadrinho "( )" de marcar resposta que o PDF deixa no enunciado */
const limpaEnunciado = (s) => s.replace(/\s*\(\s*\)\s*$/, '').trim();

/** fundamento que virou so pontuacao ("." quando a apostila nao explica) vira vazio */
const limpaFundamento = (s) => (/[A-Za-zÀ-ÿ0-9]/.test(s) ? s : '');

const bodyOf = (from, to) =>
  lines
    .slice(from, to)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

function parseQuestions(text) {
  const flat = text.replace(/\n\s{2,}/g, ' ').replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const parts = flat.split(/(?:^|\s)(\d{1,2})\.\s+(?=[A-ZÀ-Ü“"(])/);
  const out = [];
  for (let i = 1; i < parts.length; i += 2) {
    const num = Number(parts[i]);
    const chunk = (parts[i + 1] || '').trim();
    let m = chunk.match(/^(.*?)\b(CERTO|ERRADO)\b\s*(?:—|--|–|-)?\s*(.*)$/s);
    if (m) {
      const statement = m[1].trim().replace(/\s+/g, ' ');
      if (statement.length < 15) continue;
      out.push({
        number: num,
        type: 'ce',
        statement: limpaEnunciado(statement),
        answer: m[2] === 'CERTO' ? 'C' : 'E',
        explanation: limpaFundamento(m[3].trim().replace(/\s+/g, ' ')),
      });
      continue;
    }
    // formato "<frase> Correto? NÃO — justificativa" (usado em Português)
    m = chunk.match(/^(.*?)\b(NÃO|SIM)\b\s*(?:—|--|–)\s*(.*)$/s);
    if (m) {
      const statement = m[1].trim().replace(/\s+/g, ' ');
      if (statement.length < 15) continue;
      out.push({
        number: num,
        type: 'ce',
        statement: limpaEnunciado(statement),
        answer: m[2] === 'SIM' ? 'C' : 'E',
        explanation: limpaFundamento(m[3].trim().replace(/\s+/g, ' ')),
      });
      continue;
    }
    // discursiva curta: pergunta até o "?"/ponto, resto é a resposta
    m = chunk.match(/^(.*?[?.])\s+(\S.*)$/s);
    // descarta texto que vazou do capítulo seguinte (título em caixa alta, caixas "NO EDITAL")
    const bleed = /NO EDITAL|ATENÇÃO|\(\d+ quest|\d\.\d\s|^[A-ZÀ-Ü][A-ZÀ-Ü ]{6,}/;
    if (m && m[1].trim().length > 15 && m[2].trim().length > 3 && !bleed.test(m[1].trim())) {
      out.push({
        number: num,
        type: 'open',
        statement: limpaEnunciado(m[1].trim().replace(/\s+/g, ' ')),
        answer: null,
        explanation: limpaFundamento(m[2].trim().replace(/\s+/g, ' ')),
      });
    }
  }
  return out;
}

// --- monta disciplinas ---
const disciplines = [];
for (const [slug, chapter, name, questionCount, priority] of META) {
  const secs = ordered.filter((m) => m.chapter === chapter);
  if (!secs.length) continue;
  const topics = [];
  let questions = [];
  secs.forEach((sec, idx) => {
    const next = ordered[ordered.indexOf(sec) + 1];
    const end = next ? next.line : lines.length;
    const body = bodyOf(sec.line + 1, end);
    if (/quest(õ|o)es comentadas/i.test(sec.title)) {
      questions = parseQuestions(body);
      return;
    }
    const blocks = estruturar(body);
    const palavras = body.split(/\s+/).length;
    topics.push({
      ref: `${sec.chapter}.${sec.section}`,
      order: idx + 1,
      slug: slugify(sec.title),
      title: sec.title,
      body,
      blocks,
      readingMinutes: Math.max(1, Math.round(palavras / 180)),
    });
  });
  disciplines.push({
    slug,
    chapter,
    name,
    questionCount,
    weight: questionCount ? Number(((questionCount / 60) * 100).toFixed(1)) : 0,
    priority,
    topics,
    questions,
  });
}

// --- simulado final (cap. 11) ---
const simIdx = lines.findIndex((l) => /^\s*11\.\s*SIMULADO/i.test(l));
const gabIdx = lines.findIndex((l) => /^\s*Gabarito do simulado/i.test(l));
let simulado = [];
if (simIdx > -1 && gabIdx > simIdx) {
  const flat = bodyOf(simIdx + 1, gabIdx)
    .replace(/\n\s{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ');
  const parts = flat.split(/(?:^|\s)(\d{1,2})\.\s+(?=[A-ZÀ-Ü“"(])/);
  const gabRaw = bodyOf(gabIdx + 1, gabIdx + 8);
  const gab = {};
  for (const m of gabRaw.matchAll(/(\d{1,2})\.\s*([CE])\b\s*(?:\(([^)]*)\))?/g)) {
    gab[Number(m[1])] = { answer: m[2], note: m[3] ? m[3].trim() : '' };
  }
  for (let i = 1; i < parts.length; i += 2) {
    const num = Number(parts[i]);
    const statement = (parts[i + 1] || '').trim().replace(/\s+/g, ' ');
    if (!gab[num] || statement.length < 15) continue;
    simulado.push({ number: num, type: 'ce', statement: limpaEnunciado(statement), answer: gab[num].answer, explanation: limpaFundamento(gab[num].note) });
  }
  simulado = simulado
    .filter((q, i, a) => a.findIndex((x) => x.number === q.number) === i)
    .sort((a, b) => a.number - b.number);
}

const out = {
  exam: {
    name: 'PM SC 2026 — Soldado QPPM',
    edital: 'Edital nº 002/CCP/2026 — CFP · Instituto AOCP',
    objectiveQuestions: 60,
    essayPoints: 20,
    minScorePercent: 50,
  },
  disciplines,
  simulado,
};

writeFileSync(join(root, 'content/apostila.json'), JSON.stringify(out, null, 2), 'utf8');

console.log('disciplinas:', disciplines.length);
for (const d of disciplines)
  console.log(`  ${d.chapter}. ${d.name} — ${d.topics.length} tópicos, ${d.questions.length} questões`);
console.log('simulado:', simulado.length, 'questões');
console.log('total questões:', disciplines.reduce((a, d) => a + d.questions.length, 0) + simulado.length);
