// Converte content/apostila-constitucional.txt (pdftotext -layout -enc UTF-8 da
// Apostila de Direito Constitucional — PMSC Soldado 2026) em
// content/constitucional.json: um tópico por subseção do PDF, mais as 20
// questões inéditas do Módulo 9 com gabarito comentado.
//
// Uso: node scripts/parse-constitucional.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = readFileSync(join(root, 'content/apostila-constitucional.txt'), 'utf8');

const RODAPE = /^\s*Apostila de Direito Constitucional — PMSC Soldado 2026/;
const linhas = raw.split(/\r?\n/).filter((l) => !RODAPE.test(l));

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

const MODULO = /^Módulo (\d+) — (.+)$/;
const SUBSECAO = /^(\d+)\.(\d+) (.+)$/;
const CAIXAS = ['Revisão rápida', 'Regra de ouro', 'Como usar esta apostila', 'Aviso de atualização'];
const PEGADINHAS = 'Pegadinhas e confusões comuns';

/** Títulos quebrados em duas linhas pelo PDF: "Módulo 7 — … e" + "Segurança Pública". */
function tituloCompleto(i) {
  let titulo = linhas[i];
  let fim = i;
  while (linhas[fim + 1] && linhas[fim + 1].trim() && !/[.:•]$/.test(linhas[fim + 1])) {
    const prox = linhas[fim + 1].trim();
    if (MODULO.test(prox) || SUBSECAO.test(prox) || CAIXAS.includes(prox) || prox === PEGADINHAS) break;
    // só continua enquanto a linha anterior claramente termina no meio da frase
    if (!/( e|,|—|:)$/.test(titulo.trim()) && !/^[A-ZÀ-Ú][a-zà-ú]+$/.test(prox)) break;
    titulo = `${titulo.trim()} ${prox}`;
    fim += 1;
  }
  return { titulo: titulo.trim(), fim };
}

// ---------------------------------------------------------------- varredura
const modulos = [];
let moduloAtual = null;
let subAtual = null;
let destino = null; // array de linhas cru onde o texto corrente é acumulado

const novoModulo = (numero, titulo) => {
  moduloAtual = { numero, titulo, intro: [], subsecoes: [], pegadinhas: [], revisao: [] };
  modulos.push(moduloAtual);
  destino = moduloAtual.intro;
  subAtual = null;
};

const novaSub = (titulo) => {
  subAtual = { titulo, linhas: [] };
  moduloAtual.subsecoes.push(subAtual);
  destino = subAtual.linhas;
};

let i = 0;
let dentroDasQuestoes = false;
const linhasQuestoes = [];
const linhasAbertura = [];

for (; i < linhas.length; i += 1) {
  const linha = linhas[i];
  const t = linha.trim();

  const mMod = t.match(MODULO);
  if (mMod) {
    const { titulo, fim } = tituloCompleto(i);
    i = fim;
    const numero = Number(mMod[1]);
    if (numero === 9) {
      dentroDasQuestoes = true;
      moduloAtual = null;
      continue;
    }
    dentroDasQuestoes = false;
    novoModulo(numero, titulo.replace(MODULO, '$2'));
    continue;
  }

  // o que vem depois das questões (plano de revisão, checklist e fontes) é
  // lido à parte, por índice, no fechamento
  if (/^Plano de revisão — 4 semanas/.test(t)) break;

  if (dentroDasQuestoes) {
    linhasQuestoes.push(linha);
    continue;
  }

  if (!moduloAtual) {
    linhasAbertura.push(linha);
    continue;
  }

  const mSub = t.match(SUBSECAO);
  if (mSub && Number(mSub[1]) === moduloAtual.numero) {
    const { titulo, fim } = tituloCompleto(i);
    i = fim;
    novaSub(titulo.replace(SUBSECAO, '$3'));
    continue;
  }

  if (t === PEGADINHAS) {
    destino = moduloAtual.pegadinhas;
    continue;
  }

  if (CAIXAS.includes(t)) {
    destino = t === 'Revisão rápida' ? moduloAtual.revisao : [];
    continue;
  }

  destino.push(linha);
}

// ------------------------------------------------------------ texto → blocos
/** Agrupa linhas em parágrafos e listas, juntando quebras de linha do PDF. */
function blocosDe(linhasCru) {
  const blocos = [];
  let paragrafo = [];
  let lista = null;

  const fechaParagrafo = () => {
    if (!paragrafo.length) return;
    blocos.push({ type: 'paragraph', text: paragrafo.join(' ').replace(/\s+/g, ' ').trim() });
    paragrafo = [];
  };
  const fechaLista = () => {
    if (!lista?.items.length) return (lista = null);
    blocos.push(lista);
    lista = null;
  };

  for (const bruta of linhasCru) {
    const t = bruta.trim();
    if (!t) {
      fechaParagrafo();
      continue;
    }
    if (/^[•·]\s*/.test(t)) {
      fechaParagrafo();
      lista ??= { type: 'list', items: [] };
      lista.items.push(t.replace(/^[•·]\s*/, ''));
      continue;
    }
    if (lista) {
      // continuação recuada do último item da lista
      if (/^\s{4,}/.test(bruta)) {
        lista.items[lista.items.length - 1] += ` ${t}`;
        continue;
      }
      fechaLista();
    }
    paragrafo.push(t);
  }
  fechaParagrafo();
  fechaLista();
  return blocos;
}

const textoDe = (blocos) =>
  blocos
    .map((b) => {
      if (b.type === 'list') return b.items.map((it) => `• ${it}`).join('\n');
      if (b.type === 'table') {
        return [b.head, ...b.rows].filter(Boolean).map((linha) => linha.join(' — ')).join('\n');
      }
      if (b.type === 'callout') return `${b.title}: ${b.body}`;
      return b.text;
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();

const frases = (texto) => texto.split(/(?<=\.)\s+/).filter(Boolean);

// ------------------------------------------------------------------- tópicos
const topicos = [];
let ordem = 0;

const empurra = ({ titulo, blocos, modulo, paraQue }) => {
  ordem += 1;
  const texto = textoDe(blocos);
  const palavras = texto.split(/\s+/).length;
  // o resumo do tópico é a primeira frase corrida da subseção
  const primeiro = blocos.find((b) => b.type === 'paragraph');
  topicos.push({
    ref: `1.${ordem}`,
    order: ordem,
    slug: slugify(titulo),
    title: titulo,
    modulo,
    resumo: primeiro ? frases(primeiro.text)[0] : null,
    paraQue: paraQue ?? null,
    body: texto,
    blocks: blocos,
    readingMinutes: Math.max(2, Math.round(palavras / 180)),
  });
};

// tópico de abertura: como estudar a disciplina (capa e página 2 do PDF, que o
// pdftotext devolve embaralhadas — por isso aqui o conteúdo é montado à mão)
{
  const blocos = [
    {
      type: 'callout',
      variant: 'edital',
      title: 'NO EDITAL',
      body: 'Teoria da Constituição; Poder Constituinte; Constituição Federal de 1988, arts. 1º a 42, 44 a 100 e 122 a 144; Constituição do Estado de Santa Catarina, arts. 1º a 40, 50 a 76, 90 e 105 a 109-C. São 8 questões na prova objetiva (Tabela 8.1 do Edital nº 002/CCP/2026 — Instituto AOCP).',
    },
    {
      type: 'paragraph',
      text: 'Estude uma aula por vez. Leia a explicação, consulte o artigo constitucional indicado, responda às questões sem olhar o gabarito e registre os erros. A apostila é um guia de estudo: a legislação oficial e o edital prevalecem em caso de divergência.',
    },
    {
      type: 'paragraph',
      text: 'O edital prevê 8 questões de Direito Constitucional. Isso torna a disciplina relevante, mas não é seguro apostar em um único tema: o conteúdo programático deve ser coberto integralmente.',
    },
    { type: 'heading', text: 'Rotina de 60 minutos' },
    {
      type: 'list',
      items: [
        '20 minutos — teoria: leia o módulo e sublinhe palavras-chave.',
        '15 minutos — lei seca: abra a Constituição oficial e leia os artigos indicados.',
        '20 minutos — questões: responda sem consultar o material.',
        '5 minutos — revisão: anote a regra que errou e explique-a com suas palavras.',
      ],
    },
    { type: 'heading', text: 'Mapa dos módulos' },
    {
      type: 'table',
      head: ['Módulo', 'Conteúdo'],
      rows: [
        ['1', 'Teoria da Constituição e Poder Constituinte'],
        ['2', 'Princípios fundamentais — CF, arts. 1º a 4º'],
        ['3', 'Direitos e garantias fundamentais — CF, arts. 5º a 17'],
        ['4', 'Organização do Estado — CF, arts. 18 a 36'],
        ['5', 'Administração Pública e militares estaduais — CF, arts. 37 a 42'],
        ['6', 'Organização dos Poderes — CF, arts. 44 a 100'],
        ['7', 'Justiça Militar, defesa do Estado e segurança pública — CF, arts. 122 a 144'],
        ['8', 'Constituição de Santa Catarina — artigos expressamente indicados'],
        ['9', 'Simulado final, gabarito e plano de revisão'],
      ],
    },
    {
      type: 'callout',
      variant: 'atencao',
      title: 'REGRA DE OURO',
      body: 'Não confunda uma previsão pedagógica com garantia de cobrança. Os destaques de prioridade são recomendações de estudo; o edital determina o conteúdo exigido.',
    },
  ];
  empurra({ titulo: 'Como estudar Direito Constitucional', blocos, modulo: 'Antes de começar' });
}

for (const m of modulos) {
  const rotulo = `Módulo ${m.numero} — ${m.titulo}`;
  const introBlocos = blocosDe(m.intro);
  const baseEdital = introBlocos.find((b) => b.type === 'paragraph' && /^Base do edital:/.test(b.text));
  const introTexto = introBlocos
    .filter((b) => b !== baseEdital)
    .map((b) => (b.type === 'list' ? b.items.join(' ') : b.text))
    .join(' ');

  const pegadinhas = blocosDe(m.pegadinhas).flatMap((b) => (b.type === 'list' ? b.items : [b.text]));
  const revisao = textoDe(blocosDe(m.revisao));

  m.subsecoes.forEach((s, idx) => {
    const blocos = blocosDe(s.linhas);

    // o primeiro tópico do módulo abre com a base do edital e a introdução
    if (idx === 0) {
      const abertura = [];
      if (baseEdital) {
        abertura.push({
          type: 'callout',
          variant: 'edital',
          title: 'NO EDITAL',
          body: `${baseEdital.text.replace(/^Base do edital:\s*/, '')}${introTexto ? ` — ${introTexto}` : ''}`,
        });
      }
      blocos.unshift(...abertura);
    }

    // o último tópico do módulo recebe as pegadinhas e a revisão rápida
    if (idx === m.subsecoes.length - 1) {
      if (pegadinhas.length) {
        blocos.push({
          type: 'callout',
          variant: 'atencao',
          title: 'PEGADINHAS E CONFUSÕES COMUNS',
          body: pegadinhas.join(' · '),
        });
      }
      if (revisao) {
        blocos.push({ type: 'callout', variant: 'dica', title: 'REVISÃO RÁPIDA', body: revisao });
      }
    }

    empurra({
      titulo: s.titulo,
      blocos,
      modulo: rotulo,
      paraQue: baseEdital
        ? `Está no recorte do edital: ${baseEdital.text.replace(/^Base do edital:\s*/, '').replace(/\.$/, '')} (${rotulo}).`
        : null,
    });
  });
}

// tópico final: plano de revisão, checklist e fontes oficiais
{
  // a tabela das 4 semanas e a lista de fontes saem quebradas do pdftotext;
  // o checklist, que é uma lista simples, vem direto do texto extraído
  const inicioChecklist = linhas.findIndex((l) => /^Checklist de domínio/.test(l.trim()));
  const fimChecklist = linhas.findIndex((l) => /^Gabarito rápido/.test(l.trim()));
  const checklist = blocosDe(linhas.slice(inicioChecklist + 1, fimChecklist));

  const blocos = [
    {
      type: 'paragraph',
      text: 'Use este plano como estrutura repetível. Se algum módulo exigir mais tempo, ajuste o ritmo sem deixar de revisar os demais tópicos do edital.',
    },
    {
      type: 'table',
      head: ['Semana', 'Foco principal', 'Atividade de fixação'],
      rows: [
        ['1', 'Teoria da Constituição; Poder Constituinte; CF, arts. 1º–17', 'Resumo de uma página + 20 questões'],
        ['2', 'CF, arts. 18–42', 'Quadro de competências + 20 questões'],
        ['3', 'CF, arts. 44–100 e 122–144', 'Mapa dos Poderes + segurança pública + 25 questões'],
        [
          '4',
          'Constituição de SC nos intervalos do edital + revisão geral',
          'Simulado de 8 questões de Constitucional e caderno de erros',
        ],
      ],
    },
    { type: 'heading', text: 'Checklist de domínio' },
    ...checklist,
    { type: 'heading', text: 'Fontes oficiais para consulta' },
    {
      type: 'list',
      items: [
        'Edital nº 002/CCP/2026 — Instituto AOCP: https://institutoaocp.selecao.net.br/informacoes/3',
        'Constituição Federal de 1988 — texto compilado, Portal Planalto: https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm',
        'Constituição do Estado de Santa Catarina — ALESC, texto atualizado: https://leis.alesc.sc.gov.br/ato-normativo/52785',
      ],
    },
  ];
  blocos.push({
    type: 'callout',
    variant: 'atencao',
    title: 'AVISO DE ATUALIZAÇÃO',
    body: 'A legislação aplicável é a vigente na data de publicação do edital de abertura. Esta apostila resume e explica os tópicos, mas não substitui a leitura da legislação oficial — confira as retificações do edital e memorize a redação exata pelos textos do Planalto e da ALESC.',
  });
  empurra({
    titulo: 'Plano de revisão de 4 semanas e checklist de domínio',
    blocos,
    modulo: 'Fechamento',
  });
}

// ------------------------------------------------------------------ questões
// Cada questão do Módulo 9 é amarrada ao tópico que a responde, para alimentar
// a revisão por tópico. A ordem das refs segue a numeração gerada acima.
const TOPICO_DA_QUESTAO = {
  1: '1.4', // classificação da CF/88
  2: '1.7', // art. 1º — fundamentos
  3: '1.11', // art. 5º, XI — domicílio
  4: '1.12', // remédios constitucionais
  5: '1.16', // federação e autonomia
  6: '1.17', // competências — art. 23
  7: '1.20', // LIMPE
  8: '1.21', // concurso público
  9: '1.33', // segurança pública — art. 144
  10: '1.6', // cláusulas pétreas
  11: '1.25', // Poder Legislativo
  12: '1.23', // responsabilidade civil do Estado
  13: '1.10', // art. 4º — relações internacionais
  14: '1.11', // inviolabilidade do domicílio
  15: '1.17', // competência concorrente — art. 24
  16: '1.15', // plebiscito e referendo
  17: '1.20', // impessoalidade
  18: '1.29', // Justiça Militar da União
  19: '1.15', // direitos políticos
  20: '1.38', // método de leitura da Constituição estadual
};

const questoes = [];
{
  const texto = linhasQuestoes.join('\n');
  const partes = texto.split(/\n(?=\d{1,2}\. )/).slice(1);

  for (const parte of partes) {
    const linhasQ = parte.split('\n');
    const numero = Number(linhasQ[0].trim().match(/^(\d{1,2})\./)[1]);

    const enunciado = [];
    const alternativas = [];
    const gabarito = [];
    let onde = 'enunciado';
    let resposta = null;

    for (const l of linhasQ) {
      const t = l.trim();
      if (!t) continue;
      const alt = t.match(/^([A-E])\)\s*(.+)$/);
      const gab = t.match(/^Gabarito:\s*([A-E])\s*—\s*(.+)$/);
      if (gab) {
        onde = 'gabarito';
        resposta = gab[1];
        gabarito.push(gab[2]);
        continue;
      }
      if (alt) {
        onde = 'alternativas';
        alternativas.push({ letra: alt[1], texto: alt[2] });
        continue;
      }
      if (onde === 'enunciado') enunciado.push(t.replace(/^\d{1,2}\.\s*/, ''));
      else if (onde === 'alternativas') {
        const ultima = alternativas[alternativas.length - 1];
        if (ultima) ultima.texto += ` ${t}`;
      } else gabarito.push(t);
    }

    questoes.push({
      numero,
      topicoRef: TOPICO_DA_QUESTAO[numero] ?? null,
      enunciado: enunciado.join(' ').replace(/\s+/g, ' ').trim(),
      alternativas,
      resposta,
      justificativa: gabarito.join(' ').replace(/\s+/g, ' ').trim(),
    });
  }
}

const saida = {
  fonte: 'Apostila de Direito Constitucional — PMSC Soldado 2026 (Instituto AOCP, Edital nº 002/CCP/2026)',
  disciplina: 'direito-constitucional',
  topicos,
  questoes,
};

writeFileSync(join(root, 'content/constitucional.json'), `${JSON.stringify(saida, null, 2)}\n`);
console.log(`tópicos: ${topicos.length}`);
console.log(`questões: ${questoes.length}`);
