/**
 * Correção automática da redação por critérios objetivos.
 *
 * O que esta análise FAZ: mede estrutura, conectivos, elementos da proposta de
 * intervenção, repetição de vocabulário, marcas de oralidade, clichês e desvios
 * de registro que podem ser detectados com segurança no texto.
 *
 * O que ela NÃO faz: julgar a qualidade dos argumentos, conferir se o repertório
 * citado é verdadeiro, nem substituir um corretor humano. A nota é uma estimativa
 * de quanto o texto atende à forma cobrada — use como treino, não como veredito.
 */

export type Criterio = {
  id: string;
  nome: string;
  descricao: string;
  nota: number;
  maximo: number;
  observacoes: string[];
};

export type Apontamento = {
  tipo: 'erro' | 'alerta' | 'sugestao' | 'elogio';
  titulo: string;
  detalhe: string;
  trecho?: string;
};

export type Analise = {
  palavras: number;
  linhas: number;
  paragrafos: number;
  periodos: number;
  mediaPalavrasPorPeriodo: number;
  diversidade: number;
  nota: number;
  maximo: number;
  criterios: Criterio[];
  apontamentos: Apontamento[];
};

// --------------------------------------------------------------------
// listas de apoio
// --------------------------------------------------------------------

const CONECTIVOS: Record<string, string[]> = {
  adição: ['além disso', 'ademais', 'outrossim', 'também', 'não só', 'bem como', 'somado a isso'],
  oposição: ['porém', 'contudo', 'todavia', 'entretanto', 'no entanto', 'em contrapartida', 'por outro lado', 'apesar de', 'embora'],
  causa: ['porque', 'pois', 'uma vez que', 'visto que', 'já que', 'devido a', 'em razão de', 'por conta de'],
  consequência: ['portanto', 'logo', 'por conseguinte', 'assim', 'dessa forma', 'desse modo', 'de modo que', 'por isso'],
  conclusão: ['portanto', 'em suma', 'dessa maneira', 'conclui-se', 'diante do exposto', 'em vista disso', 'por fim'],
  exemplificação: ['por exemplo', 'a exemplo de', 'como', 'isto é', 'ou seja', 'tal qual'],
  finalidade: ['a fim de', 'para que', 'com o intuito de', 'com o objetivo de', 'com a finalidade de'],
};

const AGENTES = [
  'governo', 'estado', 'união', 'poder público', 'ministério', 'secretaria', 'congresso',
  'poder legislativo', 'poder executivo', 'poder judiciário', 'polícia militar', 'polícia',
  'escola', 'escolas', 'família', 'mídia', 'imprensa', 'sociedade civil', 'ong', 'prefeitura',
  'município', 'judiciário', 'ministério público', 'universidades', 'empresas',
];

const MEIOS = ['por meio de', 'mediante', 'através de', 'por intermédio de', 'via', 'com o uso de', 'valendo-se de'];

const CLICHES = [
  'desde os primórdios', 'desde os primórdios da humanidade', 'nos dias atuais', 'nos dias de hoje',
  'é sabido que', 'sabe-se que', 'com toda certeza', 'cada vez mais', 'na sociedade atual',
  'de uns tempos para cá', 'infelizmente', 'o mundo em que vivemos', 'vivemos em um mundo',
  'desde que o mundo é mundo', 'um mal que assola',
];

const ORALIDADE = [
  'a gente', 'né', 'tipo assim', 'coisa', 'coisas', 'daí', 'pra', 'pro', 'tá', 'tô',
  'muito bom', 'super', 'bem melhor', 'um monte', 'cara', 'meio que',
];

const PRIMEIRA_PESSOA = [
  'eu acho', 'eu penso', 'na minha opinião', 'eu acredito', 'ao meu ver', 'a meu ver',
  'eu vejo', 'eu sinto', 'penso que', 'acho que',
];

/** Desvios que dá para apontar com alta confiança por padrão de escrita. */
const DESVIOS: { regex: RegExp; titulo: string; detalhe: string }[] = [
  {
    regex: /\ba n[íi]vel de\b/gi,
    titulo: '"a nível de"',
    detalhe: 'A norma-padrão pede "em nível de" (ou simplesmente reescreva: "nacionalmente", "no âmbito nacional").',
  },
  {
    regex: /\bhouveram\b/gi,
    titulo: '"houveram"',
    detalhe: 'O verbo haver no sentido de existir é impessoal e não vai ao plural: "houve".',
  },
  {
    regex: /\bfazem\s+\w+\s+(anos|meses|dias)\b/gi,
    titulo: '"fazem X anos"',
    detalhe: 'Fazer indicando tempo decorrido é impessoal: "faz dez anos".',
  },
  {
    regex: /\bpara mim\s+[a-zà-ÿ]+(ar|er|ir)\b/gi,
    titulo: '"para mim" + verbo',
    detalhe: 'Quem pratica a ação é "eu": "para eu fazer". "Mim" não conjuga verbo.',
  },
  {
    regex: /\bentre eu\b/gi,
    titulo: '"entre eu"',
    detalhe: 'Depois de preposição usa-se o pronome oblíquo: "entre mim e você".',
  },
  {
    regex: /\bmau\s+(feito|educado|humorado)?\b(?=\s|$)/gi,
    titulo: 'possível troca "mau/mal"',
    detalhe: '"Mau" é adjetivo e se opõe a "bom"; "mal" é advérbio e se opõe a "bem". Confira o uso.',
  },
  {
    regex: /\bde encontro a[os]?\b/gi,
    titulo: '"de encontro a"',
    detalhe: '"De encontro a" significa colisão, oposição. Para concordância, use "ao encontro de".',
  },
  {
    regex: /\bonde\b/gi,
    titulo: 'uso de "onde"',
    detalhe: '"Onde" indica lugar físico. Para situações ou momentos, use "em que", "no qual", "nos quais".',
  },
  {
    regex: /\bmesmo\s+(?:que\s+)?(?:foi|era|está|estava)\b/gi,
    titulo: '"mesmo" como pronome',
    detalhe: 'Evite "o mesmo" substituindo substantivo ("o réu... o mesmo declarou"). Repita o termo ou use um pronome adequado.',
  },
  {
    // só espaço mesmo: \s pegaria a quebra entre parágrafos e acusaria erro falso
    regex: / {2,}/g,
    titulo: 'espaços duplicados',
    detalhe: 'Há espaços em excesso entre palavras. Revise a digitação.',
  },
];

const STOPWORDS = new Set([
  'a','o','as','os','um','uma','uns','umas','de','do','da','dos','das','em','no','na','nos','nas',
  'por','pelo','pela','para','com','sem','sob','sobre','entre','e','ou','mas','que','se','ao','aos',
  'à','às','é','são','ser','foi','era','como','mais','menos','muito','muita','já','não','sim','seu',
  'sua','seus','suas','este','esta','esse','essa','isso','isto','aquele','aquela','ele','ela','eles',
  'elas','nós','lhe','lhes','seu','ter','tem','têm','há','pode','podem','deve','devem','também','ainda',
]);

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Procura termos como PALAVRAS INTEIRAS. Sem isso, "tá" casava dentro de
 * "Catarina" e "coisa" dentro de outras palavras, acusando oralidade em
 * texto formal — falso positivo que tornava a nota injusta.
 */
const contar = (texto: string, termos: string[]) => {
  const alvo = normalizar(texto);
  return termos.filter((t) =>
    new RegExp(`(?<![\\p{L}])${escapar(normalizar(t))}(?![\\p{L}])`, 'u').test(alvo)
  );
};

// --------------------------------------------------------------------
// análise
// --------------------------------------------------------------------

export function analisar(textoBruto: string): Analise {
  const texto = textoBruto.replace(/\r/g, '').trim();
  const paragrafos = texto.split(/\n\s*\n|\n/).map((p) => p.trim()).filter((p) => p.length > 1);
  const palavrasLista = texto.match(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]*/g) ?? [];
  const palavras = palavrasLista.length;
  const periodosLista = texto.split(/[.!?]+(?=\s|$)/).map((p) => p.trim()).filter((p) => p.length > 3);
  const periodos = periodosLista.length;
  const mediaPalavrasPorPeriodo = periodos ? Math.round(palavras / periodos) : 0;

  const unicas = new Set(palavrasLista.map((p) => normalizar(p)));
  const diversidade = palavras ? Math.round((100 * unicas.size) / palavras) : 0;

  const apontamentos: Apontamento[] = [];
  const criterios: Criterio[] = [];

  // ---------- 1. Estrutura ----------
  {
    const obs: string[] = [];
    let nota = 4;

    if (paragrafos.length < 3) {
      nota -= 2;
      obs.push(`Você escreveu ${paragrafos.length} parágrafo(s). O texto dissertativo-argumentativo pede no mínimo introdução, desenvolvimento e conclusão.`);
      apontamentos.push({
        tipo: 'erro',
        titulo: 'Faltam parágrafos',
        detalhe: 'Estruture em 4 ou 5 parágrafos: introdução com a tese, dois de desenvolvimento e conclusão com proposta de intervenção.',
      });
    } else if (paragrafos.length > 6) {
      nota -= 1;
      obs.push(`${paragrafos.length} parágrafos fragmentam a argumentação. O padrão da banca é 4 ou 5.`);
    } else {
      obs.push(`${paragrafos.length} parágrafos — dentro do padrão esperado.`);
    }

    if (palavras < 150) {
      nota -= 2;
      obs.push(`${palavras} palavras é pouco: a proposta pede um texto desenvolvido, em torno de 25 a 30 linhas.`);
      apontamentos.push({
        tipo: 'erro',
        titulo: 'Texto curto demais',
        detalhe: `Com ${palavras} palavras o texto não desenvolve os argumentos. Mire entre 250 e 350 palavras.`,
      });
    } else if (palavras < 220) {
      nota -= 1;
      obs.push(`${palavras} palavras — ainda abaixo do ideal (250 a 350).`);
    } else if (palavras > 450) {
      nota -= 1;
      obs.push(`${palavras} palavras — acima do espaço da folha oficial; corte o que for repetição.`);
    } else {
      obs.push(`${palavras} palavras — extensão adequada.`);
    }

    const desequilibrados = paragrafos.filter((p) => (p.match(/\S+/g) ?? []).length < 25);
    if (desequilibrados.length > 1 && paragrafos.length >= 3) {
      nota -= 0.5;
      obs.push(`${desequilibrados.length} parágrafos têm menos de 25 palavras — desenvolva cada ideia.`);
    }

    criterios.push({
      id: 'estrutura',
      nome: 'Estrutura',
      descricao: 'Introdução, desenvolvimento e conclusão, com parágrafos equilibrados e extensão adequada.',
      nota: Math.max(0, Math.min(4, nota)),
      maximo: 4,
      observacoes: obs,
    });
  }

  // ---------- 2. Tese e argumentação ----------
  {
    const obs: string[] = [];
    let nota = 4;
    const intro = paragrafos[0] ?? '';

    const marcasDeTese = contar(intro, [
      'é necessário', 'é preciso', 'deve-se', 'cabe', 'urge', 'evidencia-se', 'nota-se',
      'portanto', 'por isso', 'logo', 'assim', 'diante disso', 'nesse sentido', 'constitui',
      'configura', 'representa', 'é fundamental', 'é imprescindível', 'torna-se',
    ]);

    if (!intro) {
      nota -= 2;
      obs.push('Não há parágrafo de introdução identificável.');
    } else if ((intro.match(/\S+/g) ?? []).length < 30) {
      nota -= 1;
      obs.push('A introdução está curta: ela precisa contextualizar o tema e apresentar a tese.');
    }

    if (marcasDeTese.length === 0) {
      nota -= 1.5;
      obs.push('Não localizei uma tese explícita na introdução — um posicionamento claro sobre o tema.');
      apontamentos.push({
        tipo: 'alerta',
        titulo: 'Tese pouco explícita',
        detalhe: 'Feche a introdução com uma frase que diga o que você defende, do tipo "Diante disso, é necessário que..." ou "Nesse sentido, a ordem pública depende de...".',
      });
    } else {
      obs.push('Há marcas de posicionamento na introdução.');
    }

    const repertorio = /\b(constitui[çc][ãa]o|lei\s+n?[º°.]?\s*\d|art(igo)?\.?\s*\d|segundo|conforme|de acordo com|dados d[eoa]|ibge|onu|stf|stj|ipea|f[óo]rum brasileiro)/i.test(texto);
    if (repertorio) {
      obs.push('O texto aciona repertório externo (lei, dado ou fonte), o que valoriza a argumentação.');
      apontamentos.push({
        tipo: 'elogio',
        titulo: 'Repertório acionado',
        detalhe: 'Você citou fonte, lei ou dado. Confira se a referência está correta — a banca desconta repertório inventado.',
      });
    } else {
      nota -= 1;
      obs.push('Nenhum repertório legitimado identificado (Constituição, lei, dado oficial, autor).');
      apontamentos.push({
        tipo: 'sugestao',
        titulo: 'Traga repertório',
        detalhe: 'Em tema de ordem pública, o repertório natural é o art. 144 da Constituição, a competência da polícia ostensiva e dados de segurança pública.',
      });
    }

    criterios.push({
      id: 'argumentacao',
      nome: 'Tese e argumentação',
      descricao: 'Posicionamento claro na introdução e argumentos sustentados por repertório.',
      nota: Math.max(0, Math.min(4, nota)),
      maximo: 4,
      observacoes: obs,
    });
  }

  // ---------- 3. Proposta de intervenção ----------
  {
    const obs: string[] = [];
    const conclusao = paragrafos.slice(-1)[0] ?? '';
    const base = conclusao || texto;

    const agente = contar(base, AGENTES);
    const meio = contar(base, MEIOS);
    const finalidade = contar(base, CONECTIVOS.finalidade);
    // aceita o infinitivo e as formas conjugadas usuais ("amplie", "promova",
    // "implemente"), senão uma proposta bem escrita era acusada de não ter ação
    const acao =
      /\b(deve|devem|precisa|precisam|cabe|compete|é necessário|é preciso|é imperioso|é fundamental)\b/i.test(
        base
      ) ||
      /\b(implement|cri|ampli|promov|investi|fiscaliz|capacit|articul|garant|desenvolv|estrutur|reforç|moderniz|intensific)(ar|e|em|a|am|ando|ação)\b/i.test(
        base
      );
    const detalhamento = /\b(por meio de|mediante|com campanhas|com cursos|com verbas|em parceria|a fim de|para que)\b/i.test(base);

    const elementos = [
      ['agente', agente.length > 0],
      ['ação', acao],
      ['meio', meio.length > 0],
      ['finalidade', finalidade.length > 0],
      ['detalhamento', detalhamento],
    ] as const;

    const presentes = elementos.filter(([, ok]) => ok).length;
    const faltando = elementos.filter(([, ok]) => !ok).map(([nome]) => nome);

    const nota = (presentes / 5) * 4;

    obs.push(`${presentes} de 5 elementos presentes na conclusão.`);
    if (agente.length) obs.push(`Agente identificado: ${agente.slice(0, 3).join(', ')}.`);

    if (faltando.length) {
      apontamentos.push({
        tipo: presentes < 3 ? 'erro' : 'alerta',
        titulo: `Proposta de intervenção incompleta (falta ${faltando.join(', ')})`,
        detalhe:
          'A proposta completa responde: QUEM faz (agente), O QUE faz (ação), COMO faz (meio), PARA QUE faz (finalidade) e com qual DETALHE. Exemplo: "Cabe ao Estado (agente) ampliar o policiamento comunitário (ação), por meio de convênios com os municípios (meio), a fim de reduzir a sensação de insegurança (finalidade), priorizando bairros com maiores índices de ocorrência (detalhamento)."',
      });
    } else {
      apontamentos.push({
        tipo: 'elogio',
        titulo: 'Proposta de intervenção completa',
        detalhe: 'Os cinco elementos aparecem na conclusão. Esse é o parágrafo que mais pesa na nota.',
      });
    }

    criterios.push({
      id: 'intervencao',
      nome: 'Proposta de intervenção',
      descricao: 'Agente, ação, meio, finalidade e detalhamento na conclusão.',
      nota: Math.round(nota * 2) / 2,
      maximo: 4,
      observacoes: obs,
    });
  }

  // ---------- 4. Coesão ----------
  {
    const obs: string[] = [];
    let nota = 4;

    const funcoesUsadas = Object.entries(CONECTIVOS).filter(([, lista]) => contar(texto, lista).length > 0);
    const totalConectivos = Object.values(CONECTIVOS).reduce((a, l) => a + contar(texto, l).length, 0);

    if (funcoesUsadas.length <= 1) {
      nota -= 2;
      obs.push('Praticamente não há conectivos: os parágrafos ficam soltos uns dos outros.');
      apontamentos.push({
        tipo: 'erro',
        titulo: 'Faltam conectivos',
        detalhe: 'Comece cada parágrafo de desenvolvimento com um conectivo que marque a relação: "Em primeiro lugar...", "Além disso...", "Por outro lado...", "Portanto...".',
      });
    } else if (funcoesUsadas.length <= 2) {
      nota -= 1;
      obs.push(`Conectivos de apenas ${funcoesUsadas.length} tipos (${funcoesUsadas.map(([f]) => f).join(', ')}). Varie as relações lógicas.`);
    } else {
      obs.push(`Conectivos de ${funcoesUsadas.length} tipos: ${funcoesUsadas.map(([f]) => f).join(', ')}.`);
    }

    // início de parágrafo repetido
    const iniciais = paragrafos.map((p) => normalizar(p.split(/\s+/)[0] ?? ''));
    const repetidasIniciais = iniciais.filter((x, i) => x && iniciais.indexOf(x) !== i);
    if (repetidasIniciais.length) {
      nota -= 0.5;
      apontamentos.push({
        tipo: 'sugestao',
        titulo: 'Parágrafos começam igual',
        detalhe: `Mais de um parágrafo começa com "${repetidasIniciais[0]}". Troque por outro conectivo para marcar progressão.`,
      });
    }

    // repetição de vocabulário
    const freq = new Map<string, number>();
    for (const p of palavrasLista) {
      const n = normalizar(p);
      if (n.length < 5 || STOPWORDS.has(n)) continue;
      freq.set(n, (freq.get(n) ?? 0) + 1);
    }
    const repetidas = [...freq.entries()]
      .filter(([, n]) => n >= 4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (repetidas.length) {
      nota -= Math.min(1, repetidas.length * 0.3);
      obs.push(`Palavras repetidas: ${repetidas.map(([p, n]) => `${p} (${n}×)`).join(', ')}.`);
      apontamentos.push({
        tipo: 'sugestao',
        titulo: 'Repetição de vocabulário',
        detalhe: `Troque por sinônimos ou retome por pronome: ${repetidas.map(([p, n]) => `"${p}" aparece ${n} vezes`).join('; ')}.`,
      });
    }

    if (totalConectivos >= 6 && funcoesUsadas.length >= 4 && !repetidas.length) {
      apontamentos.push({
        tipo: 'elogio',
        titulo: 'Boa amarração entre as partes',
        detalhe: 'Os conectivos variam e não há repetição excessiva de vocabulário.',
      });
    }

    criterios.push({
      id: 'coesao',
      nome: 'Coesão e coerência',
      descricao: 'Conectivos variados entre parágrafos e períodos, sem repetição de vocabulário.',
      nota: Math.max(0, Math.min(4, nota)),
      maximo: 4,
      observacoes: obs,
    });
  }

  // ---------- 5. Norma-padrão e registro ----------
  {
    const obs: string[] = [];
    let nota = 4;

    for (const d of DESVIOS) {
      const achados = textoBruto.match(d.regex);
      if (!achados) continue;

      // "onde" e "mau" geram alerta, não erro, porque dependem do contexto
      const suave = /onde|mau|espaços/.test(d.titulo);
      nota -= suave ? 0.25 : 0.5;
      apontamentos.push({
        tipo: suave ? 'alerta' : 'erro',
        titulo: d.titulo,
        detalhe: d.detalhe,
        trecho: achados.slice(0, 3).join(' · ').trim() || undefined,
      });
    }

    const oral = contar(texto, ORALIDADE);
    if (oral.length) {
      nota -= Math.min(1, oral.length * 0.3);
      apontamentos.push({
        tipo: 'erro',
        titulo: 'Marcas de oralidade',
        detalhe: `Expressões de fala não cabem no registro formal: ${oral.slice(0, 4).join(', ')}.`,
      });
    }

    const pessoal = contar(texto, PRIMEIRA_PESSOA);
    if (pessoal.length) {
      nota -= 0.5;
      apontamentos.push({
        tipo: 'alerta',
        titulo: 'Primeira pessoa / opinião pessoal',
        detalhe: `O texto dissertativo pede impessoalidade. Troque "${pessoal[0]}" por construções como "é possível afirmar que" ou "evidencia-se que".`,
      });
    }

    const cliche = contar(texto, CLICHES);
    if (cliche.length) {
      nota -= Math.min(0.75, cliche.length * 0.25);
      apontamentos.push({
        tipo: 'sugestao',
        titulo: 'Clichês de redação',
        detalhe: `Expressões desgastadas não contam como repertório: ${cliche.slice(0, 3).join(', ')}. Troque por contextualização concreta.`,
      });
    }

    if (mediaPalavrasPorPeriodo > 38) {
      nota -= 0.5;
      obs.push(`Período médio de ${mediaPalavrasPorPeriodo} palavras: frases longas demais aumentam o risco de erro de pontuação.`);
      apontamentos.push({
        tipo: 'sugestao',
        titulo: 'Períodos longos',
        detalhe: 'Quebre as frases mais longas em duas. Períodos de 15 a 25 palavras são mais seguros.',
      });
    } else if (periodos > 0 && mediaPalavrasPorPeriodo < 10) {
      nota -= 0.5;
      obs.push('Períodos muito curtos deixam o texto telegráfico; combine ideias com conectivos.');
    } else if (periodos > 0) {
      obs.push(`Período médio de ${mediaPalavrasPorPeriodo} palavras — bom equilíbrio.`);
    }

    if (diversidade >= 55) obs.push(`Diversidade de vocabulário de ${diversidade}% — boa.`);
    else if (palavras > 100) obs.push(`Diversidade de vocabulário de ${diversidade}% — procure variar mais as palavras.`);

    criterios.push({
      id: 'norma',
      nome: 'Norma-padrão e registro',
      descricao: 'Formalidade, impessoalidade e desvios detectáveis de escrita.',
      nota: Math.max(0, Math.min(4, nota)),
      maximo: 4,
      observacoes: obs,
    });
  }

  const nota = Math.round(criterios.reduce((a, c) => a + c.nota, 0) * 2) / 2;

  // ordena: erro > alerta > sugestão > elogio
  const peso = { erro: 0, alerta: 1, sugestao: 2, elogio: 3 } as const;
  apontamentos.sort((a, b) => peso[a.tipo] - peso[b.tipo]);

  return {
    palavras,
    linhas: Math.ceil(palavras / 11),
    paragrafos: paragrafos.length,
    periodos,
    mediaPalavrasPorPeriodo,
    diversidade,
    nota,
    maximo: 20,
    criterios,
    apontamentos,
  };
}
