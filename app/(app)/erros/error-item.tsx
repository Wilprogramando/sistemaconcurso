'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ErrorItem({
  id,
  note,
  resolved,
  statement,
  answer,
  explanation,
  disciplineName,
  disciplineSlug,
  createdAt,
}: {
  id: number;
  note: string;
  resolved: boolean;
  statement: string;
  answer: 'C' | 'E' | null;
  explanation: string;
  disciplineName: string | null;
  disciplineSlug: string | null;
  createdAt: string;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(note);
  const [salvo, setSalvo] = useState(false);
  const [pending, start] = useTransition();

  function salvar() {
    start(async () => {
      const supabase = createClient();
      await supabase.from('error_notes').update({ note: texto }).eq('id', id);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    });
  }

  function alternarResolvido() {
    start(async () => {
      const supabase = createClient();
      await supabase.from('error_notes').update({ resolved: !resolved }).eq('id', id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200/70">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {disciplineName && disciplineSlug && (
          <Link href={`/materias/${disciplineSlug}`} className="font-medium text-brand-700 hover:underline">
            {disciplineName}
          </Link>
        )}
        <span>· errada em {new Date(createdAt).toLocaleDateString('pt-BR')}</span>
      </div>

      <p className="mt-2 text-sm text-slate-900">{statement}</p>

      <p className="mt-2 text-sm">
        <span className="font-semibold text-emerald-700">
          Gabarito: {answer === 'C' ? 'CERTO' : answer === 'E' ? 'ERRADO' : '—'}
        </span>
        {explanation && <span className="text-slate-600"> — {explanation}</span>}
      </p>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={salvar}
        rows={2}
        placeholder="Por que eu errei? (ex.: confundi prazo de 30 com 60 dias)"
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={alternarResolvido}
          disabled={pending}
          className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-60"
        >
          {resolved ? 'Reabrir' : 'Marcar como resolvido'}
        </button>
        {salvo && <span className="text-xs text-emerald-700">anotação salva</span>}
      </div>
    </div>
  );
}
