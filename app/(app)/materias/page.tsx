import Link from 'next/link';
import { BookOpen, ListChecks } from 'lucide-react';
import { createClient, getUser } from '@/lib/supabase/server';
import { Badge, Bar } from '@/components/ui';
import { PRIORITY_CLASS, PRIORITY_LABEL } from '@/lib/types';

export const metadata = { title: 'Matérias — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function MateriasPage() {
  const user = (await getUser())!;
  const supabase = await createClient();

  const [{ data: disciplines }, { data: topics }, { data: progress }, { data: counts }] =
    await Promise.all([
      supabase.from('disciplines').select('*').order('chapter'),
      supabase.from('topics').select('id, discipline_id, reading_minutes'),
      supabase.from('topic_progress').select('topic_id, status').eq('user_id', user.id),
      supabase.from('questions').select('discipline_id').neq('source', 'simulado'),
    ]);

  const porDisciplina = new Map<number, { ids: number[]; minutos: number }>();
  for (const t of topics ?? []) {
    const e = porDisciplina.get(t.discipline_id) ?? { ids: [], minutos: 0 };
    e.ids.push(t.id);
    e.minutos += t.reading_minutes ?? 3;
    porDisciplina.set(t.discipline_id, e);
  }

  const lidos = new Set((progress ?? []).filter((p) => p.status === 'lido').map((p) => p.topic_id));
  const qCount = new Map<number, number>();
  for (const q of counts ?? []) {
    if (q.discipline_id) qCount.set(q.discipline_id, (qCount.get(q.discipline_id) ?? 0) + 1);
  }

  const totalTopicos = topics?.length ?? 0;
  const totalLidos = (topics ?? []).filter((t) => lidos.has(t.id)).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">Matérias</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Teoria da apostila dividida por tópico, com tabelas, destaques e marcação do que você já
          estudou.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Progresso geral</span>
          <span className="text-slate-500 tabular-nums dark:text-slate-400">
            {totalLidos}/{totalTopicos} tópicos
          </span>
        </div>
        <Bar percent={totalTopicos ? (100 * totalLidos) / totalTopicos : 0} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(disciplines ?? []).map((d) => {
          const info = porDisciplina.get(d.id) ?? { ids: [], minutos: 0 };
          const read = info.ids.filter((id) => lidos.has(id)).length;
          const pct = info.ids.length ? Math.round((100 * read) / info.ids.length) : 0;

          return (
            <section
              key={d.id}
              className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-400">Capítulo {d.chapter}</p>
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                    <Link href={`/materias/${d.slug}`} className="hover:underline">
                      {d.name}
                    </Link>
                  </h2>
                </div>
                <Badge className={PRIORITY_CLASS[d.priority as keyof typeof PRIORITY_CLASS]}>
                  {PRIORITY_LABEL[d.priority as keyof typeof PRIORITY_LABEL].replace('Prioridade ', '')}
                </Badge>
              </div>

              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {d.question_count
                  ? `${d.question_count} questões na prova (${d.weight}%)`
                  : 'Prova de redação — 20 pontos'}
                {' · '}
                {info.ids.length} tópicos · {info.minutos} min
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Bar percent={pct} />
                <span className="w-20 shrink-0 text-right text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  {read}/{info.ids.length} lidos
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/materias/${d.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
                >
                  <BookOpen size={15} /> Estudar
                </Link>
                {(qCount.get(d.id) ?? 0) > 0 && (
                  <Link
                    href={`/questoes?disciplina=${d.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    <ListChecks size={15} /> {qCount.get(d.id)} questões
                  </Link>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
