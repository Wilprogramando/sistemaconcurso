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

export type Question = {
  id: number;
  source: 'apostila' | 'simulado';
  discipline_id: number | null;
  topic_id: number | null;
  number: number;
  type: 'ce' | 'open';
  statement: string;
  answer: 'C' | 'E' | null;
  explanation: string;
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
  MAXIMA: 'bg-red-100 text-red-800 ring-red-200',
  ALTA: 'bg-amber-100 text-amber-900 ring-amber-200',
  MEDIA: 'bg-sky-100 text-sky-900 ring-sky-200',
  BAIXA: 'bg-slate-100 text-slate-700 ring-slate-200',
};
