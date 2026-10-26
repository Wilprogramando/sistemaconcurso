import Link from 'next/link';
import { Activity, CalendarCheck, Flame, Target, TrendingUp, Trophy } from 'lucide-react';
import { createClient, getUserId } from '@/lib/supabase/server';
import { Anel, Card, Empty } from '@/components/ui';
import Contador from '@/components/contador';
import { BarrasDiarias, LinhaEvolucao, Medidor, type Dia, type Ponto } from '@/components/graficos';
import type { DisciplineStats } from '@/lib/types';

export const metadata = { title: 'Estatísticas — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function EstatisticasPage() {
  const user = { id: (await getUserId())! };
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

  const linhas = [
    {
      icone: Activity,
      label: 'Questões respondidas',
      valor: totalRespondidas.toLocaleString('pt-BR'),
      nota: 'em todas as sessões',
    },
    {
      icone: Trophy,
      label: 'Questões dominadas',
      valor: `${dominadas}/${estudadas}`,
      nota: '3 acertos seguidos, sem recaída',
    },
    {
      icone: Flame,
      label: 'Sequência',
      valor: `${sequencia} ${sequencia === 1 ? 'dia' : 'dias'}`,
      nota: `${diasAtivos} de 14 dias ativos`,
    },
  ];

  return (
    <div className="entra space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
          Estatísticas
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Seu desempenho real, ponderado pelo peso de cada disciplina na prova.
        </p>
      </div>

      {/* Placar: o acerto geral é a razão que manda na tela, então ocupa o
          anel; os outros três números ficam quietos ao lado, em linha. */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200/80 sm:p-6 dark:bg-slate-900 dark:ring-slate-700/70">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
          <Anel
            valor={geral}
            meta={geral === null ? undefined : 70}
            rotulo={geral === null ? 'sem dados' : `acerto geral de ${geral}%`}
          >
            <span>
              <span className="block text-4xl leading-none font-bold text-slate-900 tabular-nums dark:text-slate-100">
                {geral === null ? '—' : <Contador para={geral} sufixo="%" />}
              </span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">acerto</span>
            </span>
          </Anel>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {geral === null
                ? 'Sem questões respondidas ainda'
                : geral >= 70
                  ? 'Acima da meta de 70%'
                  : `Faltam ${70 - geral} pontos para a meta de 70%`}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {geral === null
                ? 'Treine uma rodada de questões e o placar começa a contar.'
                : `${totalAcertos.toLocaleString('pt-BR')} acertos em ${totalRespondidas.toLocaleString('pt-BR')} questões. O risco na trilha é a meta.`}
            </p>

            <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-slate-200 pt-4 sm:grid-cols-3 dark:border-slate-700/70">
              {linhas.map((l) => {
                const Icone = l.icone;
                return (
                  <div key={l.label} className="flex items-start gap-2.5">
                    <Icone size={16} className="mt-1 shrink-0 text-slate-400 dark:text-slate-500" />
                    <div className="min-w-0">
                      <dd className="text-xl leading-tight font-bold text-slate-900 tabular-nums dark:text-slate-100">
                        {l.valor}
                      </dd>
                      <dt className="text-sm text-slate-600 dark:text-slate-300">{l.label}</dt>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{l.nota}</p>
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </section>

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
                  <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
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
