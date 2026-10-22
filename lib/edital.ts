/**
 * Resumo do Edital de Concurso Público nº 002/CCP/2026 – CFP (PMSC, Instituto
 * AOCP), cargo Soldado do Quadro de Praças Policial Militar (QPPM).
 *
 * Tudo aqui foi lido do PDF oficial, que fica em public/edital-002-2026.pdf e
 * pode ser aberto pela própria tela. Em caso de divergência, vale o PDF.
 */

export const EDITAL = {
  numero: 'Edital nº 002/CCP/2026 – CFP',
  cargo: 'Soldado do Quadro de Praças Policial Militar (QPPM)',
  codigoCargo: '401',
  banca: 'Instituto AOCP',
  orgao: 'Polícia Militar de Santa Catarina — CESIEP',
  arquivo: '/edital-002-2026.pdf',
  processo: 'PMSC 00057417/2026',
  validade: '1 ano a contar da homologação, prorrogável por igual período',
} as const;

export const NUMEROS = [
  { rotulo: 'Vagas', valor: '500', detalhe: 'sem divisão por sexo e sem vagas para PcD' },
  { rotulo: 'Remuneração inicial', valor: 'R$ 8.505,00', detalhe: '+ R$ 550,00 de auxílio-alimentação' },
  { rotulo: 'Taxa de inscrição', valor: 'R$ 200,00', detalhe: 'inscrições de 26/10 a 16/11/2026' },
  { rotulo: 'Prova objetiva', valor: '60 questões', detalhe: '5 alternativas, 1 correta · 60 pontos' },
  { rotulo: 'Redação', valor: '20 pontos', detalhe: 'mínimo de 10,00 para não ser eliminado' },
  { rotulo: 'Duração da prova', valor: '5 horas', detalhe: 'objetiva + redação no mesmo dia' },
] as const;

/** Tabela 8.1 — o que vale mais ponto. Cada questão vale 1,00. */
export const PESOS = [
  { disciplina: 'Legislação Institucional', area: 'Legislação', questoes: 10, slug: 'legislacao-institucional' },
  { disciplina: 'Direito Constitucional', area: 'Direito', questoes: 8, slug: 'direito-constitucional' },
  { disciplina: 'Língua Portuguesa', area: 'Conhecimentos Comuns', questoes: 8, slug: 'lingua-portuguesa' },
  { disciplina: 'Direito Penal Comum', area: 'Direito', questoes: 6, slug: 'direito-penal-comum' },
  { disciplina: 'Direito Processual Penal Comum', area: 'Direito', questoes: 6, slug: 'direito-processual-penal' },
  { disciplina: 'Direito Penal Militar', area: 'Direito', questoes: 6, slug: 'direito-penal-militar' },
  { disciplina: 'Legislação Especial', area: 'Legislação', questoes: 6, slug: 'legislacao-especial' },
  { disciplina: 'Legislação de Trânsito', area: 'Legislação', questoes: 5, slug: 'legislacao-transito' },
  { disciplina: 'Informática', area: 'Conhecimentos Comuns', questoes: 5, slug: 'informatica' },
] as const;

export const AREAS = [
  { area: 'Direito', questoes: 26, disciplinas: 4 },
  { area: 'Legislação', questoes: 21, disciplinas: 3 },
  { area: 'Conhecimentos Comuns', questoes: 13, disciplinas: 2 },
] as const;

export const FASES = [
  {
    fase: '1ª fase',
    nome: 'Prova objetiva e prova de redação',
    carater: 'Eliminatório e classificatório',
    detalhe:
      '60 questões de múltipla escolha (60 pontos) e uma redação dissertativa de ordem pública (20 pontos), aplicadas no mesmo dia, em 5 horas.',
  },
  {
    fase: '2ª fase',
    nome: 'Exame de saúde, exame toxicológico, TAF e investigação social',
    carater: 'Eliminatório',
    detalhe:
      'Avaliação médica e odontológica, exame toxicológico de larga janela de detecção, Teste de Aptidão Física em Florianópolis e investigação social pela Agência de Inteligência da PMSC.',
  },
  {
    fase: '3ª fase',
    nome: 'Exame de avaliação psicológica',
    carater: 'Eliminatório',
    detalhe: 'Testes psicotécnicos e entrevista, conforme o perfil profissiográfico da PMSC.',
  },
  { fase: '4ª fase', nome: 'Entrega de documentos', carater: 'Eliminatório', detalhe: 'Conforme o item 21 do edital.' },
  {
    fase: '5ª fase',
    nome: 'Inclusão e matrícula no CFP',
    carater: '—',
    detalhe: 'Curso de Formação de Praças na ESFAP/Academia de Polícia Militar da Trindade, em Florianópolis.',
  },
] as const;

export const CORTES = [
  {
    titulo: 'Para passar na objetiva',
    regra: 'No mínimo 50% do total de pontos da etapa (30 de 60) e nenhuma área de conhecimento zerada.',
  },
  {
    titulo: 'Para ter a redação corrigida',
    regra: 'Estar entre os 2.000 primeiros classificados na objetiva (empatados na última posição entram juntos). Fora disso, eliminado mesmo com a nota mínima.',
  },
  { titulo: 'Para passar na redação', regra: 'Nota igual ou superior a 10,00 dos 20,00 pontos.' },
  {
    titulo: 'Para ser convocado ao TAF',
    regra: 'Estar classificado até 3 vezes o número de vagas (1.500), pela soma de objetiva + redação.',
  },
  {
    titulo: 'Nota final',
    regra: 'NF = (NFPO + NFPR) ÷ 8, numa escala de 0 a 10. Desempate: maior idade, depois maior nota na objetiva, na redação, em Direito, em Legislação, em Conhecimentos Comuns e, por fim, ter sido jurado.',
  },
] as const;

export const REDACAO = {
  pontos: '20,00 pontos, mínimo de 10,00',
  tipo: 'Dissertação argumentativa a partir de textos motivadores',
  linhas: 'De 20 a 30 linhas, à mão, caneta azul ou preta',
  formula: 'NPR = NC − 1 × (NE ÷ TL), onde NC é o conteúdo, NE o número de erros e TL as linhas escritas',
  temas: [
    'Sistema de justiça criminal',
    'Políticas públicas de ordem pública e cidadania',
    'Ordem pública na Constituição Federal de 1988',
    'Competências das Polícias Militares',
    'Polícia Militar como força auxiliar e reserva do Exército',
    'Polícia Militar organizada com base na hierarquia e disciplina',
  ],
  penalidades:
    'Cada linha a menos que o mínimo desconta 0,20 ponto. Texto identificado, fora do local apropriado ou acima de 30 linhas é desconsiderado.',
} as const;

export const REQUISITOS = [
  'Nacionalidade brasileira e idade mínima de 18 anos completos até a inclusão.',
  'Não ter completado 30 anos até o último dia de inscrição.',
  'Nível superior em qualquer área (bacharelado, licenciatura ou tecnólogo reconhecido pelo MEC).',
  'CNH válida.',
  'Altura mínima de 1,60 m (masculino) e 1,55 m (feminino); peso proporcional pelo IMC da OMS.',
  'Estar em dia com o serviço militar obrigatório (sexo masculino).',
  'Não ter condenação por crime doloso com trânsito em julgado.',
  'Ser aprovado em todas as fases: escolaridade, saúde, investigação social, TAF e avaliação psicológica.',
] as const;

export const TAF = [
  { teste: 'Flexão na barra fixa (masculino)', minimo: '3 flexões', eliminado: '0 a 2 flexões' },
  { teste: 'Desenvolvimento com halteres de 10 kg (feminino)', minimo: '21 repetições', eliminado: '0 a 20' },
  { teste: 'Flexão abdominal remador (1 minuto)', minimo: '30 (masc.) · 25 (fem.)', eliminado: 'abaixo disso' },
  { teste: 'Apoio em quatro tempos (meio-sugado)', minimo: '16 (masc.) · 11 (fem.)', eliminado: '15 ou menos / 10 ou menos' },
  { teste: 'Corrida de velocidade de 100 m', minimo: 'até 17,5 s (masc.) · 19,0 s (fem.)', eliminado: '17,6 s / 19,1 s ou mais' },
  { teste: 'Teste de Cooper (12 minutos)', minimo: '2.400 m (masc.) · 1.970 m (fem.)', eliminado: 'abaixo da distância' },
] as const;

export const CRONOGRAMA: { data: string; evento: string; destaque?: boolean }[] = [
  { data: '26/10 a 16/11/2026', evento: 'Inscrições e pagamento da taxa', destaque: true },
  { data: '26/10 a 28/10/2026', evento: 'Pedido de isenção da taxa' },
  { data: '23/11/2026', evento: 'Divulgação do deferimento das inscrições' },
  { data: '07/12/2026', evento: 'Cartão de informação do candidato (local de prova)' },
  { data: '13/12/2026', evento: 'Prova objetiva e prova de redação', destaque: true },
  { data: '14/12/2026', evento: 'Gabarito preliminar e caderno de questões' },
  { data: '08/01/2027', evento: 'Resultado da objetiva pós-recursos e gabarito definitivo' },
  { data: '22/02 a 05/03/2027', evento: 'Exame de saúde e exame toxicológico' },
  { data: '08/03 a 12/03/2027', evento: 'Teste de Aptidão Física (TAF), em Florianópolis' },
  { data: '23/04/2027', evento: 'Exame de avaliação psicológica' },
  { data: '11/05/2027', evento: 'Resultado final e classificação' },
  { data: '27/05 a 07/06/2027', evento: 'Entrega de documentos, matrícula e inclusão no CFP' },
];

/** Anexo II — o que efetivamente cai, disciplina por disciplina. */
export const CONTEUDO: {
  slug: string;
  disciplina: string;
  questoes: number;
  itens: string[];
}[] = [
  {
    slug: 'legislacao-institucional',
    disciplina: 'Legislação Institucional',
    questoes: 10,
    itens: [
      'Lei estadual nº 6.218/1983 — Estatuto dos Policiais Militares de SC',
      'Portaria nº 009/2001 — Regulamento do Processo Administrativo Disciplinar (PAD) da PMSC',
      'Lei nº 14.751/2023 — Lei Orgânica Nacional das Polícias Militares e Corpos de Bombeiros Militares',
      'LC estadual nº 587/2013 — ingresso nas carreiras militares de SC',
      'LC nº 801/2022 — promoção das praças militares estaduais',
      'LC nº 765/2020 — regime remuneratório dos militares estaduais',
      'Decreto nº 1.601/2021 — Regulamento da Organização Básica da PMSC (Lei nº 6.217/1983)',
      'Lei estadual nº 5.209/1976 — Conselho de Disciplina da PMSC',
    ],
  },
  {
    slug: 'direito-constitucional',
    disciplina: 'Direito Constitucional',
    questoes: 8,
    itens: [
      'Constituição: conceito, estrutura, elementos e classificação',
      'Poder Constituinte',
      'CF/88: arts. 1º a 42, 44 a 100 e 122 a 144',
      'Constituição de Santa Catarina: arts. 1º a 40, 50 a 76, 90 e 105 a 109-C',
    ],
  },
  {
    slug: 'lingua-portuguesa',
    disciplina: 'Língua Portuguesa',
    questoes: 8,
    itens: [
      'Compreensão e interpretação de textos; tipologias e gêneros; funções da linguagem',
      'Semântica: denotação e conotação, sinonímia e antonímia, figuras de linguagem',
      'Morfologia: estrutura e formação das palavras, ortografia, acentuação, classes de palavras',
      'Sintaxe da oração e do período; concordância e regência nominal e verbal; crase',
      'Reescrita de orações e períodos; pontuação; coesão e função textual dos vocábulos',
    ],
  },
  {
    slug: 'direito-penal-comum',
    disciplina: 'Direito Penal Comum',
    questoes: 6,
    itens: [
      'Lei penal: interpretação, analogia, vigência, tempo e lugar do crime, territorialidade',
      'Teoria geral do crime: fato típico, dolo e culpa, erro, iter criminis, tentativa, ilicitude e culpabilidade',
      'Concurso de pessoas; crime e contravenção',
      'Penas: privativa de liberdade, restritivas de direitos e multa; concurso de crimes; sursis; livramento condicional',
      'Extinção da punibilidade',
      'Parte especial: crimes contra a pessoa, o patrimônio, a dignidade sexual, a fé pública e a administração pública',
      'Lei nº 9.605/1998 — crimes ambientais; súmulas e jurisprudência dos tribunais superiores',
    ],
  },
  {
    slug: 'direito-processual-penal',
    disciplina: 'Direito Processual Penal Comum',
    questoes: 6,
    itens: [
      'Princípios, sistemas processuais e aplicação da lei processual',
      'Inquérito policial, acordo de não persecução penal e controle externo da atividade policial',
      'Ação penal e ação civil ex delicto; jurisdição e competência',
      'Provas: teoria geral, meios de prova e de obtenção de prova',
      'Prisões e medidas cautelares pessoais e reais; liberdade provisória',
      'Procedimento comum, nulidades, sentença e recursos',
      'Leis nº 7.960/1989 (prisão temporária), 9.099/1995 (juizados) e 9.296/1996 (interceptação)',
    ],
  },
  {
    slug: 'direito-penal-militar',
    disciplina: 'Direito Penal Militar',
    questoes: 6,
    itens: ['Decreto-Lei nº 1.001/1969: Parte Geral (Títulos I a VIII) e Parte Especial (Títulos I a VIII)'],
  },
  {
    slug: 'legislacao-especial',
    disciplina: 'Legislação Especial',
    questoes: 6,
    itens: [
      'Lei nº 8.072/1990 — crimes hediondos',
      'Lei nº 7.716/1989 — crimes de preconceito de raça ou cor',
      'Lei nº 9.455/1997 — crimes de tortura',
      'Lei nº 12.850/2013 — organização criminosa',
      'Lei nº 11.343/2006 — drogas',
      'Lei nº 13.869/2019 — abuso de autoridade',
      'Lei nº 10.826/2003 — Estatuto do Desarmamento',
      'Lei nº 11.340/2006 — Maria da Penha',
      'Lei nº 8.069/1990 — ECA',
      'Lei nº 10.741/2003 — Estatuto do Idoso',
      'Lei nº 12.037/2009 — identificação criminal',
    ],
  },
  {
    slug: 'legislacao-transito',
    disciplina: 'Legislação de Trânsito',
    questoes: 5,
    itens: [
      'Lei nº 9.503/1997 (CTB): arts. 1º a 4º; art. 23; arts. 26 a 67; arts. 80 a 90',
      'CTB: arts. 96 a 102; arts. 114 a 160',
      'CTB: arts. 256 a 279-A; art. 280; arts. 291 a 312-B',
    ],
  },
  {
    slug: 'informatica',
    disciplina: 'Informática',
    questoes: 5,
    itens: [
      'Conceitos de hardware e software',
      'LibreOffice 7 em português: textos, planilhas e apresentações',
      'Windows 11 em português',
      'Nuvem, colaboração e LGPD (Lei nº 13.709/2018)',
      'Navegadores Edge, Chrome e Firefox; correio eletrônico',
      'Segurança: vírus, worms e antivírus',
    ],
  },
];

/** Leitura estratégica dos pesos — o que rende mais ponto por hora de estudo. */
export const ESTRATEGIA = [
  'Legislação Institucional sozinha vale 10 das 60 questões (16,7%) e é a única matéria exclusiva da PMSC: ninguém chega sabendo, e é onde a diferença se faz.',
  'A área de Direito soma 26 questões (43,3%) e a de Legislação, 21 (35%). Juntas são 47 das 60 — quase 4 de cada 5 pontos da objetiva.',
  'Constitucional e Português valem 8 cada. Português cai em toda prova e ainda sustenta a redação, que vale 20 pontos.',
  'Informática e Trânsito valem 5 cada, mas são os conteúdos mais fechados do edital: dá para esgotar os artigos e os tópicos listados.',
  'Nenhuma área pode zerar. Mesmo a matéria que você menos gosta precisa de acerto mínimo — zerar uma área elimina, ainda que a soma passe de 50%.',
  'A redação vale 20 dos 80 pontos (25% do total) e só é corrigida até a 2.000ª posição. Treinar dissertação de ordem pública é tão rentável quanto questão.',
] as const;
