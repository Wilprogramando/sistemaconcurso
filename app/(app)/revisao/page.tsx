import Link from 'next/link';
import { createClient, getUserId } from '@/lib/supabase/server';
import QuestionRunner from '@/components/question-runner';
import { Card, Empty } from '@/components/ui';
import type { Question } from '@/lib/types';
import { COLUNAS, comTextosDeApoio } from '@/lib/questions';

export const metadata = { title: 'Revisão — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function RevisaoPage({
  searchParams,
}: {
  searchParams: Promise<{ iniciar?: string }>;
}) {
  const { iniciar } = await searchParams;
  const user = { id: (await getUserId())! };
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: due } = await supabase
    .from('reviews')
    .select('question_id, due_on, repetitions, lapses')
    .eq('user_id', user.id)
    .lte('due_on', hoje)
    .order('due_on')
    .limit(100);

  const ids = (due ?? []).map((r) => r.question_id);

  if (!ids.length) {
    const { data: proximas } = await supabase
      .from('reviews')
      .select('due_on')
      .eq('user_id', user.id)
      .gt('due_on', hoje)
      .order('due_on')
      .limit(1);

    return (
      <div className="space-y-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">Revisão espaçada</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            As questões voltam em 1, 3, 7 dias e assim por diante — e no dia seguinte quando você
            erra.
          </p>
        </div>
        <Card>
          <Empty>
            Nada vencido para hoje.
            {proximas?.length
              ? ` Sua próxima revisão é em ${new Date(proximas[0].due_on + 'T12:00:00').toLocaleDateString('pt-BR')}.`
              : ' Responda questões no treino para começar a alimentar a revisão.'}
          </Empty>
          <div className="mt-4 flex gap-2">
            <Link
              href="/questoes"
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Treinar questões
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (iniciar !== '1') {
    return (
      <div className="space-y-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">Revisão espaçada</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {ids.length} {ids.length === 1 ? 'questão' : 'questões'} vencidas para hoje.
          </p>
        </div>
        <Card title="Pronto para revisar?" subtitle="Feedback imediato, com o fundamento da apostila.">
          <Link
            href="/revisao?iniciar=1"
            className="inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Começar revisão de {ids.length}
          </Link>
        </Card>
      </div>
    );
  }

  const { data: raw } = await supabase.from('questions').select(COLUNAS).in('id', ids);
  const ordem = new Map(ids.map((id, i) => [id, i]));
  const emOrdem = ((raw ?? []) as unknown as Question[]).sort(
    (a, b) => (ordem.get(a.id) ?? 0) - (ordem.get(b.id) ?? 0)
  );
  const questions = await comTextosDeApoio(supabase, emOrdem);

  return (
    <div className="space-y-4">
      <Link href="/dashboard" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
        ← painel
      </Link>
      <QuestionRunner
        questions={questions}
        kind="revisao"
        instant
        titulo="Revisão de hoje"
        voltarHref="/dashboard"
      />
    </div>
  );
}
