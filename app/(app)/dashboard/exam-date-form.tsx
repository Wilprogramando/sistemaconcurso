'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { INPUT_CLASS } from '@/lib/types';

export default function ExamDateForm({
  examDate,
  dailyGoal,
}: {
  examDate: string;
  dailyGoal: number;
}) {
  const router = useRouter();
  const [date, setDate] = useState(examDate);
  const [goal, setGoal] = useState(dailyGoal);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await supabase
        .from('profiles')
        .update({ exam_date: date || null, daily_goal: goal })
        .eq('id', data.user.id);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Data da prova objetiva</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Meta diária de questões</span>
        <input
          type="number"
          min={5}
          max={200}
          value={goal}
          onChange={(e) => setGoal(Number(e.target.value))}
          className={INPUT_CLASS}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
        {saved && <span className="text-sm text-emerald-700">Salvo.</span>}
      </div>
    </form>
  );
}
