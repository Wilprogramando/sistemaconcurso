'use client';

import Link from 'next/link';
import { Check, ChevronRight, Clock, RotateCcw } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useSessao } from '@/components/sessao';

type Topico = {
  id: number;
  ref: string;
  title: string;
  minutos: number;
  resumo: string | null;
  status: string | null;
};

export default function ListaTopicos({ slug, topicos }: { slug: string; topicos: Topico[] }) {
  const { userId, supabase } = useSessao();
  const [estado, setEstado] = useState<Record<number, string | null>>(
    Object.fromEntries(topicos.map((t) => [t.id, t.status]))
  );
  const [, start] = useTransition();

  /** Marca "já estudei" direto da lista, com retorno imediato na tela. */
  function alternarLido(id: number) {
    const novo = estado[id] === 'lido' ? null : 'lido';
    setEstado((e) => ({ ...e, [id]: novo }));

    start(async () => {
      if (novo === null) {
        await supabase.from('topic_progress').delete().eq('user_id', userId).eq('topic_id', id);
      } else {
        await supabase.from('topic_progress').upsert(
          {
            user_id: userId,
            topic_id: id,
            status: novo,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,topic_id', defaultToNull: false }
        );
      }
    });
  }

  return (
    <ol className="space-y-2">
      {topicos.map((t) => {
        const st = estado[t.id];
        const lido = st === 'lido';

        return (
          <li
            key={t.id}
            className={`rounded-2xl ring-1 transition ${
              lido
                ? 'bg-emerald-50/50 ring-emerald-200 dark:bg-emerald-950/20 dark:ring-emerald-900'
                : 'bg-white ring-slate-200 hover:ring-brand-400 dark:bg-slate-900 dark:ring-slate-700'
            }`}
          >
            <div className="flex items-start gap-3 p-3 sm:p-4">
              <button
                type="button"
                onClick={() => alternarLido(t.id)}
                aria-pressed={lido}
                aria-label={lido ? `Desmarcar ${t.ref}` : `Marcar ${t.ref} como estudado`}
                className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 transition active:scale-95 ${
                  lido
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-600'
                }`}
              >
                <Check size={18} />
              </button>

              <Link href={`/materias/${slug}/${t.ref}`} className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="shrink-0 text-xs font-bold text-slate-400 tabular-nums">
                    {t.ref}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      lido
                        ? 'text-slate-500 dark:text-slate-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {t.title}
                  </span>
                </span>

                {t.resumo && (
                  <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {t.resumo}
                  </span>
                )}

                <span className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} /> {t.minutos} min
                  </span>
                  {st === 'revisar' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      <RotateCcw size={10} /> revisar
                    </span>
                  )}
                  {st === 'lendo' && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-900 dark:bg-sky-950 dark:text-sky-300">
                      estudando
                    </span>
                  )}
                </span>
              </Link>

              <ChevronRight size={18} className="mt-2 shrink-0 text-slate-300 dark:text-slate-600" />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
