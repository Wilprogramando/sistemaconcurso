'use client';

import Link from 'next/link';
import { Check, Clock, RotateCcw } from 'lucide-react';
import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

type Topico = {
  id: number;
  ref: string;
  title: string;
  minutos: number;
  status: string | null;
};

export default function ListaTopicos({ slug, topicos }: { slug: string; topicos: Topico[] }) {
  const [estado, setEstado] = useState<Record<number, string | null>>(
    Object.fromEntries(topicos.map((t) => [t.id, t.status]))
  );
  const [, start] = useTransition();

  /** Marca "já estudei" direto da lista, sem precisar abrir o tópico. */
  function alternarLido(id: number) {
    const novo = estado[id] === 'lido' ? null : 'lido';
    setEstado((e) => ({ ...e, [id]: novo }));

    start(async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      if (novo === null) {
        await supabase
          .from('topic_progress')
          .delete()
          .eq('user_id', data.user.id)
          .eq('topic_id', id);
      } else {
        await supabase.from('topic_progress').upsert(
          {
            user_id: data.user.id,
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
            className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200 transition hover:ring-brand-400 sm:px-4 dark:bg-slate-900 dark:ring-slate-700"
          >
            <button
              type="button"
              onClick={() => alternarLido(t.id)}
              aria-pressed={lido}
              aria-label={lido ? `Desmarcar ${t.ref}` : `Marcar ${t.ref} como estudado`}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 transition ${
                lido
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-600'
              }`}
            >
              <Check size={17} />
            </button>

            <Link href={`/materias/${slug}/${t.ref}`} className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-slate-400 tabular-nums">{t.ref}</span>
                <span
                  className={`text-sm font-medium ${
                    lido
                      ? 'text-slate-400 dark:text-slate-500'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {t.title}
                </span>
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <Clock size={11} /> {t.minutos} min
              </span>
            </Link>

            {st === 'revisar' && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                <RotateCcw size={11} /> revisar
              </span>
            )}
            {st === 'lendo' && (
              <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900 dark:bg-sky-950 dark:text-sky-300">
                estudando
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
