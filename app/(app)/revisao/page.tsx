import Link from 'next/link';
import { CalendarClock, Dumbbell, Play } from 'lucide-react';
import { createClient, getUserId } from '@/lib/supabase/server';
import QuestionRunner from '@/components/question-runner';
import Contador from '@/components/contador';
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

    const proxima = proximas?.length ? new Date(proximas[0].due_on + 'T12:00:00') : null;
    const emDias = proxima
      ? Math.max(1, Math.ceil((proxima.getTime() - Date.now()) / 86400000))
      : null;

    return (
      <div className="entra space-y-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            Revisão espaçada
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            As questões voltam em 1, 3, 7 dias e assim por diante — e no dia seguinte quando você
            erra.
          </p>
        </div>

        {/* Fila vazia é um convite, não um aviso: diz o que fazer agora e
            quando a próxima leva chega. */}
        <section className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200/80 sm:p-8 dark:bg-slate-900 dark:ring-slate-700/70">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CalendarClock size={26} />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
            Fila limpa por hoje
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
            {proxima
              ? `A próxima leva chega em ${proxima.toLocaleDateString('pt-BR')}, ${emDias === 1 ? 'amanhã' : `daqui a ${emDias} dias`}.`
              : 'Responda questões no treino e elas entram na fila de revisão automaticamente.'}
          </p>
          <Link
            href="/questoes"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Dumbbell size={16} />
            Treinar questões novas
          </Link>
        </section>
      </div>
    );
  }

  if (iniciar !== '1') {
    const recaidas = (due ?? []).filter((r) => r.lapses > 0).length;
    const atrasadas = (due ?? []).filter((r) => r.due_on < hoje).length;
    // a pilha mostra o tamanho da fila sem precisar de número: até 4 folhas
    const folhas = Math.min(4, ids.length);

    return (
      <div className="entra space-y-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            Revisão espaçada
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            As questões voltam em 1, 3, 7 dias e assim por diante — e no dia seguinte quando você
            erra.
          </p>
        </div>

        {/* A fila de hoje desenhada como pilha de fichas: o número manda, e a
            pilha ao lado dá o tamanho no canto do olho. */}
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200/80 sm:p-6 dark:bg-slate-900 dark:ring-slate-700/70">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
            <div className="min-w-0 flex-1">
              <p className="text-5xl leading-none font-bold text-slate-900 tabular-nums dark:text-slate-100">
                <Contador para={ids.length} />
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {ids.length === 1 ? 'questão esperando revisão' : 'questões esperando revisão'}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Correção na hora, com o fundamento da apostila.
                {recaidas > 0 &&
                  ` ${recaidas} ${recaidas === 1 ? 'já foi errada antes' : 'já foram erradas antes'}.`}
                {atrasadas > 0 && ` ${atrasadas} venceram em dias anteriores.`}
              </p>
              <Link
                href="/revisao?iniciar=1"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <Play size={16} />
                Revisar as {ids.length}
              </Link>
            </div>

            {/* pilha de fichas: a fila tem tamanho, e isso se vê sem ler o número */}
            <div aria-hidden className="relative h-32 w-40 shrink-0 self-center">
              {Array.from({ length: folhas })
                .map((_, i) => folhas - 1 - i)
                .map((i) => (
                  <span
                    key={i}
                    className={`absolute inset-x-0 top-0 h-24 rounded-xl ring-1 ${
                      i === 0
                        ? 'bg-brand-600 ring-brand-700'
                        : 'bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'
                    }`}
                    style={{
                      transform: `translate(${i * 8}px, ${i * 7}px) rotate(${i * 2 - 3}deg)`,
                      opacity: i === 0 ? 1 : 1 - i * 0.15,
                    }}
                  />
                ))}
            </div>
          </div>
        </section>
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
