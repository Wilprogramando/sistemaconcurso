'use client';

import Link from 'next/link';
import { Check, NotebookPen, RotateCcw, Undo2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useSessao } from '@/components/sessao';

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
  answer: string | null;
  explanation: string;
  disciplineName: string | null;
  disciplineSlug: string | null;
  createdAt: string;
}) {
  const { supabase } = useSessao();
  const [texto, setTexto] = useState(note);
  const [salvo, setSalvo] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [, start] = useTransition();

  function salvar() {
    start(async () => {
      await supabase.from('error_notes').update({ note: texto }).eq('id', id);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    });
  }

  /** Esconde o cartão na hora e grava em segundo plano — sem recarregar a lista. */
  function alternarResolvido() {
    setOculto(true);
    start(async () => {
      await supabase.from('error_notes').update({ resolved: !resolved }).eq('id', id);
    });
  }

  function desfazer() {
    setOculto(false);
    start(async () => {
      await supabase.from('error_notes').update({ resolved }).eq('id', id);
    });
  }

  if (oculto) {
    return (
      <div className="surge flex items-center justify-between gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <span className="inline-flex items-center gap-2">
          <Check size={16} className="text-emerald-600" />
          {resolved ? 'Reaberto.' : 'Marcado como resolvido.'}
        </span>
        <button
          type="button"
          onClick={desfazer}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium text-brand-600 hover:bg-white dark:text-brand-300 dark:hover:bg-slate-700"
        >
          <Undo2 size={14} /> desfazer
        </button>
      </div>
    );
  }

  const gabarito =
    answer === 'C' ? 'certo' : answer === 'E' ? 'errado' : answer ? `alternativa ${answer}` : '—';

  const temMotivo = texto.trim().length > 0;

  return (
    // A régua na lateral é o estado da ficha à distância: âmbar enquanto o
    // motivo do erro não foi escrito, verde quando já foi.
    <article
      className={`relative overflow-hidden rounded-2xl bg-white p-4 pl-5 ring-1 ring-slate-200 sm:p-5 sm:pl-6 dark:bg-slate-900 dark:ring-slate-700`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1.5 transition-colors ${
          temMotivo ? 'bg-emerald-500' : 'bg-amber-400'
        }`}
      />
      <header className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {disciplineName && disciplineSlug && (
          <Link
            href={`/materias/${disciplineSlug}`}
            className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {disciplineName}
          </Link>
        )}
        <span>errada em {new Date(createdAt).toLocaleDateString('pt-BR')}</span>
      </header>

      <p className="mt-2.5 text-sm leading-7 text-slate-900 dark:text-slate-100">{statement}</p>

      <div className="mt-3 rounded-xl bg-emerald-50 p-3.5 dark:bg-emerald-950/40">
        <p className="text-sm text-emerald-900 dark:text-emerald-200">
          Resposta correta:{' '}
          <strong className="font-bold">{gabarito}</strong>
        </p>
        {explanation && (
          <p className="mt-1.5 text-sm leading-7 text-slate-700 dark:text-slate-300">
            {explanation}
          </p>
        )}
      </div>

      <label className="mt-3 block">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <NotebookPen size={13} /> Por que eu errei?
        </span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={salvar}
          rows={2}
          placeholder="Ex.: confundi o prazo de 30 com o de 60 dias"
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-900"
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={alternarResolvido}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
        >
          {resolved ? <RotateCcw size={14} /> : <Check size={14} />}
          {resolved ? 'Reabrir' : 'Marcar como resolvido'}
        </button>
        {salvo && (
          <span className="text-xs text-emerald-700 dark:text-emerald-400">anotação salva</span>
        )}
      </div>
    </article>
  );
}
