'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CircleAlert,
  FileText,
  House,
  LayoutGrid,
  ListChecks,
  NotebookPen,
  PenLine,
  Flame,
  RefreshCw,
  MonitorPlay,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Item = {
  href: string;
  label: string;
  curto: string;
  icone: LucideIcon;
  descricao: string;
};

/** Ordem pensada como fluxo de estudo: ler → treinar → revisar → simular → medir. */
export const ESTUDAR: Item[] = [
  {
    href: '/treino',
    label: 'Treino do dia',
    curto: 'Treino',
    icone: Flame,
    descricao: '20 questões sorteadas para hoje',
  },
  {
    href: '/materias',
    label: 'Matérias',
    curto: 'Matérias',
    icone: BookOpen,
    descricao: 'Teoria por tópico, com resumo e progresso',
  },
  {
    href: '/questoes',
    label: 'Questões',
    curto: 'Questões',
    icone: ListChecks,
    descricao: 'Treino com correção comentada',
  },
  {
    href: '/revisao',
    label: 'Revisão',
    curto: 'Revisão',
    icone: RefreshCw,
    descricao: 'O que o sistema marcou para hoje',
  },
  {
    href: '/videos',
    label: 'Vídeo-aulas',
    curto: 'Vídeos',
    icone: MonitorPlay,
    descricao: 'Os mais vistos de cada tema, no YouTube',
  },
];

export const AVALIAR: Item[] = [
  {
    href: '/simulado',
    label: 'Simulado',
    curto: 'Simulado',
    icone: FileText,
    descricao: 'Prova cronometrada, gabarito no fim',
  },
  {
    href: '/redacao',
    label: 'Redação',
    curto: 'Redação',
    icone: PenLine,
    descricao: 'Treino com tema sorteado e correção',
  },
];

export const ACOMPANHAR: Item[] = [
  {
    href: '/anotacoes',
    label: 'Anotações',
    curto: 'Notas',
    icone: NotebookPen,
    descricao: 'Seu caderno livre de macetes e dúvidas',
  },
  {
    href: '/erros',
    label: 'Caderno de erros',
    curto: 'Erros',
    icone: CircleAlert,
    descricao: 'Tudo que você errou, com anotações',
  },
  {
    href: '/plano',
    label: 'Plano',
    curto: 'Plano',
    icone: CalendarDays,
    descricao: 'Cronograma de 12 semanas e reta final',
  },
  {
    href: '/estatisticas',
    label: 'Estatísticas',
    curto: 'Dados',
    icone: BarChart3,
    descricao: 'Evolução, acerto e pontos fracos',
  },
];

export const PAINEL: Item = {
  href: '/dashboard',
  label: 'Painel',
  curto: 'Painel',
  icone: House,
  descricao: 'Resumo do dia e projeção de nota',
};

export const TODOS: Item[] = [PAINEL, ...ESTUDAR, ...AVALIAR, ...ACOMPANHAR];

const ehAtivo = (path: string, href: string) => path === href || path.startsWith(href + '/');

/** Barra inferior fixa (celular): 4 destinos + "Mais". */
export function NavInferior() {
  const path = usePathname();
  const [aberto, setAberto] = useState(false);

  const principais = [PAINEL, ESTUDAR[0], ESTUDAR[1], ESTUDAR[2]];
  const extras = [ESTUDAR[3], ESTUDAR[4], ...AVALIAR, ...ACOMPANHAR];
  const extraAtivo = extras.some((i) => ehAtivo(path, i.href));

  // fecha a gaveta ao navegar
  useEffect(() => {
    setAberto(false);
  }, [path]);

  // trava a rolagem do fundo enquanto a gaveta está aberta
  useEffect(() => {
    document.body.style.overflow = aberto ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [aberto]);

  return (
    <>
      {aberto && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setAberto(false)}
          aria-hidden
        />
      )}

      <div
        role="dialog"
        aria-label="Mais seções"
        aria-modal={aberto}
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-3xl bg-white p-4 shadow-2xl transition-transform duration-200 md:hidden dark:bg-slate-900 ${
          aberto ? 'translate-y-0' : 'pointer-events-none translate-y-full'
        }`}
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Mais seções</h2>
          <button
            type="button"
            onClick={() => setAberto(false)}
            aria-label="Fechar"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        <ul className="grid gap-2 overflow-y-auto overscroll-contain">
          {extras.map(({ href, label, icone: Icone, descricao }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-xl p-3 transition ${
                  ehAtivo(path, href)
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
                    : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 dark:bg-slate-900 dark:text-brand-300">
                  <Icone size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{label}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {descricao}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-700 dark:bg-slate-900/95"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto flex max-w-lg">
          {principais.map(({ href, curto, icone: Icone }) => {
            const ativo = ehAtivo(path, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={ativo ? 'page' : undefined}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[0.68rem] font-medium transition ${
                    ativo ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span
                    className={`rounded-lg px-3 py-1 transition ${
                      ativo ? 'bg-brand-50 dark:bg-brand-950' : ''
                    }`}
                  >
                    <Icone size={19} />
                  </span>
                  <span className="w-full truncate px-0.5 text-center">{curto}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setAberto((a) => !a)}
              aria-expanded={aberto}
              className={`flex w-full flex-col items-center gap-0.5 py-2 text-[0.68rem] font-medium transition ${
                extraAtivo || aberto
                  ? 'text-brand-600 dark:text-brand-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span
                className={`rounded-lg px-3 py-1 transition ${
                  extraAtivo || aberto ? 'bg-brand-50 dark:bg-brand-950' : ''
                }`}
              >
                <LayoutGrid size={19} />
              </span>
              <span className="w-full truncate px-0.5 text-center">Mais</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
