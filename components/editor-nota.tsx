'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Pin, PinOff, Trash2, X } from 'lucide-react';
import { useSessao } from '@/components/sessao';
import { ORDEM_TAGS, TAGS, type Nota, type Tag } from '@/lib/notas';

export type Opcao = { id: number; nome: string };

/**
 * Formulário único para criar e editar anotação. Quando `nota` vem preenchida
 * é edição; quando não, é uma nota nova.
 */
export default function EditorNota({
  nota,
  disciplinas,
  disciplinaFixa,
  topicoFixo,
  onFechar,
}: {
  nota?: Nota;
  disciplinas: Opcao[];
  /** quando a nota nasce de dentro de um tópico, já vem amarrada a ele */
  disciplinaFixa?: number | null;
  topicoFixo?: number | null;
  onFechar?: () => void;
}) {
  const { userId, supabase } = useSessao();
  const router = useRouter();

  const [titulo, setTitulo] = useState(nota?.title ?? '');
  const [corpo, setCorpo] = useState(nota?.body ?? '');
  const [tag, setTag] = useState<Tag>(nota?.tag ?? 'nota');
  const [disciplina, setDisciplina] = useState<number | null>(
    nota?.discipline_id ?? disciplinaFixa ?? null
  );
  const [fixada, setFixada] = useState(nota?.pinned ?? false);
  const [salvando, setSalvando] = useState(false);

  const vazia = !titulo.trim() && !corpo.trim();

  async function salvar() {
    if (vazia) return;
    setSalvando(true);

    const dados = {
      title: titulo.trim() || corpo.trim().slice(0, 60),
      body: corpo.trim(),
      tag,
      discipline_id: disciplina,
      topic_id: nota?.topic_id ?? topicoFixo ?? null,
      pinned: fixada,
    };

    if (nota) {
      await supabase.from('notes').update(dados).eq('id', nota.id);
    } else {
      await supabase.from('notes').insert({ ...dados, user_id: userId });
      setTitulo('');
      setCorpo('');
    }

    setSalvando(false);
    router.refresh();
    onFechar?.();
  }

  async function excluir() {
    if (!nota) return;
    setSalvando(true);
    await supabase.from('notes').delete().eq('id', nota.id);
    setSalvando(false);
    router.refresh();
    onFechar?.();
  }

  return (
    <div className="space-y-3">
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título (opcional)"
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-900"
      />

      <textarea
        value={corpo}
        onChange={(e) => setCorpo(e.target.value)}
        rows={5}
        autoFocus={!nota}
        placeholder="Escreva aqui. Ex.: inquérito — 10 dias preso, 30 solto. O delegado NUNCA arquiva."
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-7 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-900"
      />

      <div className="flex flex-wrap gap-1.5">
        {ORDEM_TAGS.map((t) => {
          const info = TAGS[t];
          const Icone = info.icone;
          const ativo = tag === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              aria-pressed={ativo}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                ativo
                  ? info.classe
                  : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700'
              }`}
            >
              <Icone size={13} />
              {info.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!topicoFixo && (
          <select
            value={disciplina ?? ''}
            onChange={(e) => setDisciplina(e.target.value ? Number(e.target.value) : null)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Sem matéria</option>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => setFixada((f) => !f)}
          aria-pressed={fixada}
          title={fixada ? 'Desafixar' : 'Fixar no topo'}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition ${
            fixada
              ? 'bg-brand-600 text-white ring-brand-600'
              : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600'
          }`}
        >
          {fixada ? <Pin size={14} /> : <PinOff size={14} />}
          {fixada ? 'Fixada' : 'Fixar'}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {nota && (
            <button
              type="button"
              onClick={excluir}
              disabled={salvando}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 size={14} /> Excluir
            </button>
          )}
          {onFechar && (
            <button
              type="button"
              onClick={onFechar}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X size={14} /> Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || vazia}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Check size={14} />
            {salvando ? 'Salvando…' : nota ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}
