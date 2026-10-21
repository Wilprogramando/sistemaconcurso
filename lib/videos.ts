/**
 * Menu de vídeo-aulas.
 *
 * Por que não há uma lista fixa de "os mais vistos": o YouTube monta a página
 * por JavaScript, então não há como ler visualizações e curtidas de fora e
 * congelar um ranking — e um ranking congelado envelhece em semanas. A solução
 * aqui é mandar você direto para a busca do YouTube JÁ ORDENADA POR NÚMERO DE
 * VISUALIZAÇÕES, com a consulta certa para cada tema. O ranking é calculado
 * pelo próprio YouTube, na hora, e nunca fica desatualizado.
 *
 * As indicações nominais abaixo vieram de busca na web; confira antes de
 * investir tempo, porque vídeo sai do ar e título muda.
 */

/** Filtro do YouTube: tipo vídeo + ordenar por número de visualizações. */
const ORDENAR_POR_VISUALIZACOES = 'CAMSAhAB';

export function buscaYoutube(consulta: string, ordenarPorViews = true) {
  const base = `https://www.youtube.com/results?search_query=${encodeURIComponent(consulta)}`;
  return ordenarPorViews ? `${base}&sp=${ORDENAR_POR_VISUALIZACOES}` : base;
}

export type Indicacao = {
  titulo: string;
  url: string;
  canal?: string;
};

export type GuiaDeVideo = {
  slug: string;
  /** consultas prontas, da mais geral para a mais específica */
  buscas: { rotulo: string; consulta: string }[];
  canais: string[];
  indicacoes: Indicacao[];
  nota?: string;
};

export const VIDEOS: GuiaDeVideo[] = [
  {
    slug: 'direito-constitucional',
    buscas: [
      { rotulo: 'Curso completo', consulta: 'direito constitucional para concursos aula completa' },
      { rotulo: 'Art. 5º — direitos fundamentais', consulta: 'artigo 5 constituição direitos e garantias fundamentais concurso' },
      { rotulo: 'Art. 144 — segurança pública', consulta: 'artigo 144 segurança pública constituição concurso polícia militar' },
      { rotulo: 'Questões comentadas', consulta: 'questões comentadas direito constitucional concurso polícia militar' },
    ],
    canais: ['Estratégia Concursos', 'Gran Cursos Online', 'AlfaCon', 'Direção Concursos'],
    indicacoes: [
      {
        titulo: 'Direito Constitucional do Zero: aula completa do básico ao avançado',
        url: 'https://www.youtube.com/watch?v=oUSD07Rif2k',
      },
      {
        titulo: 'Direito Constitucional para Concursos — Curso Completo, Aula 1',
        url: 'https://www.youtube.com/watch?v=6oyr7Wzuvxw',
      },
      {
        titulo: 'Direito Constitucional para Concursos — Aula 1/3',
        url: 'https://www.youtube.com/watch?v=V1CVmRqdPBw',
        canal: 'AlfaCon',
      },
    ],
  },
  {
    slug: 'direito-penal-comum',
    buscas: [
      { rotulo: 'Curso completo', consulta: 'direito penal para concursos aula completa parte geral' },
      { rotulo: 'Teoria do crime', consulta: 'teoria do crime fato típico ilicitude culpabilidade concurso' },
      { rotulo: 'Crimes contra o patrimônio', consulta: 'furto roubo extorsão direito penal concurso aula' },
      { rotulo: 'Crimes contra a administração', consulta: 'peculato concussão corrupção passiva crimes funcionais concurso' },
    ],
    canais: ['Estratégia Concursos', 'Gran Cursos Online', 'AlfaCon', 'Professor Evandro Guedes'],
    indicacoes: [
      {
        titulo: 'Aulão de Direito Penal — Concurso PM PI',
        url: 'https://www.youtube.com/watch?v=SWZB5r38_r8',
      },
      {
        titulo: 'Concurso PM MA e PM PI — Direito Penal',
        url: 'https://www.youtube.com/watch?v=XqFhHs7JGZc',
      },
    ],
  },
  {
    slug: 'direito-processual-penal',
    buscas: [
      { rotulo: 'Curso completo', consulta: 'direito processual penal para concursos aula completa' },
      { rotulo: 'Inquérito policial', consulta: 'inquérito policial características prazos concurso aula' },
      { rotulo: 'Prisões e cautelares', consulta: 'prisão em flagrante preventiva temporária concurso aula' },
      { rotulo: 'Provas e busca pessoal', consulta: 'provas processo penal busca pessoal domiciliar concurso' },
    ],
    canais: ['Estratégia Concursos', 'Gran Cursos Online', 'AlfaCon'],
    indicacoes: [
      {
        titulo: 'Concurso Polícia Militar AL — Direito Processual Penal',
        url: 'https://www.youtube.com/watch?v=llCm20Pv-wA',
      },
    ],
  },
  {
    slug: 'direito-penal-militar',
    buscas: [
      { rotulo: 'Curso completo de CPM', consulta: 'direito penal militar CPM concurso aula completa' },
      { rotulo: 'Crime militar — art. 9º', consulta: 'artigo 9 código penal militar crime militar concurso' },
      { rotulo: 'Motim, revolta e deserção', consulta: 'motim revolta deserção código penal militar aula' },
      { rotulo: 'CPM × Código Penal comum', consulta: 'diferenças código penal militar e código penal comum concurso' },
    ],
    canais: ['AlfaCon', 'Estratégia Concursos', 'Gran Cursos Online'],
    indicacoes: [
      {
        titulo: 'Aula de Direito Penal Militar — Concurso PM MG',
        url: 'https://www.youtube.com/watch?v=q2Z40JgjrMo',
        canal: 'AlfaCon',
      },
      {
        titulo: 'Concurso PM PB Soldado — Direito Penal Militar, Parte I',
        url: 'https://www.youtube.com/watch?v=Tv0kDqP2y0I',
      },
      {
        titulo: 'Saber Direito — Direito Penal Militar',
        url: 'https://www.youtube.com/watch?v=hBlhM84LCss',
        canal: 'TV Justiça',
      },
    ],
  },
  {
    slug: 'legislacao-especial',
    buscas: [
      { rotulo: 'Lei de Drogas', consulta: 'lei de drogas 11343 usuário traficante concurso aula' },
      { rotulo: 'Estatuto do Desarmamento', consulta: 'estatuto do desarmamento posse porte arma concurso aula' },
      { rotulo: 'Lei Maria da Penha', consulta: 'lei maria da penha medidas protetivas concurso aula' },
      { rotulo: 'Abuso de autoridade', consulta: 'lei de abuso de autoridade 13869 concurso policial aula' },
      { rotulo: 'ECA e Pessoa Idosa', consulta: 'ECA estatuto da criança e do adolescente concurso polícia aula' },
    ],
    canais: ['Estratégia Concursos', 'Gran Cursos Online', 'AlfaCon', 'Direção Concursos'],
    indicacoes: [],
    nota: 'São onze leis. Vale buscar uma por uma em vez de procurar uma aula única que cubra tudo.',
  },
  {
    slug: 'legislacao-transito',
    buscas: [
      { rotulo: 'CTB completo', consulta: 'código de trânsito brasileiro CTB concurso aula completa' },
      { rotulo: 'Infrações e penalidades', consulta: 'infrações e penalidades CTB pontuação concurso aula' },
      { rotulo: 'Crimes de trânsito', consulta: 'crimes de trânsito CTB artigos 302 a 312 concurso aula' },
      { rotulo: 'Embriaguez ao volante', consulta: 'embriaguez ao volante artigo 306 CTB concurso aula' },
    ],
    canais: ['Estratégia Concursos', 'Gran Cursos Online', 'AlfaCon'],
    indicacoes: [],
  },
  {
    slug: 'legislacao-institucional',
    buscas: [
      { rotulo: 'Legislação da PMSC', consulta: 'legislação institucional PMSC concurso soldado aula' },
      { rotulo: 'Estatuto dos PM de SC', consulta: 'estatuto policiais militares santa catarina lei 6218 aula' },
      { rotulo: 'Regulamento Disciplinar', consulta: 'regulamento disciplinar polícia militar santa catarina transgressões aula' },
      { rotulo: 'Concurso PMSC 2026', consulta: 'concurso PMSC 2026 soldado legislação institucional' },
    ],
    canais: ['Estratégia Concursos', 'Gran Cursos Online', 'Direção Concursos'],
    indicacoes: [
      {
        titulo: 'Curso de formação e carreira de praça — Concurso Soldado PMSC',
        url: 'https://www.youtube.com/watch?v=if6eBL3pGoo',
      },
    ],
    nota: 'Esta é a disciplina com menos vídeo disponível, justamente porque é 100% legislação de Santa Catarina — e é a que mais vale pontos (10 das 60 questões). Aqui a teoria do sistema e a letra da lei valem mais que vídeo.',
  },
  {
    slug: 'lingua-portuguesa',
    buscas: [
      { rotulo: 'Curso completo', consulta: 'português para concursos aula completa gramática' },
      { rotulo: 'Interpretação de texto', consulta: 'interpretação de texto para concursos aula técnicas' },
      { rotulo: 'Concordância verbal e nominal', consulta: 'concordância verbal e nominal concurso aula completa' },
      { rotulo: 'Crase', consulta: 'crase regras concurso aula completa' },
      { rotulo: 'Pontuação e vírgula', consulta: 'uso da vírgula pontuação concurso aula' },
    ],
    canais: ['Professor Pasquale Cipro Neto', 'Estratégia Concursos', 'Gran Cursos Online', 'AlfaCon'],
    indicacoes: [],
  },
  {
    slug: 'informatica',
    buscas: [
      { rotulo: 'Curso completo', consulta: 'informática para concursos aula completa noções' },
      { rotulo: 'Windows 11', consulta: 'windows 11 para concursos atalhos explorador de arquivos aula' },
      { rotulo: 'LibreOffice Calc e Writer', consulta: 'libreoffice calc writer para concursos aula' },
      { rotulo: 'Segurança da informação', consulta: 'segurança da informação vírus worm malware concurso aula' },
    ],
    canais: ['Estratégia Concursos', 'Gran Cursos Online', 'AlfaCon'],
    indicacoes: [],
  },
  {
    slug: 'redacao',
    buscas: [
      { rotulo: 'Redação dissertativa', consulta: 'redação dissertativa argumentativa concurso polícia militar aula' },
      { rotulo: 'Proposta de intervenção', consulta: 'proposta de intervenção redação como fazer aula' },
      { rotulo: 'Segurança pública — repertório', consulta: 'segurança pública ordem pública repertório redação concurso' },
    ],
    canais: ['Estratégia Concursos', 'Gran Cursos Online'],
    indicacoes: [],
  },
];

export const guiaDe = (slug: string) => VIDEOS.find((v) => v.slug === slug) ?? null;

/** Busca pronta para um tópico específico, com o nome da disciplina de contexto. */
export function buscaDoTopico(disciplina: string, titulo: string) {
  const limpo = titulo.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/—.*$/, '').trim();
  return buscaYoutube(`${limpo} ${disciplina} concurso aula`);
}
