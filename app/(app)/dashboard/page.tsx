import Link from 'next/link';
import { CalendarDays, Play, RefreshCw, Target, TrendingUp, ListOrdered } from 'lucide-react';
import { createClient, getUser } from '@/lib/supabase/server';
import { ActionLink, Aviso, Bar, Badge, Card, Empty, Stat } from '@/components/ui';
import { PRIORITY_CLASS, PRIORITY_LABEL, type DisciplineStats } from '@/lib/types';
import { GOLDEN_RULE, PLAN_30 } from '@/lib/plans';
import ExamDateForm from './exam-date-form';

export const metadata = { title: 'Painel — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = (await getUser())!;
  const supabase = await createClient();

  const agora = new Date();
  const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString();
  const hojeISO = new Date().toISOString().slice(0, 10);

  const [
    { data: profile },
    { data: stats },
    { data: hojeAttempts },
    dueCount,
    { data: ultimas },
    { data: disciplines },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('v_discipline_stats').select('*').eq('user_id', user.id),
    supabase.from('attempts').select('correct').gte('answered_at', inicioDoDia),
    supabase.from('reviews').select('question_id', { count: 'exact', head: true }).lte('due_on', hojeISO),
    supabase
      .from('exam_sessions')
      .select('id, kind, total, correct, finished_at')
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(5),
    supabase.from('disciplines').select('*').order('chapter'),
  ]);

  const statMap = new Map<number, DisciplineStats>(
    (stats ?? []).map((s) => [s.discipline_id as number, s as DisciplineStats])
  );

  const metaDiaria = profile?.daily_goal ?? 20;
  const respondidasHoje = hojeAttempts?.length ?? 0;
  const acertosHoje = (hojeAttempts ?? []).filter((a) => a.correct).length;
  const revisoesHoje = dueCount.count ?? 0;

  let pontos = 0;
  let avaliado = 0;
  for (const d of disciplines ?? []) {
    const s = statMap.get(d.id);
    if (!s?.accuracy || !d.question_count) continue;
    pontos += (Number(s.accuracy) / 100) * d.question_count;
    avaliado += d.question_count;
  }
  const projecao = avaliado ? Math.round(pontos) : null;

  const diasRestantes = profile?.exam_date
    ? Math.ceil((new Date(profile.exam_date + 'T12:00:00').getTime() - Date.now()) / 86400000)
    : null;

  const zeradas = (disciplines ?? []).filter(
    (d) => d.question_count > 0 && !statMap.get(d.id)?.answered
  );

  const blocoAtual =
    diasRestantes !== null && diasRestantes > 0 && diasRestantes <= 30
      ? PLAN_30.find((b) => b.days.includes(31 - diasRestantes))
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            Painel de estudo
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            60 questões objetivas + redação (20 pontos). Aprovação exige 50% do total e nenhuma
            disciplina zerada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionLink href="/questoes" icon={Play}>
            Treinar questões
          </ActionLink>
          <ActionLink href="/revisao" icon={RefreshCw} variant="ghost">
            Revisar{revisoesHoje > 0 ? ` (${revisoesHoje})` : ''}
          </ActionLink>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Hoje"
          value={`${respondidasHoje}/${metaDiaria}`}
          hint={`${acertosHoje} acertos · meta diária`}
          icon={CalendarDays}
          tone={respondidasHoje >= metaDiaria ? 'good' : 'brand'}
        />
        <Stat
          label="Revisões vencidas"
          value={revisoesHoje}
          hint="questões que o sistema marcou para hoje"
          icon={RefreshCw}
          tone={revisoesHoje > 0 ? 'warn' : 'good'}
          href={revisoesHoje > 0 ? '/revisao' : undefined}
        />
        <Stat
          label="Projeção na objetiva"
          value={projecao === null ? '—' : `${projecao}/60`}
          hint={
            projecao === null
              ? 'responda questões para calcular'
              : projecao >= 40
                ? 'ritmo de aprovação'
                : 'abaixo do ponto de corte seguro'
          }
          icon={Target}
          tone={projecao === null ? 'default' : projecao >= 40 ? 'good' : projecao >= 30 ? 'warn' : 'bad'}
        />
        <Stat
          label="Dias até a prova"
          value={diasRestantes === null ? '—' : diasRestantes > 0 ? diasRestantes : 'hoje'}
          hint={profile?.exam_date ? 'conforme data informada' : 'informe a data abaixo'}
          icon={CalendarDays}
          tone={diasRestantes !== null && diasRestantes <= 30 ? 'warn' : 'default'}
        />
      </div>

      {blocoAtual && (
        <Card
          title={`Plano de 30 dias — ${blocoAtual.range}`}
          subtitle="Esta é a sua etapa de hoje"
          icon={CalendarDays}
          action={
            <Link href="/plano" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
              ver plano →
            </Link>
          }
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-brand-50 p-3.5 dark:bg-brand-950/50">
              <dt className="text-xs font-bold tracking-wide text-brand-700 uppercase dark:text-brand-300">
                Manhã (2h)
              </dt>
              <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {blocoAtual.morning}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
              <dt className="text-xs font-bold tracking-wide text-slate-600 uppercase dark:text-slate-400">
                Noite (2h)
              </dt>
              <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {blocoAtual.night}
              </dd>
            </div>
          </dl>
        </Card>
      )}

      <Card
        title="Desempenho por disciplina"
        subtitle="Ordenado pelo peso real na prova (Tabela 8.1 do edital)"
        icon={ListOrdered}
      >
        {/* celular: cartões; a partir de md: tabela */}
        <ul className="space-y-3 md:hidden">
          {(disciplines ?? [])
            .slice()
            .sort((a, b) => b.question_count - a.question_count || a.chapter - b.chapter)
            .map((d) => {
              const s = statMap.get(d.id);
              const acc = s?.accuracy ? Number(s.accuracy) : null;
              return (
                <li
                  key={d.id}
                  className="rounded-xl p-3 ring-1 ring-slate-200 dark:ring-slate-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/materias/${d.slug}`} className="font-medium hover:underline">
                      {d.name}
                    </Link>
                    <Badge className={PRIORITY_CLASS[d.priority as keyof typeof PRIORITY_CLASS]}>
                      {PRIORITY_LABEL[d.priority as keyof typeof PRIORITY_LABEL].replace('Prioridade ', '')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {d.question_count ? `${d.question_count} questões (${d.weight}%)` : 'redação'} ·{' '}
                    {s?.answered ?? 0} respondidas
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Bar percent={acc ?? 0} tone="auto" />
                    <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums">
                      {acc === null ? '—' : `${acc}%`}
                    </span>
                  </div>
                </li>
              );
            })}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[0.7rem] tracking-wider text-slate-500 uppercase dark:border-slate-700 dark:text-slate-400">
                <th className="py-2.5 pr-3 font-semibold">Disciplina</th>
                <th className="py-2.5 pr-3 font-semibold">Questões na prova</th>
                <th className="py-2.5 pr-3 font-semibold">Respondidas</th>
                <th className="py-2.5 pr-3 font-semibold">Acerto</th>
                <th className="py-2.5 font-semibold">Prioridade</th>
              </tr>
            </thead>
            <tbody>
              {(disciplines ?? [])
                .slice()
                .sort((a, b) => b.question_count - a.question_count || a.chapter - b.chapter)
                .map((d) => {
                  const s = statMap.get(d.id);
                  const acc = s?.accuracy ? Number(s.accuracy) : null;
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <td className="py-3 pr-3">
                        <Link href={`/materias/${d.slug}`} className="font-medium hover:underline">
                          {d.name}
                        </Link>
                      </td>
                      <td className="py-3 pr-3 text-slate-600 tabular-nums dark:text-slate-400">
                        {d.question_count || '—'}
                        {d.question_count ? (
                          <span className="ml-1 text-xs text-slate-400">({d.weight}%)</span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 text-slate-600 tabular-nums dark:text-slate-400">
                        {s?.answered ?? 0}
                      </td>
                      <td className="w-48 py-3 pr-3">
                        {acc === null ? (
                          <span className="text-slate-400">sem dados</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Bar percent={acc} tone="auto" />
                            <span className="w-12 text-right font-semibold tabular-nums">{acc}%</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge className={PRIORITY_CLASS[d.priority as keyof typeof PRIORITY_CLASS]}>
                          {PRIORITY_LABEL[d.priority as keyof typeof PRIORITY_LABEL]}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      {zeradas.length > 0 && (
        <Aviso title="Atenção: disciplinas sem nenhuma questão respondida">
          <p>Zerar uma única disciplina elimina o candidato, mesmo com nota alta nas demais.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {zeradas.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/questoes?disciplina=${d.slug}`}
                  className="inline-flex items-center rounded-lg bg-white/70 px-3 py-1.5 text-sm font-medium ring-1 ring-amber-300 hover:bg-white dark:bg-slate-900/60 dark:ring-amber-800"
                >
                  {d.name} →
                </Link>
              </li>
            ))}
          </ul>
        </Aviso>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Últimas sessões" icon={TrendingUp}>
          {!ultimas?.length ? (
            <Empty>Nenhuma sessão concluída ainda. Comece por um treino de questões.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {ultimas.map((s) => {
                const pct = s.total ? Math.round((100 * s.correct) / s.total) : 0;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="capitalize">{s.kind}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {new Date(s.finished_at!).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {s.correct}/{s.total}{' '}
                      <span
                        className={
                          pct >= 70
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : pct >= 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                        }
                      >
                        ({pct}%)
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Sua configuração" subtitle="Data da prova e meta diária de questões">
          <ExamDateForm examDate={profile?.exam_date ?? ''} dailyGoal={profile?.daily_goal ?? 20} />
          <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-5 text-amber-900 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
            {GOLDEN_RULE}
          </p>
        </Card>
      </div>
    </div>
  );
}
