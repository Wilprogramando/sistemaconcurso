import Link from 'next/link';
import { Activity, CalendarCheck, Flame, Target, TrendingUp, Trophy } from 'lucide-react';
import { createClient, getUser } from '@/lib/supabase/server';
import { Card, Empty, Stat } from '@/components/ui';
import { BarrasDiarias, LinhaEvolucao, Medidor, type Dia, type Ponto } from '@/components/graficos';
import type { DisciplineStats } from '@/lib/types';

export const metadata = { title: 'Estatísticas — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function EstatisticasPage() {
  const user = (await getUser())!;
  const supabase = await createClient();
  const desde = new Date(Date.now() - 29 * 86400000).toISOString();

  const [{ data: stats }, { data: attempts }, { data: sessions }, { data: reviews }] =
    await Promise.all([
      supabase.from('v_discipline_stats').select('*').eq('user_id', user.id),
      supabase
        .from('attempts')
        .select('correct, answered_at')
        .eq('user_id', user.id)
        .gte('answered_at', desde),
      supabase
        .from('exam_sessions')
        .select('id, kind, total, correct, finished_at, duration_seconds')
        .eq('user_id', user.id)
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: true })
        .limit(40),
      supabase.from('reviews').select('due_on, repetitions, lapses').eq('user_id', user.id),
    ]);

  const comDados = ((stats ?? []) as DisciplineStats[]).filter((s) => s.answered > 0);
  const totalRespondidas = comDados.reduce((a, s) => a + s.answered, 0);
  const totalAcertos = comDados.reduce((a, s) => a + s.correct, 0);
  const geral = totalRespondidas ? Math.round((100 * totalAcertos) / totalRespondidas) : null;

  // últimos 14 dias
  const porDia = new Map<string, { total: number; acertos: number }>();
  for (const a of attempts ?? []) {
    const dia = a.answered_at.slice(0, 10);
    const e = porDia.get(dia) ?? { total: 0, acertos: 0 };
    e.total += 1;
    if (a.correct) e.acertos += 1;
    porDia.set(dia, e);
  }
  const dias: Dia[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    dias.push({ dia: d, ...(porDia.get(d) ?? { total: 0, acertos: 0 }) });
  }

  const estudadas = reviews?.length ?? 0;
  const dominadas = (reviews ?? []).filter((r) => r.repetitions >= 3 && r.lapses === 0).length;
  const sequencia = diasConsecutivos(dias);
  const diasAtivos = dias.filter((d) => d.total > 0).length;

  // evolução por sessão
  const pontos: Ponto[] = (sessions ?? [])
    .filter((s) => s.total >= 5)
    .map((s) => ({
      rotulo: new Date(s.finished_at!).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
      valor: Math.round((100 * s.correct) / s.total),
      detalhe: `${s.kind} · ${s.correct}/${s.total}`,
    }));

  const fracas = comDados
    .filter((s) => s.accuracy !== null)
    .slice()
    .sort((a, b) => {
      // prioridade = pouco acerto × muito peso
      const pa = (100 - Number(a.accuracy)) * a.question_count;
      const pb = (100 - Number(b.accuracy)) * b.question_count;
      return pb - pa;
    })
    .slice(0, 4);

  const recentes = (sessions ?? []).slice().reverse().slice(0, 15);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
          Estatísticas
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Seu desempenho real, ponderado pelo peso de cada disciplina na prova.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Questões respondidas"
          value={totalRespondidas}
          hint="em todas as sessões"
          icon={Activity}
          tone="brand"
        />
        <Stat
          label="Acerto geral"
          value={geral === null ? '—' : `${geral}%`}
          hint={geral === null ? 'sem dados ainda' : `${totalAcertos} de ${totalRespondidas}`}
          icon={Target}
          tone={geral === null ? 'default' : geral >= 70 ? 'good' : geral >= 50 ? 'warn' : 'bad'}
        />
        <Stat
          label="Questões dominadas"
          value={`${dominadas}/${estudadas}`}
          hint="3 acertos seguidos, sem recaída"
          icon={Trophy}
          tone="good"
        />
        <Stat
          label="Sequência"
          value={`${sequencia} ${sequencia === 1 ? 'dia' : 'dias'}`}
          hint={`${diasAtivos} dias ativos nas últimas 2 semanas`}
          icon={Flame}
          tone={sequencia >= 3 ? 'good' : 'default'}
        />
      </div>

      <Card
        title="Últimos 14 dias"
        subtitle="Quantas questões por dia, e quanto você acertou em cada uma"
        icon={CalendarCheck}
      >
        {!attempts?.length ? (
          <Empty>Nenhuma questão respondida nos últimos 30 dias.</Empty>
        ) : (
          <BarrasDiarias dias={dias} />
        )}
      </Card>

      {pontos.length >= 2 && (
        <Card
          title="Evolução do acerto"
          subtitle="Percentual de acerto a cada sessão de 5 questões ou mais"
          icon={TrendingUp}
        >
          <LinhaEvolucao pontos={pontos} meta={70} />
        </Card>
      )}

      {fracas.length > 0 && (
        <Card
          title="Onde investir o tempo agora"
          subtitle="Ordenado pelo prejuízo real: quanto você erra × quanto a disciplina pesa"
          icon={Target}
        >
          <ul className="space-y-4">
            {fracas.map((s) => {
              const acc = Number(s.accuracy);
              const perdaEstimada = Math.round(((100 - acc) / 100) * s.question_count * 10) / 10;
              return (
                <li key={s.discipline_id}>
                  <Medidor
                    valor={acc}
                    meta={70}
                    destaque
                    label={
                      <Link href={`/questoes?disciplina=${s.slug}`} className="hover:underline">
                        {s.name}
                      </Link>
                    }
                    sublabel={`${s.question_count} questões na prova · nesse ritmo você perderia cerca de ${perdaEstimada} ponto(s) aqui`}
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card title="Histórico de sessões">
        {!recentes.length ? (
          <Empty>Nenhuma sessão concluída ainda.</Empty>
        ) : (
          <>
            {/* celular: lista */}
            <ul className="space-y-2 sm:hidden">
              {recentes.map((s) => {
                const pct = s.total ? Math.round((100 * s.correct) / s.total) : 0;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-slate-200 dark:ring-slate-700"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize">{s.kind}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(s.finished_at!).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {s.duration_seconds ? ` · ${Math.round(s.duration_seconds / 60)} min` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold tabular-nums">
                        {s.correct}/{s.total}
                      </span>
                      <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
                        {pct}%
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* desktop: tabela */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[0.7rem] tracking-wider text-slate-500 uppercase dark:border-slate-700 dark:text-slate-400">
                    <th className="py-2.5 pr-3 font-semibold">Data</th>
                    <th className="py-2.5 pr-3 font-semibold">Tipo</th>
                    <th className="py-2.5 pr-3 font-semibold">Resultado</th>
                    <th className="py-2.5 pr-3 font-semibold">Acerto</th>
                    <th className="py-2.5 font-semibold">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {recentes.map((s) => {
                    const pct = s.total ? Math.round((100 * s.correct) / s.total) : 0;
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                      >
                        <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-400">
                          {new Date(s.finished_at!).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 pr-3 capitalize">{s.kind}</td>
                        <td className="py-2.5 pr-3 tabular-nums">
                          {s.correct}/{s.total}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="inline-block min-w-12 rounded-md bg-slate-100 px-2 py-0.5 text-center font-semibold tabular-nums dark:bg-slate-800">
                            {pct}%
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-600 tabular-nums dark:text-slate-400">
                          {s.duration_seconds ? `${Math.round(s.duration_seconds / 60)} min` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function diasConsecutivos(dias: { total: number }[]) {
  let n = 0;
  for (let i = dias.length - 1; i >= 0; i--) {
    if (dias[i].total > 0) n += 1;
    else if (i !== dias.length - 1) break;
  }
  return n;
}
