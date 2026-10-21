'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, NotebookPen, Plus } from 'lucide-react';
import EditorNota from '@/components/editor-nota';
import ImagensDaNota from '@/components/imagens-nota';
import { TAGS, type Nota } from '@/lib/notas';

/**
 * Bloco de anotações dentro de um tópico: mostra quantas existem, abre a lista
 * e deixa criar uma nova já amarrada ao tópico, sem sair da leitura.
 */
export default function NotasDoTopico({
  notas,
  topicId,
  disciplineId,
  indisponivel = false,
}: {
  notas: Nota[];
  topicId: number;
  disciplineId: number;
  indisponivel?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  if (indisponivel) {
    return (
      <div className="rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">
        <p className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
          <NotebookPen size={16} /> Anotações
        </p>
        <p className="mt-1 leading-6">
          Rode a migração{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
            0005_anotacoes_e_aulas.sql
          </code>{' '}
          no Supabase para liberar as anotações.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left"
      >
        <NotebookPen size={17} className="shrink-0 text-brand-600 dark:text-brand-300" />
        <span className="font-semibold text-slate-900 dark:text-slate-100">Anotações</span>
        {notas.length > 0 && (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {notas.length}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {notas.length === 0 && !aberto && 'anotar algo deste tópico'}
          <ChevronDown
            size={17}
            className={`transition-transform ${aberto ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {aberto && (
        <div className="space-y-3 border-t border-slate-200 px-4 py-4 dark:border-slate-700">
          {notas.map((n) => {
            const info = TAGS[n.tag];
            const Icone = info.icone;

            if (editando === n.id) {
              return (
                <div
                  key={n.id}
                  className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"
                >
                  <EditorNota
                    nota={n}
                    disciplinas={[]}
                    topicoFixo={topicId}
                    disciplinaFixa={disciplineId}
                    onFechar={() => setEditando(null)}
                  />
                </div>
              );
            }

            return (
              <article
                key={n.id}
                className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${info.classe}`}
                  >
                    <Icone size={11} /> {info.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditando(n.id)}
                    className="ml-auto text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
                  >
                    editar
                  </button>
                </div>
                {n.title && (
                  <h4 className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {n.title}
                  </h4>
                )}
                {n.body && (
                  <p className="mt-0.5 text-sm leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {n.body}
                  </p>
                )}
                {n.images?.length > 0 && (
                  <div className="mt-2">
                    <ImagensDaNota caminhos={n.images} somenteLeitura />
                  </div>
                )}
              </article>
            );
          })}

          {criando ? (
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <EditorNota
                disciplinas={[]}
                topicoFixo={topicId}
                disciplinaFixa={disciplineId}
                onFechar={() => setCriando(false)}
              />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCriando(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <Plus size={15} /> Anotar deste tópico
              </button>
              <Link
                href="/anotacoes"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
              >
                Ver todas
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
