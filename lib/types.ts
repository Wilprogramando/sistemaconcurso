export type Priority = 'MAXIMA' | 'ALTA' | 'MEDIA' | 'BAIXA';

export type Discipline = {
  id: number;
  slug: string;
  chapter: number;
  name: string;
  question_count: number;
  weight: number;
  priority: Priority;
};

export type Topic = {
  id: number;
  discipline_id: number;
  ref: string;
  ord: number;
  slug: string;
  title: string;
  body: string;
};

export type Alternativa = { letter: string; text: string };

export type Question = {
  id: number;
  ext_id: string;
  source: 'apostila' | 'simulado' | 'prova' | 'inedita';
  discipline_id: number | null;
  topic_id: number | null;
  number: number;
  /** 'ce' = certo/errado · 'mc' = múltipla escolha A–E · 'open' = discursiva curta */
  kind: 'ce' | 'mc' | 'open';
  options: Alternativa[] | null;
  statement: string;
  /** letra da resposta: C/E nas de certo-errado, A–E nas de múltipla escolha */
  answer: string | null;
  explanation: string;
  origin: 'apostila' | 'prova' | 'inedita';
  origin_label: string | null;
  year: number | null;
  banca: string | null;
  source_url: string | null;
  passage_id: string | null;
  /** preenchidos pela página quando a questão tem texto de apoio */
  passage_label?: string | null;
  passage_body?: string | null;
};

export type Passage = {
  id: string;
  label: string;
  body: string;
  source: string | null;
};

export type DisciplineStats = {
  discipline_id: number;
  slug: string;
  name: string;
  question_count: number;
  weight: number;
  priority: Priority;
  answered: number;
  correct: number;
  accuracy: number | null;
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  MAXIMA: 'Prioridade máxima',
  ALTA: 'Prioridade alta',
  MEDIA: 'Prioridade média',
  BAIXA: 'Prioridade baixa',
};

export const PRIORITY_CLASS: Record<Priority, string> = {
  MAXIMA: 'bg-red-100 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900',
  ALTA: 'bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
  MEDIA: 'bg-sky-100 text-sky-900 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900',
  BAIXA: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
};

/** Classe compartilhada pelos campos de formulário. */
export const INPUT_CLASS =
  'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-900';
