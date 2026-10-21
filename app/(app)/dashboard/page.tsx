import { createClient, getUser } from '@/lib/supabase/server';
import { ActionLink, Bar, Badge, Card, Empty, Stat } from '@/components/ui';
import { PRIORITY_CLASS, PRIORITY_LABEL, type DisciplineStats } from '@/lib/types';
import { GOLDEN_RULE, PLAN_30 } from '@/lib/plans';
import ExamDateForm from './exam-date-form';
import Link from 'next/link';

export const metadata = { title: 'Painel — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = (await getUser())!;
  const supabase = await createClient();
  const hoje = new Date();
  const inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();

  const [{ data: profile }, { data: stats }, { data: hojeAttempts }, dueCount, { data: ultimas }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('v_discipline_stats').select('*').eq('user_id', user.id),
      supabase.from('attempts').select('correct').gte('answered_at', inicioDoDia),
      supabase
        .from('reviews')
        .select('question_id', { count: 'exact', head: true })
        .lte('due_on', new Date().toISOString().slice(0, 10)),
      supabase
        .from('exam_sessions')
        .select('id, kind, total, correct, finished_at')
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })
        .limit(5),
    ]);

  const { data: allDisciplines } = await supabase
    .from('disciplines')
    .select('*')
    .order('chapter');

  const statMap = new Map<number, DisciplineStats>(
    (stats ?? []).map((s) => [s.discipline_id as number, s as DisciplineStats])
  );

  const metaDiaria = profile?.daily_goal ?? 20;
  const respondidasHoje = hojeAttempts?.length ?? 0;
  const acertosHoje = (hojeAttempts ?? []).filter((a) => a.correct).length;
  const revisoesHoje = dueCount.count ?? 0;

  // projeção ponderada: acurácia de cada disciplina × nº de questões na prova
  let pontosProjetados = 0;
  let pesoAvaliado = 0;
  for (const d of allDisciplines ?? []) {
    const s = statMap.get(d.id);
    if (!s?.accuracy || !d.question_count) continue;
    pontosProjetados += (Number(s.accuracy) / 100) * d.question_count;
    pesoAvaliado += d.question_count;
  }
  const projecao = pesoAvaliado ? Math.round(pontosProjetados) : null;

  const diasRestantes = profile?.exam_date
    ? Math.ceil((new Date(profile.exam_date + 'T12:00:00').getTime() - Date.now()) / 86400000)
    : null;

  const zeradas = (allDisciplines ?? []).filter(
    (d) => d.question_count > 0 && !statMap.get(d.id)?.answered
  );

  const blocoAtual =
    diasRestantes !== null && diasRestantes > 0 && diasRestantes <= 30
      ? PLAN_30.find((b) => b.days.includes(31 - diasRestantes))
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Painel de estudo</h1>
          <p className="text-sm text-slate-500">
            60 questões objetivas + redação (20 pontos). Aprovação exige 50% do total e nenhuma
            disciplina zerada.
          </p>
        </div>
        <div className="flex gap-2">
          <ActionLink href="/questoes">Treinar questões</ActionLink>
          <ActionLink href="/revisao" variant="ghost">
            Revisar {revisoesHoje > 0 ? `(${revisoesHoje})` : ''}
          </ActionLink>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Hoje"
          value={`${respondidasHoje}/${metaDiaria}`}
          hint={`${acertosHoje} acertos · meta diária`}
          tone={respondidasHoje >= metaDiaria ? 'good' : 'default'}
        />
        <Stat
          label="Revisões vencidas"
          value={revisoesHoje}
          hint="questões que o sistema marcou para hoje"
          tone={revisoesHoje > 0 ? 'warn' : 'good'}
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
          tone={projecao === null ? 'default' : projecao >= 40 ? 'good' : projecao >= 30 ? 'warn' : 'bad'}
        />
        <Stat
          label="Dias até a prova"
          value={diasRestantes === null ? '—' : diasRestantes > 0 ? diasRestantes : 'hoje'}
          hint={profile?.exam_date ? 'conforme data informada' : 'informe a data abaixo'}
        />
      </div>

      {blocoAtual && (
        <Card title={`Plano de 30 dias — ${blocoAtual.range}`} subtitle="Você está nesta etapa hoje">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-brand-50 p-3">
              <dt className="text-xs font-semibold text-brand-700 uppercase">Manhã (2h)</dt>
              <dd className="mt-1 text-sm text-slate-700">{blocoAtual.morning}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs font-semibold text-slate-600 uppercase">Noite (2h)</dt>
              <dd className="mt-1 text-sm text-slate-700">{blocoAtual.night}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card
        title="Desempenho por disciplina"
        subtitle="Ordenado pelo peso real na prova (Tabela 8.1 do edital)"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                <th className="py-2 pr-3">Disciplina</th>
                <th className="py-2 pr-3">Questões na prova</th>
                <th className="py-2 pr-3">Respondidas</th>
                <th className="py-2 pr-3">Acerto</th>
                <th className="py-2">Prioridade</th>
              </tr>
            </thead>
            <tbody>
              {(allDisciplines ?? [])
                .slice()
                .sort((a, b) => b.question_count - a.question_count || a.chapter - b.chapter)
                .map((d) => {
                  const s = statMap.get(d.id);
                  const acc = s?.accuracy ? Number(s.accuracy) : null;
                  return (
                    <tr key={d.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-3">
                        <Link href={`/materias/${d.slug}`} className="font-medium hover:underline">
                          {d.name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">
                        {d.question_count || '—'}
                        {d.question_count ? (
                          <span className="ml-1 text-xs text-slate-400">({d.weight}%)</span>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">{s?.answered ?? 0}</td>
                      <td className="w-40 py-2.5 pr-3">
                        {acc === null ? (
                          <span className="text-slate-400">sem dados</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Bar percent={acc} tone="auto" />
                            <span className="w-12 text-right font-medium tabular-nums">{acc}%</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5">
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
        <Card
          title="Atenção: disciplinas sem nenhuma questão respondida"
          subtitle="Zerar uma única disciplina elimina o candidato, mesmo com nota alta nas demais."
        >
          <ul className="flex flex-wrap gap-2">
            {zeradas.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/questoes?disciplina=${d.slug}`}
                  className="inline-flex items-center rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 ring-1 ring-red-100 hover:bg-red-100"
                >
                  {d.name} →
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Últimas sessões">
          {!ultimas?.length ? (
            <Empty>Nenhuma sessão concluída ainda. Comece por um treino de questões.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {ultimas.map((s) => {
                const pct = s.total ? Math.round((100 * s.correct) / s.total) : 0;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="capitalize">{s.kind}</span>
                    <span className="text-slate-500">
                      {new Date(s.finished_at!).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {s.correct}/{s.total}{' '}
                      <span
                        className={
                          pct >= 70 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700'
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
          <ExamDateForm
            examDate={profile?.exam_date ?? ''}
            dailyGoal={profile?.daily_goal ?? 20}
          />
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-100">
            {GOLDEN_RULE}
          </p>
        </Card>
      </div>
    </div>
  );
}
