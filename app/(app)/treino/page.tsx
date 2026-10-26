import Link from 'next/link';
import { CheckCircle2, Flame } from 'lucide-react';
import { createClient, getUserId } from '@/lib/supabase/server';
import QuestionRunner from '@/components/question-runner';
import { Anel, Card } from '@/components/ui';
import Contador from '@/components/contador';
import { COLUNAS, comTextosDeApoio } from '@/lib/questions';
import { treinoDoDia, hojeLocal, MigracaoPendente, type TreinoDoDia } from '@/lib/treino';
import type { Question } from '@/lib/types';

export const metadata = { title: 'Treino do dia — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function TreinoPage({
  searchParams,
}: {
  searchParams: Promise<{ iniciar?: string }>;
}) {
  const { iniciar } = await searchParams;
  const user = { id: (await getUserId())! };
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_goal')
    .eq('id', user.id)
    .maybeSingle();

  const meta = profile?.daily_goal ?? 20;

  let treino: TreinoDoDia;
  try {
    treino = await treinoDoDia(supabase, user.id, meta);
  } catch (e) {
    if (e instanceof MigracaoPendente) return <FaltaMigracao />;
    throw e;
  }

  // histórico dos últimos 14 dias, para a sequência
  const desde = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10);
  const { data: historico } = await supabase
    .from('daily_sets')
    .select('day, answered, correct, goal, finished_at')
    .eq('user_id', user.id)
    .gte('day', desde)
    .order('day', { ascending: false });

  const concluidos = (historico ?? []).filter((d) => d.finished_at);
  const sequencia = calcularSequencia(concluidos.map((d) => d.day));
  const hoje = hojeLocal();
  const feitoHoje = !!treino.finishedAt;

  // ---------------- rodando o treino ----------------
  if (iniciar === '1' && !feitoHoje) {
    const { data: raw } = await supabase.from('questions').select(COLUNAS).in('id', treino.questionIds);

    const ordem = new Map(treino.questionIds.map((id, i) => [id, i]));
    const emOrdem = ((raw ?? []) as unknown as Question[]).sort(
      (a, b) => (ordem.get(a.id) ?? 0) - (ordem.get(b.id) ?? 0)
    );
    const questions = await comTextosDeApoio(supabase, emOrdem);

    return (
      <div className="space-y-4">
        <Link
          href="/treino"
          className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          ← Treino do dia
        </Link>
        <QuestionRunner
          questions={questions}
          kind="treino"
          instant
          titulo="Treino do dia"
          subtitulo={new Date(hoje + 'T12:00:00').toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
          })}
          diaDoTreino={treino.day}
          voltarHref="/treino"
        />
      </div>
    );
  }

  // ---------------- tela de abertura ----------------
  const pct = treino.goal ? Math.round((100 * treino.answered) / treino.goal) : 0;
  const acerto = treino.answered ? Math.round((100 * treino.correct) / treino.answered) : null;

  const faltam = Math.max(0, treino.goal - treino.answered);

  return (
    <div className="entra space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
          Treino do dia
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          {treino.goal} questões por dia, sorteadas pelo sistema. A seleção não é aleatória pura:
          vem primeiro o que a revisão marcou para hoje, depois o que você já errou, e por último
          questões novas distribuídas pelo peso de cada disciplina na prova.
        </p>
      </div>

      {/* O dia de hoje num anel: a fração respondida é o estado que decide se
          a tela é um convite para começar ou a confirmação de dever cumprido.
          Acerto e sequência ficam ao lado, sem roubar o lugar. */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200/80 sm:p-6 dark:bg-slate-900 dark:ring-slate-700/70">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
          <Anel valor={pct} rotulo={`${treino.answered} de ${treino.goal} questões respondidas`}>
            <span>
              <span className="block text-3xl leading-none font-bold text-slate-900 tabular-nums dark:text-slate-100">
                <Contador para={treino.answered} />
                <span className="text-slate-400 dark:text-slate-500">/{treino.goal}</span>
              </span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">hoje</span>
            </span>
          </Anel>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {feitoHoje
                ? 'Treino de hoje concluído'
                : treino.answered
                  ? `Faltam ${faltam} para fechar o dia`
                  : 'O conjunto de hoje já está sorteado'}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {feitoHoje
                ? 'Amanhã o sistema sorteia um novo conjunto.'
                : 'As primeiras são as que a revisão marcou para hoje.'}
            </p>

            <dl className="mt-4 flex justify-center gap-6 sm:justify-start">
              <div>
                <dd className="text-xl leading-tight font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {acerto === null ? '—' : `${acerto}%`}
                </dd>
                <dt className="text-sm text-slate-500 dark:text-slate-400">
                  {acerto === null ? 'acerto de hoje' : `acerto · ${treino.correct} certas`}
                </dt>
              </div>
              <div>
                <dd className="flex items-baseline gap-1.5 text-xl leading-tight font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {sequencia}
                  {sequencia >= 3 && (
                    <Flame size={16} className="text-amber-500 dark:text-amber-400" />
                  )}
                </dd>
                <dt className="text-sm text-slate-500 dark:text-slate-400">
                  {sequencia === 1 ? 'dia seguido' : 'dias seguidos'}
                </dt>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              {!feitoHoje ? (
                <Link
                  href="/treino?iniciar=1"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  <Flame size={16} />
                  {treino.answered ? 'Continuar o treino' : `Começar as ${treino.goal} questões`}
                </Link>
              ) : (
                <>
                  <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <CheckCircle2 size={16} /> Dever cumprido
                  </span>
                  <Link
                    href="/questoes"
                    className="inline-flex items-center rounded-xl bg-white px-4 py-3 text-sm font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
                  >
                    Treinar mais, fora da meta
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <Card
        title="Últimos 14 dias"
        subtitle="Verde é meta cumprida, âmbar é dia começado e não fechado"
      >
        {/* os quadrados entram um a um, da esquerda para a direita: a
            sequência é o assunto, e ela se lê no sentido do tempo */}
        <ul className="flex flex-wrap gap-1.5">
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
            const data = new Date(d + 'T12:00:00');
            const reg = (historico ?? []).find((h) => h.day === d);
            const completo = !!reg?.finished_at;
            const parcial = !!reg?.answered && !completo;
            const ehHoje = d === hoje;
            return (
              <li
                key={d}
                title={
                  reg
                    ? `${data.toLocaleDateString('pt-BR')}: ${reg.answered}/${reg.goal}`
                    : data.toLocaleDateString('pt-BR')
                }
                style={{ animationDelay: `${i * 35}ms` }}
                className={`surge grid h-11 w-11 place-items-center rounded-lg leading-tight ${
                  ehHoje ? 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-slate-900' : ''
                } ${
                  completo
                    ? 'bg-emerald-600 text-white'
                    : parcial
                      ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}
              >
                <span className="text-center">
                  <span className="block text-[0.55rem] capitalize opacity-80">
                    {data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                  </span>
                  <span className="block text-[0.7rem] font-semibold tabular-nums">
                    {data.getDate()}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function FaltaMigracao() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
        Treino do dia
      </h1>
      <Card title="Falta um passo no banco de dados">
        <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">
          O treino diário guarda, a cada dia, quais 20 questões foram sorteadas — e a tabela que
          faz isso ainda não existe no seu Supabase. Rode{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
            supabase/migrations/0004_treino_diario_e_guia.sql
          </code>{' '}
          no SQL Editor e recarregue esta página.
        </p>
      </Card>
    </div>
  );
}

function calcularSequencia(diasConcluidos: string[]) {
  const set = new Set(diasConcluidos);
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    if (set.has(d)) n += 1;
    else if (i > 0) break;
  }
  return n;
}
