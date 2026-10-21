import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import TopicStatus from './topic-status';

export const dynamic = 'force-dynamic';

export default async function TopicoPage({
  params,
}: {
  params: Promise<{ slug: string; ref: string }>;
}) {
  const { slug, ref } = await params;
  const user = (await getUser())!;
  const supabase = await createClient();

  const { data: d } = await supabase
    .from('disciplines')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle();
  if (!d) notFound();

  const [{ data: topic }, { data: siblings }] = await Promise.all([
    supabase
      .from('topics')
      .select('*')
      .eq('discipline_id', d.id)
      .eq('ref', decodeURIComponent(ref))
      .maybeSingle(),
    supabase.from('topics').select('id, ref, title, ord').eq('discipline_id', d.id).order('ord'),
  ]);
  if (!topic) notFound();

  const { data: progress } = await supabase
    .from('topic_progress')
    .select('status')
    .eq('user_id', user.id)
    .eq('topic_id', topic.id)
    .maybeSingle();

  const idx = (siblings ?? []).findIndex((t) => t.id === topic.id);
  const prev = idx > 0 ? siblings![idx - 1] : null;
  const next = idx >= 0 && idx < (siblings?.length ?? 0) - 1 ? siblings![idx + 1] : null;

  return (
    <article className="space-y-5">
      <div>
        <Link href={`/materias/${d.slug}`} className="text-sm text-brand-700 hover:underline">
          ← {d.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          <span className="text-slate-400">{topic.ref}</span> {topic.title}
        </h1>
      </div>

      <TopicStatus topicId={topic.id} current={progress?.status ?? null} />

      <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200/70">
        <div className="apostila-mono text-slate-800">{topic.body}</div>
      </div>

      <nav className="flex flex-wrap justify-between gap-3 text-sm">
        {prev ? (
          <Link
            href={`/materias/${d.slug}/${prev.ref}`}
            className="rounded-lg bg-white px-4 py-2 font-medium text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            ← {prev.ref} {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/materias/${d.slug}/${next.ref}`}
            className="rounded-lg bg-white px-4 py-2 font-medium text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            {next.ref} {next.title} →
          </Link>
        ) : (
          <Link
            href={`/questoes?disciplina=${d.slug}`}
            className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
          >
            Treinar as questões desta matéria →
          </Link>
        )}
      </nav>
    </article>
  );
}
