import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { ActionLink, Badge, Bar, Card } from '@/components/ui';
import { PRIORITY_CLASS, PRIORITY_LABEL } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DisciplinaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = (await getUser())!;
  const supabase = await createClient();

  const { data: d } = await supabase.from('disciplines').select('*').eq('slug', slug).maybeSingle();
  if (!d) notFound();

  const [{ data: topics }, { data: progress }, { count: qTotal }] = await Promise.all([
    supabase.from('topics').select('*').eq('discipline_id', d.id).order('ord'),
    supabase.from('topic_progress').select('topic_id, status').eq('user_id', user.id),
    supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('discipline_id', d.id)
      .eq('source', 'apostila'),
  ]);

  const status = new Map((progress ?? []).map((p) => [p.topic_id, p.status]));
  const lidos = (topics ?? []).filter((t) => status.get(t.id) === 'lido').length;
  const pct = topics?.length ? Math.round((100 * lidos) / topics.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/materias" className="text-sm text-brand-700 hover:underline">
          ← Matérias
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{d.name}</h1>
          <Badge className={PRIORITY_CLASS[d.priority as keyof typeof PRIORITY_CLASS]}>
            {PRIORITY_LABEL[d.priority as keyof typeof PRIORITY_LABEL]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {d.question_count
            ? `${d.question_count} das 60 questões objetivas (${d.weight}% da prova)`
            : 'Prova de redação — 20 pontos'}
          {' · '}
          {topics?.length ?? 0} tópicos · {qTotal ?? 0} questões comentadas
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-48 flex-1">
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium text-slate-700">Progresso da teoria</span>
              <span className="text-slate-500 tabular-nums">
                {lidos}/{topics?.length ?? 0}
              </span>
            </div>
            <Bar percent={pct} />
          </div>
          {(qTotal ?? 0) > 0 && (
            <ActionLink href={`/questoes?disciplina=${d.slug}`}>Treinar questões</ActionLink>
          )}
        </div>
      </Card>

      <ol className="space-y-2">
        {(topics ?? []).map((t) => {
          const st = status.get(t.id);
          return (
            <li key={t.id}>
              <Link
                href={`/materias/${d.slug}/${t.ref}`}
                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200/70 transition hover:ring-brand-500"
              >
                <span className="w-10 shrink-0 text-sm font-semibold text-slate-400 tabular-nums">
                  {t.ref}
                </span>
                <span className="flex-1 text-sm font-medium text-slate-800">{t.title}</span>
                {st === 'lido' && (
                  <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-200">lido</Badge>
                )}
                {st === 'revisar' && (
                  <Badge className="bg-amber-100 text-amber-900 ring-amber-200">revisar</Badge>
                )}
                {st === 'lendo' && (
                  <Badge className="bg-sky-100 text-sky-900 ring-sky-200">lendo</Badge>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
