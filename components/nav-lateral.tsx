'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { ACOMPANHAR, AVALIAR, ESTUDAR, PAINEL, type Item } from '@/components/navegacao';

const GRUPOS: { titulo: string | null; itens: Item[] }[] = [
  { titulo: null, itens: [PAINEL] },
  { titulo: 'Estudar', itens: ESTUDAR },
  { titulo: 'Avaliar', itens: AVALIAR },
  { titulo: 'Acompanhar', itens: ACOMPANHAR },
];

const ehAtivo = (path: string, href: string) => path === href || path.startsWith(href + '/');

/**
 * Barra lateral fixa (tablet e desktop). No celular a navegação continua na
 * barra inferior, que é onde o polegar alcança.
 */
export default function NavLateral({ rodape }: { rodape: React.ReactNode }) {
  const path = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-brand-900 text-white md:flex dark:bg-slate-950">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <ShieldCheck size={22} className="shrink-0 text-brand-300" />
        <Link href="/dashboard" className="min-w-0 leading-tight">
          <span className="block font-bold">PM SC 2026</span>
          <span className="block text-xs text-brand-200">Soldado QPPM</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {GRUPOS.map((grupo, i) => (
          <div key={grupo.titulo ?? i} className={grupo.titulo ? 'mt-5' : ''}>
            {grupo.titulo && (
              <p className="px-3 pb-1.5 text-[0.65rem] font-bold tracking-[0.12em] text-brand-300 uppercase">
                {grupo.titulo}
              </p>
            )}
            <ul className="space-y-0.5">
              {grupo.itens.map(({ href, label, icone: Icone }) => {
                const ativo = ehAtivo(path, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={ativo ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        ativo
                          ? 'bg-white/15 text-white'
                          : 'text-brand-100 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icone size={17} className="shrink-0" />
                      <span className="min-w-0 truncate">{label}</span>
                      {ativo && (
                        <span aria-hidden className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-300" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">{rodape}</div>
    </aside>
  );
}
