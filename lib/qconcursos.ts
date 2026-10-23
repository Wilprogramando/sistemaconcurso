/**
 * Links de treino no QConcursos, já filtrados por matéria e pela banca do
 * nosso concurso (INSTITUTO AOCP).
 *
 * A busca do site é por id de disciplina: `discipline_ids[]`. Duas matérias
 * da nossa apostila não têm disciplina própria lá e vão pelo caminho da
 * disciplina equivalente, anotado caso a caso.
 */

const BASE = 'https://www.qconcursos.com/questoes-militares';

/** INSTITUTO AOCP, a banca do edital 002/CCP/2026 */
export const BANCA_AOCP = 379;

type Alvo = {
  /** ids de disciplina no QConcursos */
  ids?: number[];
  /** quando a disciplina só existe como caminho, e não como id */
  caminho?: string;
  /** o que muda em relação à nossa matéria, mostrado na dica do botão */
  observacao?: string;
};

/** nossa matéria (slug) → filtro no QConcursos */
const ALVOS: Record<string, Alvo> = {
  'direito-constitucional': { ids: [3] },
  'lingua-portuguesa': { ids: [1] },
  informatica: { ids: [46] },
  'direito-penal-comum': { ids: [9] },
  'direito-processual-penal': { ids: [10] },
  'direito-penal-militar': { ids: [203, 204] },
  'legislacao-especial': {
    // o site guarda as leis especiais dentro de Direito Penal
    ids: [9],
    observacao: 'no QConcursos as leis especiais ficam dentro de Direito Penal',
  },
  'legislacao-transito': {
    caminho: 'disciplinas/direito-legislacao-de-transito',
  },
  'legislacao-institucional': {
    // lá a matéria se chama Legislação Estadual
    ids: [61],
    observacao: 'no QConcursos a matéria se chama Legislação Estadual',
  },
};

export type LinkQConcursos = { url: string; observacao?: string };

/**
 * Endereço do treino da matéria. Devolve `null` para o que não tem questões
 * de múltipla escolha, como a redação.
 */
export function linkQConcursos(slug: string): LinkQConcursos | null {
  const alvo = ALVOS[slug];
  if (!alvo) return null;

  const params = new URLSearchParams();
  for (const id of alvo.ids ?? []) params.append('discipline_ids[]', String(id));
  params.append('examining_board_ids[]', String(BANCA_AOCP));
  params.append('exclude_nullified', 'true'); // sem questão anulada
  params.append('exclude_outdated', 'true'); // sem questão desatualizada

  const caminho = alvo.caminho ? `${alvo.caminho}/questoes` : 'questoes';
  return { url: `${BASE}/${caminho}?${params}`, observacao: alvo.observacao };
}
