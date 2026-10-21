/** Cronogramas transcritos da apostila (cap. "Como usar" e cap. 12). */

export type WeekBlock = {
  weeks: string;
  focus: string;
  review: string;
  disciplines: string[];
};

export const PLAN_12: WeekBlock[] = [
  {
    weeks: '1–2',
    focus: 'Direito Constitucional (artigos indicados) + Português (interpretação e sintaxe)',
    review: 'Flashcards diários',
    disciplines: ['direito-constitucional', 'lingua-portuguesa'],
  },
  {
    weeks: '3–4',
    focus: 'Direito Penal Comum (parte geral) + Informática',
    review: 'Constitucional',
    disciplines: ['direito-penal-comum', 'informatica'],
  },
  {
    weeks: '5–6',
    focus: 'Direito Penal Militar (CPM, Títulos I–VIII) + Penal parte especial',
    review: 'Penal comum',
    disciplines: ['direito-penal-militar', 'direito-penal-comum'],
  },
  {
    weeks: '7–8',
    focus: 'Legislação Institucional (as 8 normas) — dobre o tempo aqui',
    review: 'CPM',
    disciplines: ['legislacao-institucional'],
  },
  {
    weeks: '9',
    focus: 'Legislação Especial (as 11 leis)',
    review: 'Institucional',
    disciplines: ['legislacao-especial'],
  },
  {
    weeks: '10',
    focus: 'Processo Penal + Legislação de Trânsito (artigos indicados)',
    review: 'Legislação Especial',
    disciplines: ['direito-processual-penal', 'legislacao-transito'],
  },
  {
    weeks: '11',
    focus: 'Redação: Ordem Pública (3 temas) — 1 redação a cada 2 dias',
    review: 'Geral',
    disciplines: ['redacao'],
  },
  {
    weeks: '12',
    focus: 'Simulados completos de 60 questões cronometrados + revisão de erros',
    review: 'Tudo',
    disciplines: [],
  },
];

export type DayBlock = {
  range: string;
  days: number[];
  morning: string;
  night: string;
};

export const PLAN_30: DayBlock[] = [
  {
    range: 'Dias 1–7',
    days: [1, 2, 3, 4, 5, 6, 7],
    morning: 'Legislação Institucional — leitura integral das 8 normas',
    night: 'Questões de Constitucional + 1 redação',
  },
  {
    range: 'Dias 8–12',
    days: [8, 9, 10, 11, 12],
    morning: 'CPM (Parte Geral e Títulos II e III da Especial)',
    night: 'Português: concordância, crase, conectivos',
  },
  {
    range: 'Dias 13–17',
    days: [13, 14, 15, 16, 17],
    morning: 'Legislação Especial — as 11 leis, por fichas',
    night: 'Informática + questões de Penal',
  },
  {
    range: 'Dias 18–22',
    days: [18, 19, 20, 21, 22],
    morning: 'Processo Penal (prisões e provas) + CTB (crimes)',
    night: 'Revisão de Institucional (2ª leitura) + 1 redação',
  },
  {
    range: 'Dias 23–27',
    days: [23, 24, 25, 26, 27],
    morning: 'Simulados completos de 60 questões, cronometrados',
    night: 'Correção detalhada dos erros, refazendo a teoria',
  },
  {
    range: 'Dias 28–29',
    days: [28, 29],
    morning: 'Revisão apenas dos seus erros anotados e dos quadros de números',
    night: 'Leitura dos mnemônicos e tabelas da apostila',
  },
  {
    range: 'Dia 30',
    days: [30],
    morning: 'Descanso, confira documentos e local de prova',
    night: 'Durma cedo',
  },
];

export const BANCA_TIPS = [
  'Letra de lei: a banca troca prazos, números, competências e sujeitos. Decorar números é obrigatório.',
  'Trocas de palavras-chave: "poderá" ↔ "deverá"; "pode" ↔ "deve"; "até" ↔ "no mínimo"; "qualquer pessoa" ↔ "o ofendido".',
  'Generalizações falsas: "sempre", "nunca", "em nenhuma hipótese", "todo" — quase sempre erram, porque o Direito trabalha com exceções.',
  'Exceções invertidas: a banca apresenta a exceção como se fosse a regra.',
  'Em Informática e Português, questões de aplicação prática (atalhos, funções, concordância em frase dada).',
  'Técnica das 3 leituras: (1) leia o enunciado inteiro; (2) grife o verbo e o número; (3) elimine as alternativas com termos absolutos.',
];

export const GOLDEN_RULE =
  'Regra de ouro: 60% do tempo em questões, 40% em teoria. Quem só lê, esquece; quem erra e revisa, aprende.';
