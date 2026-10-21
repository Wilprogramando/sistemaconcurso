'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FileText,
  House,
  ListChecks,
  NotebookPen,
  RefreshCw,
} from 'lucide-react';

export const ITENS = [
  { href: '/dashboard', label: 'Painel', curto: 'Painel', icone: House },
  { href: '/materias', label: 'Matérias', curto: 'Matérias', icone: BookOpen },
  { href: '/questoes', label: 'Questões', curto: 'Questões', icone: ListChecks },
  { href: '/revisao', label: 'Revisão', curto: 'Revisão', icone: RefreshCw },
  { href: '/simulado', label: 'Simulado', curto: 'Simulado', icone: FileText },
  { href: '/erros', label: 'Caderno de erros', curto: 'Erros', icone: NotebookPen },
  { href: '/plano', label: 'Plano', curto: 'Plano', icone: CalendarDays },
  { href: '/estatisticas', label: 'Estatísticas', curto: 'Dados', icone: BarChart3 },
] as const;

/** Barra do topo (desktop e tablet). */
export function NavTopo() {
  const path = usePathname();

  return (
    <nav className="mx-auto hidden max-w-6xl px-4 md:block">
      <ul className="flex gap-1 overflow-x-auto pb-2 text-sm whitespace-nowrap">
        {ITENS.map(({ href, label, icone: Icone }) => {
          const ativo = path === href || path.startsWith(href + '/');
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition ${
                  ativo
                    ? 'bg-white/15 text-white'
                    : 'text-brand-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icone size={16} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Barra fixa inferior (celular). */
export function NavInferior() {
  const path = usePathname();
  const principais = ITENS.filter((i) =>
    ['/dashboard', '/materias', '/questoes', '/revisao', '/estatisticas'].includes(i.href)
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-700 dark:bg-slate-900/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg">
        {principais.map(({ href, curto, icone: Icone }) => {
          const ativo = path === href || path.startsWith(href + '/');
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium transition ${
                  ativo ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icone size={20} />
                {curto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Menu das seções que não cabem na barra inferior. */
export function MenuSecundario() {
  const path = usePathname();
  const extras = ITENS.filter((i) => ['/simulado', '/erros', '/plano'].includes(i.href));

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
      {extras.map(({ href, label, icone: Icone }) => {
        const ativo = path === href || path.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              ativo
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
            }`}
          >
            <Icone size={14} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
