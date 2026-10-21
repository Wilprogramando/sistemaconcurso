'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const OPCOES = [
  ['lendo', 'Estou lendo'],
  ['lido', 'Já li'],
  ['revisar', 'Preciso revisar'],
] as const;

export default function TopicStatus({
  topicId,
  current,
}: {
  topicId: number;
  current: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [pending, start] = useTransition();

  function marcar(novo: string) {
    const valor = status === novo ? null : novo;
    setStatus(valor);
    start(async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      if (valor === null) {
        await supabase
          .from('topic_progress')
          .delete()
          .eq('user_id', data.user.id)
          .eq('topic_id', topicId);
      } else {
        await supabase.from('topic_progress').upsert(
          {
            user_id: data.user.id,
            topic_id: topicId,
            status: valor,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,topic_id' }
        );
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {OPCOES.map(([valor, label]) => {
        const ativo = status === valor;
        return (
          <button
            key={valor}
            type="button"
            disabled={pending}
            onClick={() => marcar(valor)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
              ativo
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        );
      })}
      {status && <span className="text-xs text-slate-400">clique de novo para desmarcar</span>}
    </div>
  );
}
