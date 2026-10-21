'use client';

import { BookOpen, Check, RotateCcw } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useSessao } from '@/components/sessao';

const OPCOES = [
  { valor: 'lendo', label: 'Estudando', icone: BookOpen, ativo: 'bg-sky-600 text-white' },
  { valor: 'lido', label: 'Já estudei', icone: Check, ativo: 'bg-emerald-600 text-white' },
  { valor: 'revisar', label: 'Revisar', icone: RotateCcw, ativo: 'bg-amber-600 text-white' },
] as const;

export default function TopicStatus({
  topicId,
  current,
}: {
  topicId: number;
  current: string | null;
}) {
  const [status, setStatus] = useState(current);
  const [pending, start] = useTransition();
  const { userId, supabase } = useSessao();

  function marcar(novo: string) {
    const valor = status === novo ? null : novo;
    setStatus(valor);
    start(async () => {

      if (valor === null) {
        await supabase
          .from('topic_progress')
          .delete()
          .eq('user_id', userId)
          .eq('topic_id', topicId);
      } else {
        await supabase.from('topic_progress').upsert(
          {
            user_id: userId,
            topic_id: topicId,
            status: valor,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,topic_id', defaultToNull: false }
        );
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <span className="mr-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        Meu progresso
      </span>
      {OPCOES.map(({ valor, label, icone: Icone, ativo }) => {
        const marcado = status === valor;
        return (
          <button
            key={valor}
            type="button"
            disabled={pending}
            aria-pressed={marcado}
            onClick={() => marcar(valor)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
              marcado
                ? ativo
                : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
            }`}
          >
            <Icone size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
