// Converte as provas objetivas oficiais da PMSC (Cebraspe, 2023) em content/provas.json.
//
// Fontes (CDN publico da propria banca):
//   Soldado  https://cdn.cebraspe.org.br/concursos/pm_sc_23_soldado/arquivos/862_PMSC_SOLDADO_001_01.PDF
//   Oficial  https://cdn.cebraspe.org.br/concursos/pm_sc_23_oficial/arquivos/860_PMSC_OFICIAL_OBJ_001_01.PDF
//
// Extracao: pdftotext -raw -enc UTF-8 na prova (respeita a ordem de leitura das
// duas colunas) e -layout no gabarito (preserva a tabela de letras).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'content');

// Disciplinas das provas de 2023 -> slugs do edital 2026.
// null = materia que nao consta do Anexo II do edital 002/CCP/2026 e por isso
// nao entra no banco (Administrativo, Civil, Processo Penal Militar, RL).
const MAPA = {
  'NOÇÕES DE DIREITO CONSTITUCIONAL': 'direito-constitucional',
  'DIREITO CONSTITUCIONAL': 'direito-constitucional',
  'NOÇÕES DE DIREITO PENAL COMUM': 'direito-penal-comum',
  'DIREITO PENAL COMUM': 'direito-penal-comum',
  'NOÇÕES DE DIREITO PROCESSUAL PENAL': 'direito-processual-penal',
  'DIREITO PROCESSUAL PENAL COMUM': 'direito-processual-penal',
  'DIREITO PENAL MILITAR': 'direito-penal-militar',
  'LEGISLAÇÃO INSTITUCIONAL': 'legislacao-institucional',
  'LÍNGUA PORTUGUESA': 'lingua-portuguesa',
  INFORMÁTICA: 'informatica',
  'DIREITO ADMINISTRATIVO': null,
  'DIREITO CIVIL': null,
  'DIREITO PROCESSUAL PENAL MILITAR': null,
  'RACIOCÍNIO LÓGICO': null,
};

const EXAMES = [
  {
    id: 'prova2023',
    nome: 'PMSC 2023 — Soldado (prova objetiva)',
    cargo: 'Soldado',
    banca: 'CEBRASPE',
    ano: 2023,
    aplicacao: '2023-08-27',
    total: 58,
    prova: 'prova-2023.txt',
    gabarito: 'prova-2023-gabarito.txt',
    rodape: /862001_\w+/g,
    fonte:
      'https://cdn.cebraspe.org.br/concursos/pm_sc_23_soldado/arquivos/862_PMSC_SOLDADO_001_01.PDF',
    fonteGabarito:
      'https://cdn.cebraspe.org.br/concursos/pm_sc_23_soldado/arquivos/GAB_DEFINITIVO_862_PMSC_SOLDADO_001_01.PDF',
  },
  {
    id: 'prova2023of',
    nome: 'PMSC 2023 — Oficial (prova objetiva)',
    cargo: 'Oficial',
    banca: 'CEBRASPE',
    ano: 2023,
    aplicacao: '2023-08-13',
    total: 80,
    prova: 'prova-2023-oficial.txt',
    gabarito: 'prova-2023-oficial-gabarito.txt',
    rodape: /860001_\w+/g,
    fonte:
      'https://cdn.cebraspe.org.br/concursos/pm_sc_23_oficial/arquivos/860_PMSC_OFICIAL_OBJ_001_01.PDF',
    fonteGabarito:
      'https://cdn.cebraspe.org.br/concursos/pm_sc_23_oficial/arquivos/GAB_DEFINITIVO_860_PMSC_OFICIAL_OBJ_001_01.PDF',
  },
];

const DEPENDE_DE_IMAGEM =
  /\bfigura (anterior|a seguir|apresentada|acima)|caixa de diálogo|tabela (anterior|a seguir) ilustra|imagem (anterior|a seguir)/i;

const TITULOS = Object.keys(MAPA)
  .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .sort((a, b) => b.length - a.length)
  .join('|');

function lerGabarito(texto, total, id) {
  const letras = [];
  for (const bloco of texto.split(/Questão/).slice(1)) {
    const linha = bloco.split(/Gabarito/)[1];
    if (!linha) continue;
    for (const ch of linha.replace(/[^A-EX]/g, '')) letras.push(ch);
  }
  if (letras.length !== total) {
    console.error(`${id}: esperava ${total} respostas no gabarito, li ${letras.length}`);
    process.exit(1);
  }
  return letras;
}

function limpar(texto, rodape) {
  let s = texto;
  s = s.replace(rodape, ' ');
  s = s.replace(/\s*CEBRASPE\s*[–-]\s*PM\/SC\s*[–-]\s*Edital:\s*\d{4}\s*/gi, ' ');
  s = s.replace(/\s*-{2}\s*PROVA OBJETIVA\s*-{2}\s*/gi, ' ');
  s = s.replace(/\s*Espaço livre\s*/gi, ' ');
  s = s.split(new RegExp(`\\s(?:${TITULOS})\\b`))[0];
  s = s.split(/\sTexto \d+A\d+-[IVX]+\b/)[0];
  s = s.replace(/\s+(?:NOÇÕES DE |)[A-ZÀ-Ü][A-ZÀ-Ü\s]{11,}$/, '');
  return s.replace(/\s+/g, ' ').trim();
}

/** Acha as alternativas varrendo de tras para frente: assim um enunciado que
 *  comeca com "A respeito de..." nao e confundido com a alternativa A. */
function acharAlternativas(corpo) {
  const ultimoAntes = (letra, limite) => {
    for (let i = limite - 1; i >= 0; i--) if (new RegExp(`^${letra}\\s+\\S`).test(corpo[i])) return i;
    return -1;
  };
  let iE = -1;
  for (let i = corpo.length - 1; i >= 0; i--) {
    if (/^E\s+\S/.test(corpo[i])) {
      iE = i;
      break;
    }
  }
  if (iE < 0) return null;
  const iD = ultimoAntes('D', iE);
  if (iD < 0) return null;
  const iC = ultimoAntes('C', iD);
  if (iC < 0) return null;
  const iB = ultimoAntes('B', iC);
  if (iB < 0) return null;
  const iA = ultimoAntes('A', iB);
  if (iA < 0) return null;
  return [iA, iB, iC, iD, iE];
}

function processar(exame) {
  const prova = readFileSync(join(dir, exame.prova), 'utf8');
  const letras = lerGabarito(readFileSync(join(dir, exame.gabarito), 'utf8'), exame.total, exame.id);

  const linhas = prova.split(/\r?\n/).map((l) => l.trim());

  // disciplina vigente em cada linha
  const secao = new Array(linhas.length).fill(null);
  let atual = null;
  linhas.forEach((l, i) => {
    if (Object.prototype.hasOwnProperty.call(MAPA, l)) atual = MAPA[l];
    secao[i] = atual;
  });

  const inicios = [];
  linhas.forEach((l, i) => {
    const m = l.match(/^Questão (\d{1,3})$/);
    if (m) inicios.push({ numero: Number(m[1]), linha: i, slug: secao[i] });
  });

  const RUIDO = new RegExp(
    `^(Espaço livre|CEBRASPE – PM/SC.*|-- PROVA OBJETIVA --|\\d+\\s*|${exame.rodape.source})$`
  );

  // textos de apoio
  const textos = {};
  linhas.forEach((l, i) => {
    const m = l.match(/^Texto (\d+A\d+-[IVX]+)$/);
    if (!m) return;
    const prox = inicios.find((q) => q.linha > i);
    textos[m[1]] = linhas
      .slice(i + 1, prox ? prox.linha : linhas.length)
      .filter((x) => x && !RUIDO.test(x))
      .join('\n')
      .trim();
  });

  const questoes = [];
  for (let i = 0; i < inicios.length; i++) {
    const { numero, linha, slug } = inicios[i];
    const fim = i + 1 < inicios.length ? inicios[i + 1].linha : linhas.length;
    const corpo = linhas.slice(linha + 1, fim).filter((l) => l && !RUIDO.test(l));

    const idx = acharAlternativas(corpo);
    if (!idx) continue;

    const enunciado = limpar(corpo.slice(0, idx[0]).join(' '), exame.rodape);
    const alternativas = idx.map((ini, k) => {
      const fimAlt = k + 1 < idx.length ? idx[k + 1] : corpo.length;
      const txt = corpo.slice(ini, fimAlt).join(' ').replace(/^[A-E]\s+/, '');
      return { letra: 'ABCDE'[k], texto: limpar(txt, exame.rodape) };
    });

    const resposta = letras[numero - 1];
    const ref = enunciado.match(/texto\s*(\d+A\d+-[IVX]+)/i);
    const completo = enunciado + ' ' + alternativas.map((a) => a.texto).join(' ');

    questoes.push({
      extId: `${exame.id}:${numero}`,
      numero,
      slug,
      anulada: resposta === 'X',
      dependeDeImagem: DEPENDE_DE_IMAGEM.test(completo),
      textoId: ref ? ref[1] : null,
      enunciado,
      alternativas,
      resposta: resposta === 'X' ? null : resposta,
    });
  }

  return { exame, textos, questoes };
}

const saida = { exames: [] };
const problemas = [];

for (const cfg of EXAMES) {
  const { exame, textos, questoes } = processar(cfg);
  const uteis = questoes.filter((q) => q.slug && !q.anulada && !q.dependeDeImagem);

  for (const q of uteis) {
    if (q.alternativas.length !== 5) problemas.push(`${q.extId}: ${q.alternativas.length} alternativas`);
    if (!q.alternativas.some((a) => a.letra === q.resposta))
      problemas.push(`${q.extId}: gabarito ${q.resposta} ausente nas alternativas`);
    if (q.enunciado.length < 20) problemas.push(`${q.extId}: enunciado com ${q.enunciado.length} caracteres`);
    if (q.alternativas.some((a) => a.texto.length < 2)) problemas.push(`${q.extId}: alternativa vazia`);
    if (q.textoId && !textos[q.textoId]) problemas.push(`${q.extId}: texto-base ${q.textoId} ausente`);
  }

  saida.exames.push({
    id: exame.id,
    nome: exame.nome,
    cargo: exame.cargo,
    banca: exame.banca,
    ano: exame.ano,
    aplicacao: exame.aplicacao,
    fonte: exame.fonte,
    fonteGabarito: exame.fonteGabarito,
    textos,
    questoes,
  });

  console.log(`${exame.nome}`);
  console.log(`  lidas: ${questoes.length}/${exame.total}`);
  console.log(`  anuladas: ${questoes.filter((q) => q.anulada).length}`);
  console.log(`  fora do edital 2026: ${questoes.filter((q) => !q.slug).length}`);
  console.log(`  dependem de imagem: ${questoes.filter((q) => q.dependeDeImagem).length}`);
  console.log(`  APROVEITAVEIS: ${uteis.length}`);
  const porSlug = {};
  for (const q of uteis) porSlug[q.slug] = (porSlug[q.slug] ?? 0) + 1;
  for (const [s, n] of Object.entries(porSlug)) console.log(`    ${s}: ${n}`);
  console.log(`  textos de apoio: ${Object.keys(textos).join(', ') || 'nenhum'}\n`);
}

writeFileSync(join(dir, 'provas.json'), JSON.stringify(saida, null, 2), 'utf8');

const totalUteis = saida.exames.reduce(
  (a, e) => a + e.questoes.filter((q) => q.slug && !q.anulada && !q.dependeDeImagem).length,
  0
);
console.log(`total aproveitavel das duas provas: ${totalUteis} questoes`);

if (problemas.length) {
  console.log(`\nproblemas (${problemas.length}):`);
  for (const p of problemas) console.log('  ! ' + p);
}
