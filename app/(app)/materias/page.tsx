import Link from 'next/link';
import { createClient, getUser } from '@/lib/supabase/server';
import { Badge, Bar, Card } from '@/components/ui';
import { PRIORITY_CLASS, PRIORITY_LABEL } from '@/lib/types';

export const metadata = { title: 'Matérias — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function MateriasPage() {
  const user = (await getUser())!;
  const supabase = await createClient();

  const [{ data: disciplines }, { data: topics }, { data: progress }, { data: counts }] =
    await Promise.all([
      supabase.from('disciplines').select('*').order('chapter'),
      supabase.from('topics').select('id, discipline_id'),
      supabase.from('topic_progress').select('topic_id, status').eq('user_id', user.id),
      supabase.from('questions').select('id, discipline_id').eq('source', 'apostila'),
    ]);

  const topicsBy = new Map<number, number[]>();
  for (const t of topics ?? []) {
    const arr = topicsBy.get(t.discipline_id) ?? [];
    arr.push(t.id);
    topicsBy.set(t.discipline_id, arr);
  }
  const lidos = new Set((progress ?? []).filter((p) => p.status === 'lido').map((p) => p.topic_id));
  const qCount = new Map<number, number>();
  for (const q of counts ?? []) {
    if (q.discipline_id) qCount.set(q.discipline_id, (qCount.get(q.discipline_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Matérias</h1>
        <p className="text-sm text-slate-500">
          Teoria da apostila dividida por tópico. Marque cada tópico como lido para acompanhar o
          avanço.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(disciplines ?? []).map((d) => {
          const ids = topicsBy.get(d.id) ?? [];
          const read = ids.filter((id) => lidos.has(id)).length;
          const pct = ids.length ? Math.round((100 * read) / ids.length) : 0;

          return (
            <Card key={d.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Capítulo {d.chapter}</p>
                  <h2 className="font-semibold text-slate-900">
                    <Link href={`/materias/${d.slug}`} className="hover:underline">
                      {d.name}
                    </Link>
                  </h2>
                </div>
                <Badge className={PRIORITY_CLASS[d.priority as keyof typeof PRIORITY_CLASS]}>
                  {PRIORITY_LABEL[d.priority as keyof typeof PRIORITY_LABEL]}
                </Badge>
              </div>

              <p className="mt-2 text-sm text-slate-600">
                {d.question_count ? `${d.question_count} questões na prova (${d.weight}%)` : 'Prova de redação — 20 pontos'}
                {' · '}
                {ids.length} tópicos · {qCount.get(d.id) ?? 0} questões comentadas
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Bar percent={pct} />
                <span className="w-20 text-right text-xs text-slate-500 tabular-nums">
                  {read}/{ids.length} lidos
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/materias/${d.slug}`}
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50"
                >
                  Ver teoria
                </Link>
                {(qCount.get(d.id) ?? 0) > 0 && (
                  <Link
                    href={`/questoes?disciplina=${d.slug}`}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Treinar questões
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
