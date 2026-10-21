import {
  BookA,
  Car,
  Cpu,
  FileText,
  Gavel,
  Landmark,
  PenLine,
  Scale,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Identidade visual de cada disciplina: um ícone e uma cor próprios.
 * Serve para bater o olho na grade e reconhecer a matéria sem ler o nome.
 */
export const VISUAL: Record<string, { icone: LucideIcon; tile: string }> = {
  'direito-constitucional': {
    icone: Landmark,
    tile: 'bg-emerald-600 text-white',
  },
  'direito-penal-comum': {
    icone: Gavel,
    tile: 'bg-blue-600 text-white',
  },
  'direito-processual-penal': {
    icone: Scale,
    tile: 'bg-violet-600 text-white',
  },
  'direito-penal-militar': {
    icone: ShieldAlert,
    tile: 'bg-red-600 text-white',
  },
  'legislacao-especial': {
    icone: FileText,
    tile: 'bg-orange-500 text-white',
  },
  'legislacao-transito': {
    icone: Car,
    tile: 'bg-teal-600 text-white',
  },
  'legislacao-institucional': {
    icone: ShieldCheck,
    tile: 'bg-brand-700 text-white',
  },
  'lingua-portuguesa': {
    icone: BookA,
    tile: 'bg-rose-500 text-white',
  },
  informatica: {
    icone: Cpu,
    tile: 'bg-cyan-600 text-white',
  },
  redacao: {
    icone: PenLine,
    tile: 'bg-amber-500 text-white',
  },
};

export const visualDe = (slug: string) =>
  VISUAL[slug] ?? { icone: FileText, tile: 'bg-slate-500 text-white' };
