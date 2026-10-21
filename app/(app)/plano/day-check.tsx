'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DayCheck({
  plan,
  day,
  done,
  label,
}: {
  plan: '30' | '12';
  day: number;
  done: boolean;
  label?: string;
}) {
  const [marcado, setMarcado] = useState(done);
  const [pending, start] = useTransition();

  function alternar() {
    const valor = !marcado;
    setMarcado(valor);
    start(async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      if (valor) {
        await supabase
          .from('study_days')
          .upsert(
            { user_id: data.user.id, plan, day, done: true, done_at: new Date().toISOString() },
            { onConflict: 'user_id,plan,day' }
          );
      } else {
        await supabase
          .from('study_days')
          .delete()
          .eq('user_id', data.user.id)
          .eq('plan', plan)
          .eq('day', day);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={pending}
      aria-pressed={marcado}
      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60 ${
        marcado
          ? 'bg-emerald-600 text-white'
          : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50'
      }`}
    >
      {label ? (marcado ? `✓ ${label}` : label) : marcado ? `✓ ${day}` : day}
    </button>
  );
}
