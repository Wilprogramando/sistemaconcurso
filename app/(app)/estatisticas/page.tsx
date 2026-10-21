import Link from 'next/link';
import { createClient, getUser } from '@/lib/supabase/server';
import { Bar, Card, Empty, Stat } from '@/components/ui';
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
        .order('finished_at', { ascending: false })
        .limit(20),
      supabase.from('reviews').select('due_on, repetitions, lapses').eq('user_id', user.id),
    ]);

  const comDados = ((stats ?? []) as DisciplineStats[]).filter((s) => s.answered > 0);
  const totalRespondidas = comDados.reduce((a, s) => a + s.answered, 0);
  const totalAcertos = comDados.reduce((a, s) => a + s.correct, 0);
  const geral = totalRespondidas ? Math.round((100 * totalAcertos) / totalRespondidas) : null;

  // últimos 14 dias
  const porDia = new Map<string, { total: number; correct: number }>();
  for (const a of attempts ?? []) {
    const dia = a.answered_at.slice(0, 10);
    const e = porDia.get(dia) ?? { total: 0, correct: 0 };
    e.total += 1;
    if (a.correct) e.correct += 1;
    porDia.set(dia, e);
  }
  const dias: { dia: string; total: number; correct: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const e = porDia.get(d) ?? { total: 0, correct: 0 };
    dias.push({ dia: d, ...e });
  }
  const maxDia = Math.max(1, ...dias.map((d) => d.total));

  const estudadas = reviews?.length ?? 0;
  const dominadas = (reviews ?? []).filter((r) => r.repetitions >= 3 && r.lapses === 0).length;
  const sequencia = diasConsecutivos(dias);

  const fracas = comDados
    .filter((s) => s.accuracy !== null)
    .slice()
    .sort(
      (a, b) =>
        Number(a.accuracy) * (1 / Math.max(1, a.question_count)) -
        Number(b.accuracy) * (1 / Math.max(1, b.question_count))
    )
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">Estatísticas</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Seu desempenho real, ponderado pelo peso de cada disciplina na prova.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Questões respondidas" value={totalRespondidas} hint="todas as sessões" />
        <Stat
          label="Acerto geral"
          value={geral === null ? '—' : `${geral}%`}
          tone={geral === null ? 'default' : geral >= 70 ? 'good' : geral >= 50 ? 'warn' : 'bad'}
        />
        <Stat
          label="Questões dominadas"
          value={`${dominadas}/${estudadas}`}
          hint="3 acertos seguidos, sem recaída"
        />
        <Stat label="Sequência de dias" value={sequencia} hint="dias consecutivos estudando" />
      </div>

      <Card title="Últimos 14 dias" subtitle="Questões respondidas por dia (verde = acertos)">
        {!attempts?.length ? (
          <Empty>Nenhuma questão respondida nos últimos 30 dias.</Empty>
        ) : (
          <ul className="flex items-end gap-1.5 overflow-x-auto pb-1">
            {dias.map((d) => {
              const h = Math.round((d.total / maxDia) * 96);
              const hc = d.total ? Math.round((d.correct / d.total) * h) : 0;
              return (
                <li key={d.dia} className="flex w-10 shrink-0 flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-500 tabular-nums dark:text-slate-400">{d.total || ''}</span>
                  <div
                    className="flex w-6 flex-col justify-end overflow-hidden rounded-t bg-slate-200 dark:bg-slate-700"
                    style={{ height: 96 }}
                    title={`${d.total} questões, ${d.correct} corretas`}
                  >
                    <div className="w-full bg-slate-300 dark:bg-slate-600" style={{ height: h - hc }} />
                    <div className="w-full bg-emerald-500" style={{ height: hc }} />
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {new Date(d.dia + 'T12:00:00').toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {fracas.length > 0 && (
        <Card
          title="Onde investir o tempo agora"
          subtitle="Pior acerto cruzado com maior peso na prova"
        >
          <ul className="space-y-3">
            {fracas.map((s) => (
              <li key={s.discipline_id} className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/questoes?disciplina=${s.slug}`}
                  className="min-w-56 flex-1 font-medium text-brand-700 hover:underline"
                >
                  {s.name}
                </Link>
                <span className="text-sm text-slate-500 dark:text-slate-400">{s.question_count} questões na prova</span>
                <div className="flex min-w-40 flex-1 items-center gap-2">
                  <Bar percent={Number(s.accuracy)} tone="auto" />
                  <span className="w-12 text-right text-sm font-semibold tabular-nums">
                    {s.accuracy}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Histórico de sessões">
        {!sessions?.length ? (
          <Empty>Nenhuma sessão concluída ainda.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase dark:border-slate-700 dark:text-slate-400">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Resultado</th>
                  <th className="py-2 pr-3">%</th>
                  <th className="py-2">Duração</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const pct = s.total ? Math.round((100 * s.correct) / s.total) : 0;
                  return (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
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
                      <td
                        className={`py-2.5 pr-3 font-semibold tabular-nums ${
                          pct >= 70 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700'
                        }`}
                      >
                        {pct}%
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
        )}
      </Card>
    </div>
  );
}

function diasConsecutivos(dias: { dia: string; total: number }[]) {
  let n = 0;
  for (let i = dias.length - 1; i >= 0; i--) {
    if (dias[i].total > 0) n += 1;
    else if (i !== dias.length - 1) break;
  }
  return n;
}
