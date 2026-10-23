'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, NotebookPen, Plus } from 'lucide-react';
import EditorNota from '@/components/editor-nota';
import ImagensDaNota from '@/components/imagens-nota';
import AnexosDaNota from '@/components/anexos-nota';
import CorpoNota from '@/components/corpo-nota';
import { useSessao } from '@/components/sessao';
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
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  /** ordem já aplicada na tela, antes de o banco confirmar */
  const [ordemLocal, setOrdemLocal] = useState<string[] | null>(null);
  const { supabase } = useSessao();

  const lista = useMemo(() => {
    if (!ordemLocal) return notas;
    const posicao = new Map(ordemLocal.map((id, i) => [id, i]));
    return [...notas].sort(
      (a, b) => (posicao.get(a.id) ?? 0) - (posicao.get(b.id) ?? 0),
    );
  }, [notas, ordemLocal]);

  function alternar(id: string) {
    setAbertas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }

  /**
   * Troca de lugar com a vizinha: a tela muda na hora e o banco é avisado
   * depois, numa só chamada. Sem `router.refresh()`, que era o que travava.
   */
  function mover(indice: number, passo: -1 | 1) {
    const destino = indice + passo;
    if (destino < 0 || destino >= lista.length) return;

    const ordem = [...lista];
    [ordem[indice], ordem[destino]] = [ordem[destino], ordem[indice]];
    setOrdemLocal(ordem.map((n) => n.id));

    const ids = ordem.map((n) => n.id);
    void (async () => {
      const { error } = await supabase.rpc('reordenar_notas', { p_ids: ids });
      // banco sem a migração 0008: cai no update por anotação
      if (error) {
        await Promise.all(
          ids.map((id, i) => supabase.from('notes').update({ position: i + 1 }).eq('id', id)),
        );
      }
    })();
  }

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
          {lista.map((n, i) => {
            const info = TAGS[n.tag];
            const Icone = info.icone;
            const expandida = abertas.has(n.id);

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
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => mover(i, -1)}
                      disabled={i === 0}
                      title="Subir"
                      aria-label="Subir"
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => mover(i, 1)}
                      disabled={i === lista.length - 1}
                      title="Descer"
                      aria-label="Descer"
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => alternar(n.id)}
                      aria-expanded={expandida}
                      title={expandida ? 'Esconder a anotação' : 'Ver a anotação'}
                      aria-label={expandida ? 'Esconder a anotação' : 'Ver a anotação'}
                      className={`rounded-lg p-1 transition ${
                        expandida
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-500 hover:bg-white hover:text-brand-700 dark:text-slate-400 dark:hover:bg-slate-700'
                      }`}
                    >
                      {expandida ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditando(n.id)}
                      className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
                    >
                      editar
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => alternar(n.id)}
                  aria-expanded={expandida}
                  className="mt-1.5 block w-full text-left text-sm font-semibold tracking-wide text-slate-900 uppercase dark:text-slate-100"
                >
                  {n.title || 'Sem título'}
                </button>

                {expandida && (
                  <>
                    <CorpoNota html={n.body_html} texto={n.body} className="mt-0.5" />
                    {n.images?.length > 0 && (
                      <div className="mt-2">
                        <ImagensDaNota caminhos={n.images} somenteLeitura />
                      </div>
                    )}
                    {n.attachments?.length > 0 && (
                      <div className="mt-2">
                        <AnexosDaNota anexos={n.attachments} somenteLeitura />
                      </div>
                    )}
                  </>
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
