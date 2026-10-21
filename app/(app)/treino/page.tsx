import Link from 'next/link';
import { CalendarCheck, CheckCircle2, Flame, Target } from 'lucide-react';
import { createClient, getUser } from '@/lib/supabase/server';
import QuestionRunner from '@/components/question-runner';
import { Card, Stat } from '@/components/ui';
import { Medidor } from '@/components/graficos';
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
  const user = (await getUser())!;
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

  return (
    <div className="space-y-5">
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

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Hoje"
          value={`${treino.answered}/${treino.goal}`}
          hint={feitoHoje ? 'treino concluído' : 'questões respondidas'}
          icon={CalendarCheck}
          tone={feitoHoje ? 'good' : 'brand'}
        />
        <Stat
          label="Acerto de hoje"
          value={acerto === null ? '—' : `${acerto}%`}
          hint={acerto === null ? 'comece o treino' : `${treino.correct} acertos`}
          icon={Target}
          tone={acerto === null ? 'default' : acerto >= 70 ? 'good' : acerto >= 50 ? 'warn' : 'bad'}
        />
        <Stat
          label="Sequência"
          value={`${sequencia} ${sequencia === 1 ? 'dia' : 'dias'}`}
          hint="dias seguidos com o treino concluído"
          icon={Flame}
          tone={sequencia >= 3 ? 'good' : 'default'}
        />
      </div>

      <Card>
        <Medidor
          valor={pct}
          meta={100}
          destaque
          label="Progresso de hoje"
          sublabel={
            feitoHoje
              ? 'Treino de hoje concluído. Amanhã o sistema sorteia um novo conjunto.'
              : `Faltam ${Math.max(0, treino.goal - treino.answered)} questões para fechar o dia.`
          }
        />

        <div className="mt-5 flex flex-wrap gap-2">
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
                <CheckCircle2 size={16} /> Treino de hoje concluído
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
      </Card>

      <Card title="Últimos 14 dias" subtitle="Um quadrado por dia — verde é meta cumprida">
        <ul className="flex flex-wrap gap-1.5">
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
            const reg = (historico ?? []).find((h) => h.day === d);
            const completo = !!reg?.finished_at;
            const parcial = !!reg?.answered && !completo;
            return (
              <li
                key={d}
                title={
                  reg
                    ? `${new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')}: ${reg.answered}/${reg.goal}`
                    : new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
                }
                className={`grid h-9 w-9 place-items-center rounded-lg text-[0.65rem] font-semibold ${
                  completo
                    ? 'bg-emerald-600 text-white'
                    : parcial
                      ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}
              >
                {new Date(d + 'T12:00:00').getDate()}
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
