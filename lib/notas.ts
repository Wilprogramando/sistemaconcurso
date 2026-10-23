import { BookMarked, CircleHelp, Hash, Lightbulb, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Tag = 'nota' | 'macete' | 'duvida' | 'numero' | 'lei';

/** PDF anexado: caminho no bucket privado `anotacoes` + nome original */
export type Anexo = { path: string; name: string; size: number };

export type Nota = {
  id: string;
  title: string;
  /** cópia em texto puro do corpo: serve para busca e prévia */
  body: string;
  /** corpo formatado — negrito, cores, links e imagens no meio do texto */
  body_html: string | null;
  discipline_id: number | null;
  topic_id: number | null;
  tag: Tag;
  pinned: boolean;
  /** caminhos no bucket privado `anotacoes` */
  images: string[];
  /** PDFs anexados */
  attachments: Anexo[];
  /** ordem escolhida à mão dentro da matéria; menor vem primeiro */
  position: number;
  /** quando foi para a lixeira; fica nulo enquanto a anotação está em uso */
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * `classe` é o chip suave do formulário, `solido` é a etiqueta preenchida do
 * card e `barra` é a faixa de cor na lateral esquerda dele.
 */
export const TAGS: Record<
  Tag,
  { label: string; icone: LucideIcon; classe: string; solido: string; barra: string }
> = {
  nota: {
    label: 'Nota',
    icone: BookMarked,
    classe: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    solido: 'bg-blue-600 text-white',
    barra: 'bg-blue-500',
  },
  macete: {
    label: 'Macete',
    icone: Lightbulb,
    classe: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900',
    solido: 'bg-emerald-600 text-white',
    barra: 'bg-emerald-500',
  },
  duvida: {
    label: 'Dúvida',
    icone: CircleHelp,
    classe: 'bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
    solido: 'bg-amber-500 text-slate-950',
    barra: 'bg-amber-400',
  },
  numero: {
    label: 'Número',
    icone: Hash,
    classe: 'bg-sky-100 text-sky-900 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900',
    solido: 'bg-sky-600 text-white',
    barra: 'bg-sky-500',
  },
  lei: {
    label: 'Letra de lei',
    icone: Scale,
    classe: 'bg-violet-100 text-violet-900 ring-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-900',
    solido: 'bg-violet-600 text-white',
    barra: 'bg-violet-500',
  },
};

export const ORDEM_TAGS: Tag[] = ['nota', 'macete', 'numero', 'lei', 'duvida'];

/** A tabela vem da migração 0005; sem ela, a tela avisa em vez de quebrar. */
export class NotasIndisponiveis extends Error {
  constructor() {
    super('A tabela notes ainda nao existe');
    this.name = 'NotasIndisponiveis';
  }
}

export const ehTabelaAusente = (mensagem: string) =>
  /notes|schema cache|does not exist/i.test(mensagem);
