/**
 * Temas de redação, todos dentro do recorte do edital: ORDEM PÚBLICA.
 * Os três primeiros são os propostos pela apostila; os demais foram montados
 * a partir dos mesmos eixos de repertório (sistema de justiça criminal,
 * políticas públicas de ordem pública e cidadania, art. 144 da CF).
 */

export type Tema = {
  id: string;
  titulo: string;
  eixo: 'justiça criminal' | 'políticas públicas' | 'ordem pública na CF';
  motivador: string;
  repertorio: string[];
  origem: 'apostila' | 'sistema';
};

export const TEMAS: Tema[] = [
  {
    id: 'policia-ostensiva-cidada',
    titulo: 'O papel da polícia ostensiva na construção de uma segurança pública cidadã',
    eixo: 'políticas públicas',
    motivador:
      'A Constituição Federal atribui às polícias militares a polícia ostensiva e a preservação da ordem pública. Ao mesmo tempo, o paradigma da segurança cidadã desloca o foco da repressão pura para a prevenção integrada, articulando segurança com educação, saúde, urbanismo e assistência social.',
    repertorio: [
      'Art. 144, §5º, da CF: polícia ostensiva e preservação da ordem pública.',
      'Lei 13.675/2018 — SUSP e a Política Nacional de Segurança Pública e Defesa Social.',
      'Policiamento comunitário e de proximidade: territorialização e corresponsabilização.',
      'Uso progressivo e diferenciado da força como condição de legitimidade.',
    ],
    origem: 'apostila',
  },
  {
    id: 'hierarquia-disciplina-legitimidade',
    titulo:
      'Hierarquia e disciplina: anacronismo ou condição de legitimidade do uso da força pelo Estado?',
    eixo: 'ordem pública na CF',
    motivador:
      'Hierarquia e disciplina são os pilares das instituições militares (arts. 42 e 142, §3º, da CF). Há quem os veja como resquício autoritário; há quem os defenda como mecanismo de previsibilidade e de contenção do arbítrio no uso da força.',
    repertorio: [
      'Arts. 42 e 142, §3º, da CF: pilares da organização militar.',
      'Hierarquia é a ordenação da autoridade por postos e graduações; disciplina é o cumprimento do dever.',
      'A ordem manifestamente ilegal nunca obriga: a disciplina não ampara o crime.',
      'Controle externo da atividade policial pelo Ministério Público (art. 129, VII, da CF).',
    ],
    origem: 'apostila',
  },
  {
    id: 'integracao-justica-criminal',
    titulo:
      'Integração do sistema de justiça criminal como caminho para a redução da impunidade',
    eixo: 'justiça criminal',
    motivador:
      'O sistema de justiça criminal reúne três subsistemas — policial, de justiça e de execução penal. A fragmentação entre eles, somada à cifra oculta e às baixas taxas de elucidação, alimenta a sensação de impunidade.',
    repertorio: [
      'Subsistemas: policial, de justiça e de execução penal.',
      'Cifra oculta: crimes que não chegam a ser notificados.',
      'Baixa taxa de elucidação de homicídios no Brasil.',
      'Gestão por evidências: análise criminal, hot spots, metas e indicadores.',
    ],
    origem: 'apostila',
  },
  {
    id: 'prevencao-e-reincidencia',
    titulo: 'Prevenção e redução da reincidência criminal: por onde o Estado deve começar?',
    eixo: 'políticas públicas',
    motivador:
      'A prevenção costuma ser dividida em primária (sobre causas sociais), secundária (sobre grupos de risco) e terciária (sobre quem já delinquiu). A escolha de onde investir define o resultado da política de segurança a médio prazo.',
    repertorio: [
      'Prevenção primária, secundária e terciária.',
      'Superlotação carcerária e o papel do subsistema de execução penal.',
      'Programas de egressos e a reinserção pelo trabalho e pela educação.',
      'Segurança cidadã: segurança articulada com educação, saúde e assistência social.',
    ],
    origem: 'sistema',
  },
  {
    id: 'confianca-na-policia',
    titulo: 'Confiança da população na polícia como condição de eficácia da segurança pública',
    eixo: 'ordem pública na CF',
    motivador:
      'O art. 144 define a segurança pública como dever do Estado, mas também direito e responsabilidade de todos. Sem confiança da população, a notificação de crimes cai, a cooperação diminui e a atuação policial perde eficácia.',
    repertorio: [
      'Art. 144, caput, da CF: dever do Estado, direito e responsabilidade de todos.',
      'Cifra oculta e subnotificação como consequência da desconfiança.',
      'Urbanidade no trato, identificação funcional e prestação de contas.',
      'Ouvidorias e corregedorias como instrumentos de controle e de legitimidade.',
    ],
    origem: 'sistema',
  },
  {
    id: 'tecnologia-e-direitos',
    titulo:
      'Tecnologia na segurança pública: eficiência policial e proteção de direitos podem caminhar juntas?',
    eixo: 'políticas públicas',
    motivador:
      'Câmeras corporais, videomonitoramento, reconhecimento facial e análise de dados ampliaram a capacidade operacional das polícias. Ao mesmo tempo, levantam questões sobre privacidade, viés algorítmico e limites do tratamento de dados pessoais.',
    repertorio: [
      'LGPD (Lei 13.709/2018) e a exceção do art. 4º, III, para a segurança pública.',
      'Câmeras corporais: transparência da ação policial e proteção do próprio policial.',
      'Gestão por evidências e mapeamento de hot spots.',
      'Art. 5º, X, da CF: inviolabilidade da intimidade e da vida privada.',
    ],
    origem: 'sistema',
  },
  {
    id: 'ordem-publica-tripartite',
    titulo:
      'Segurança, tranquilidade e salubridade: o conceito de ordem pública diante dos desafios atuais',
    eixo: 'ordem pública na CF',
    motivador:
      'A doutrina clássica define ordem pública como a soma de segurança pública, tranquilidade pública e salubridade pública. Ocorrências de perturbação do sossego, ocupação irregular do espaço urbano e emergências ambientais testam esse conceito no dia a dia da polícia ostensiva.',
    repertorio: [
      'Conceito tripartite de ordem pública (base no Decreto 88.777/1983).',
      'Poder de polícia administrativa e atuação preventiva.',
      'Art. 144, §5º, da CF, e a competência residual das polícias militares.',
      'Integração com os municípios e com a defesa civil.',
    ],
    origem: 'sistema',
  },
  {
    id: 'violencia-domestica-atuacao-pm',
    titulo: 'A atuação da polícia militar no enfrentamento à violência doméstica e familiar',
    eixo: 'justiça criminal',
    motivador:
      'A Lei Maria da Penha criou um microssistema de proteção à mulher, com medidas protetivas de urgência que, muitas vezes, dependem da polícia militar para serem efetivas — tanto no atendimento da ocorrência quanto na fiscalização do cumprimento.',
    repertorio: [
      'Lei 11.340/2006: medidas protetivas de urgência e atendimento especializado.',
      'Súmula 542 do STJ: ação penal incondicionada na lesão corporal.',
      'Patrulha Maria da Penha e o acompanhamento das medidas protetivas.',
      'Art. 226, §8º, da CF: dever do Estado de coibir a violência no âmbito das relações familiares.',
    ],
    origem: 'sistema',
  },
];

export const temaPorId = (id: string) => TEMAS.find((t) => t.id === id) ?? TEMAS[0];

/** Sorteia um tema, evitando repetir o último, se houver. */
export function sortearTema(exceto?: string) {
  const pool = exceto ? TEMAS.filter((t) => t.id !== exceto) : TEMAS;
  return pool[Math.floor(Math.random() * pool.length)];
}
