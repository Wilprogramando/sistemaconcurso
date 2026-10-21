// Converte a prova objetiva oficial de Soldado da PMSC (Cebraspe, 27/8/2023)
// e o gabarito definitivo em content/prova-2023.json.
//
// Fonte (CDN publico da propria banca):
//   https://cdn.cebraspe.org.br/concursos/pm_sc_23_soldado/arquivos/862_PMSC_SOLDADO_001_01.PDF
//   https://cdn.cebraspe.org.br/concursos/pm_sc_23_soldado/arquivos/GAB_DEFINITIVO_862_PMSC_SOLDADO_001_01.PDF
//
// Extracao: pdftotext -raw -enc UTF-8 (o modo -raw respeita a ordem de leitura
// das duas colunas; o -layout intercala e embaralha as questoes).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'content');

const prova = readFileSync(join(dir, 'prova-2023.txt'), 'utf8');
const gabarito = readFileSync(join(dir, 'prova-2023-gabarito.txt'), 'utf8');

// Disciplinas de 2023 -> slugs do edital 2026.
// Raciocinio Logico caiu em 2023 mas NAO consta do Anexo II do edital 002/CCP/2026.
const SECOES = [
  ['NOÇÕES DE DIREITO CONSTITUCIONAL', 'direito-constitucional'],
  ['NOÇÕES DE DIREITO PENAL COMUM', 'direito-penal-comum'],
  ['NOÇÕES DE DIREITO PROCESSUAL PENAL', 'direito-processual-penal'],
  ['LEGISLAÇÃO INSTITUCIONAL', 'legislacao-institucional'],
  ['LÍNGUA PORTUGUESA', 'lingua-portuguesa'],
  ['INFORMÁTICA', 'informatica'],
  ['RACIOCÍNIO LÓGICO', null],
];

// Questoes que dependem de uma imagem do caderno (captura de tela, figura):
// o texto sozinho nao permite responder, entao ficam de fora do banco.
const DEPENDE_DE_IMAGEM = /\bfigura (anterior|a seguir|apresentada)|caixa de diálogo|figura acima/i;

// ---------- gabarito ----------
const letras = [];
for (const bloco of gabarito.split(/Questão/).slice(1)) {
  const linhaGab = bloco.split(/Gabarito/)[1];
  if (!linhaGab) continue;
  for (const ch of linhaGab.replace(/[^A-EX]/g, '')) letras.push(ch);
}
if (letras.length !== 58) {
  console.error(`gabarito: esperava 58 respostas, li ${letras.length}: ${letras.join('')}`);
  process.exit(1);
}

// ---------- prova ----------
const linhas = prova.split(/\r?\n/).map((l) => l.trim());

const secaoDaLinha = new Array(linhas.length).fill(null);
let atual = null;
linhas.forEach((l, i) => {
  const achou = SECOES.find(([titulo]) => l === titulo);
  if (achou) atual = achou[1];
  secaoDaLinha[i] = atual;
});

const inicios = [];
linhas.forEach((l, i) => {
  const m = l.match(/^Questão (\d{1,2})$/);
  if (m) inicios.push({ numero: Number(m[1]), linha: i, slug: secaoDaLinha[i] });
});

const RUIDO = /^(Espaço livre|862001_\d+|CEBRASPE – PM\/SC.*|-- PROVA OBJETIVA --|\d+\s*)$/;

/**
 * Em -raw o rodape do caderno ("862001_01N171339 CEBRASPE – PM/SC – Edital: 2023")
 * e o titulo da proxima secao as vezes grudam no fim da ultima alternativa.
 */
function limpa(texto) {
  let s = texto;
  s = s.replace(/\s*862001_\w+\s*/g, ' ');
  s = s.replace(/\s*CEBRASPE\s*[–-]\s*PM\/SC\s*[–-]\s*Edital:\s*\d{4}\s*/gi, ' ');
  s = s.replace(/\s*-{2}\s*PROVA OBJETIVA\s*-{2}\s*/gi, ' ');
  s = s.replace(/\s*Espaço livre\s*/gi, ' ');
  // Tudo que vier depois do titulo da proxima secao, ou do proximo texto-base,
  // pertence a outra questao: corta ali.
  const titulos = SECOES.map(([t]) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  s = s.split(new RegExp(`\\s(?:${titulos})\\b`))[0];
  s = s.split(/\sTexto 1A\d+-[IVX]+\b/)[0];
  // titulo da proxima secao grudado no fim ("... NOÇÕES DE DIREITO PROCESSUAL PENAL COMUM")
  s = s.replace(/\s+(?:NOÇÕES DE |)[A-ZÀ-Ü][A-ZÀ-Ü\s]{11,}$/, '');
  return s.replace(/\s+/g, ' ').trim();
}

// ---------- textos-base ("Texto 1A5-I" etc.) ----------
const textos = {};
linhas.forEach((l, i) => {
  const m = l.match(/^Texto (1A\d+-[IVX]+)$/);
  if (!m) return;
  const proxQuestao = inicios.find((q) => q.linha > i);
  const fim = proxQuestao ? proxQuestao.linha : linhas.length;
  textos[m[1]] = linhas
    .slice(i + 1, fim)
    .filter((x) => x && !RUIDO.test(x))
    .join('\n')
    .trim();
});

/** Acha o bloco de alternativas varrendo de tras para frente, para que um
 *  enunciado que comece com "A respeito de..." nao seja lido como alternativa A. */
function achaAlternativas(corpo) {
  const ultimoAntes = (letra, limite) => {
    for (let i = limite - 1; i >= 0; i--) if (new RegExp(`^${letra}\\s+\\S`).test(corpo[i])) return i;
    return -1;
  };
  let iE = -1;
  for (let i = corpo.length - 1; i >= 0; i--) if (/^E\s+\S/.test(corpo[i])) { iE = i; break; }
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

const questoes = [];
for (let i = 0; i < inicios.length; i++) {
  const { numero, linha, slug } = inicios[i];
  const fim = i + 1 < inicios.length ? inicios[i + 1].linha : linhas.length;
  const corpo = linhas.slice(linha + 1, fim).filter((l) => l && !RUIDO.test(l));

  const idx = achaAlternativas(corpo);
  if (!idx) {
    console.warn(`questao ${numero}: alternativas nao encontradas, ignorada`);
    continue;
  }

  const enunciado = limpa(corpo.slice(0, idx[0]).join(' '));

  const alternativas = idx.map((inicio, k) => {
    const fimAlt = k + 1 < idx.length ? idx[k + 1] : corpo.length;
    const texto = corpo
      .slice(inicio, fimAlt)
      .join(' ')
      .replace(/^[A-E]\s+/, '');
    return { letra: 'ABCDE'[k], texto: limpa(texto) };
  });

  const resposta = letras[numero - 1];
  // o PDF as vezes cola "texto1A5-II" sem espaco
  const refTexto = enunciado.match(/texto\s*(1A\d+-[IVX]+)/i);
  const completo = enunciado + ' ' + alternativas.map((a) => a.texto).join(' ');

  questoes.push({
    numero,
    slug,
    anulada: resposta === 'X',
    dependeDeImagem: DEPENDE_DE_IMAGEM.test(completo),
    textoId: refTexto ? refTexto[1] : null,
    enunciado,
    alternativas,
    resposta: resposta === 'X' ? null : resposta,
  });
}

// ---------- validacao ----------
const problemas = [];
for (const q of questoes) {
  if (q.alternativas.length !== 5) problemas.push(`Q${q.numero}: ${q.alternativas.length} alternativas`);
  if (q.enunciado.length < 20) problemas.push(`Q${q.numero}: enunciado com ${q.enunciado.length} caracteres`);
  if (q.alternativas.some((a) => a.texto.length < 2)) problemas.push(`Q${q.numero}: alternativa vazia`);
  if (q.textoId && !textos[q.textoId]) problemas.push(`Q${q.numero}: texto-base ${q.textoId} nao extraido`);
}

const aproveitadas = questoes.filter((q) => q.slug && !q.anulada && !q.dependeDeImagem);

writeFileSync(
  join(root, 'content/prova-2023.json'),
  JSON.stringify(
    {
      exame: {
        nome: 'PMSC 2023 — Soldado (prova objetiva)',
        banca: 'CEBRASPE',
        ano: 2023,
        aplicacao: '2023-08-27',
        fonte:
          'https://cdn.cebraspe.org.br/concursos/pm_sc_23_soldado/arquivos/862_PMSC_SOLDADO_001_01.PDF',
        gabarito:
          'https://cdn.cebraspe.org.br/concursos/pm_sc_23_soldado/arquivos/GAB_DEFINITIVO_862_PMSC_SOLDADO_001_01.PDF',
      },
      textos,
      questoes,
    },
    null,
    2
  ),
  'utf8'
);

console.log(`questoes lidas: ${questoes.length} de 58`);
console.log(`  anuladas pela banca: ${questoes.filter((q) => q.anulada).length}`);
console.log(`  fora do edital 2026 (Raciocinio Logico): ${questoes.filter((q) => !q.slug).length}`);
console.log(`  dependem de imagem do caderno: ${questoes.filter((q) => q.dependeDeImagem).length}`);
console.log(`aproveitaveis: ${aproveitadas.length}`);
for (const [, slug] of SECOES.filter(([, s]) => s)) {
  console.log(`  ${slug}: ${aproveitadas.filter((q) => q.slug === slug).length}`);
}
console.log(`textos-base extraidos: ${Object.keys(textos).join(', ')}`);
if (problemas.length) {
  console.log('\nproblemas:');
  for (const p of problemas) console.log('  ' + p);
}
