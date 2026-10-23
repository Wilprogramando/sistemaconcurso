import Link from 'next/link';
import { BookOpen, Clock, ListChecks, Scale, SignalHigh, Target } from 'lucide-react';
import { createClient, getUser } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { PRIORITY_CLASS, PRIORITY_LABEL } from '@/lib/types';
import { visualDe } from '@/lib/disciplinas-visual';

export const metadata = { title: 'Matérias — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function MateriasPage() {
  const user = (await getUser())!;
  const supabase = await createClient();

  const [{ data: disciplines }, { data: topics }, { data: progress }, { data: counts }] =
    await Promise.all([
      // ordem de estudo: o que mais cai na prova primeiro; empate volta ao
      // capítulo da apostila. A redação fica no fim por não ter questões.
      supabase
        .from('disciplines')
        .select('*')
        .order('question_count', { ascending: false })
        .order('chapter'),
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
  const pctGeral = totalTopicos ? Math.round((100 * totalLidos) / totalTopicos) : 0;

  return (
    <div className="space-y-4">
      {/* ---------------- faixa de título ---------------- */}
      <header className="relative overflow-hidden rounded-2xl bg-brand-900 px-5 py-6 text-white sm:px-7 dark:bg-slate-900">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-8 -right-10 h-48 w-64 rotate-12 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #fff 0 3px, transparent 3px 22px)',
          }}
        />
        <div className="relative flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15">
            <BookOpen size={24} />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-bold sm:text-3xl">Matérias</h1>
            <p className="mt-1 text-sm text-brand-100">
              Teoria da apostila dividida por tópico, com aula didática, tabelas e marcação do que
              você já estudou. A lista vem na ordem do que mais vale na prova.
            </p>
          </div>
        </div>
      </header>

      {/* ---------------- progresso geral ---------------- */}
      <Card className="!py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Target size={20} className="shrink-0 text-brand-600 dark:text-brand-300" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">Progresso geral</span>
          <span className="ml-auto text-sm font-medium text-slate-500 tabular-nums dark:text-slate-400">
            {totalLidos}/{totalTopicos} tópicos
          </span>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${pctGeral}%` }}
            />
          </div>
        </div>
      </Card>

      {/* ---------------- grade de matérias ---------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(disciplines ?? []).map((d, i) => {
          const info = porDisciplina.get(d.id) ?? { ids: [], minutos: 0 };
          const read = info.ids.filter((id) => lidos.has(id)).length;
          const pct = info.ids.length ? Math.round((100 * read) / info.ids.length) : 0;
          const visual = visualDe(d.slug);
          const Icone = visual.icone;
          const questoes = qCount.get(d.id) ?? 0;

          return (
            <section
              key={d.id}
              className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-slate-200 transition hover:ring-brand-400 dark:bg-slate-900 dark:ring-slate-700"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${visual.tile}`}
                >
                  <Icone size={23} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-400">
                    {d.question_count ? `º em peso · ` : ''}Capítulo {d.chapter}
                  </p>
                  <h2 className="text-lg leading-snug font-bold text-slate-900 dark:text-slate-100">
                    <Link href={`/materias/${d.slug}`} className="hover:underline">
                      {d.name}
                    </Link>
                  </h2>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                    PRIORITY_CLASS[d.priority as keyof typeof PRIORITY_CLASS]
                  }`}
                >
                  {PRIORITY_LABEL[d.priority as keyof typeof PRIORITY_LABEL]
                    .replace('Prioridade ', '')
                    .toLowerCase()}
                </span>
              </div>

              {d.summary && (
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {d.summary}
                </p>
              )}

              <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <SignalHigh size={14} className="text-brand-600 dark:text-brand-300" />
                  <dt className="sr-only">Peso na prova</dt>
                  <dd>
                    {d.question_count
                      ? `${d.question_count} questões na prova (${d.weight}%)`
                      : 'Redação — 20 pontos'}
                  </dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  <dt className="sr-only">Volume de leitura</dt>
                  <dd>
                    {info.ids.length} tópicos · {info.minutos} min
                  </dd>
                </div>
              </dl>

              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  {read}/{info.ids.length} tópicos
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/materias/${d.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600"
                >
                  <BookOpen size={16} /> Estudar
                </Link>
                {questoes > 0 && (
                  <Link
                    href={`/questoes?disciplina=${d.slug}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
                  >
                    <ListChecks size={16} /> {questoes} questões
                  </Link>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* ---------------- tabela comparativa ---------------- */}
      <Card
        title="Qual é a diferença entre as matérias de Direito?"
        subtitle="A pergunta que cada uma responde — é o atalho para não confundir uma com a outra"
        icon={Scale}
      >
        <ul className="space-y-2">
          {(disciplines ?? [])
            .filter((d) => d.answers_question)
            .map((d) => {
              const visual = visualDe(d.slug);
              const Icone = visual.icone;
              return (
                <li
                  key={d.id}
                  className="flex flex-col gap-1.5 rounded-xl bg-slate-50 p-3.5 sm:flex-row sm:items-center sm:gap-4 dark:bg-slate-800/60"
                >
                  <Link
                    href={`/materias/${d.slug}`}
                    className="flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline sm:w-60 dark:text-brand-300"
                  >
                    <span className={`grid h-6 w-6 place-items-center rounded-md ${visual.tile}`}>
                      <Icone size={13} />
                    </span>
                    {d.name}
                  </Link>
                  <span className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {d.answers_question}
                  </span>
                </li>
              );
            })}
        </ul>
      </Card>
    </div>
  );
}
