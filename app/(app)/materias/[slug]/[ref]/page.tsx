import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Clock, ListChecks } from 'lucide-react';
import { createClient, getUser } from '@/lib/supabase/server';
import Blocos, { type Bloco } from '@/components/blocos';
import TopicStatus from './topic-status';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return { title: `Tópico ${decodeURIComponent(ref)} — Estudo PM SC 2026` };
}

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

  const [{ data: topic }, { data: irmaos }] = await Promise.all([
    supabase
      .from('topics')
      .select('*')
      .eq('discipline_id', d.id)
      .eq('ref', decodeURIComponent(ref))
      .maybeSingle(),
    supabase.from('topics').select('id, ref, title, ord').eq('discipline_id', d.id).order('ord'),
  ]);
  if (!topic) notFound();

  const { data: progresso } = await supabase
    .from('topic_progress')
    .select('status')
    .eq('user_id', user.id)
    .eq('topic_id', topic.id)
    .maybeSingle();

  const idx = (irmaos ?? []).findIndex((t) => t.id === topic.id);
  const anterior = idx > 0 ? irmaos![idx - 1] : null;
  const proximo = idx >= 0 && idx < (irmaos?.length ?? 0) - 1 ? irmaos![idx + 1] : null;

  const blocos = (topic.blocks as Bloco[] | null) ?? null;

  return (
    <article className="space-y-5">
      <div>
        <Link
          href={`/materias/${d.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          <ArrowLeft size={15} /> {d.name}
        </Link>

        <h1 className="mt-3 text-2xl leading-tight font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
          <span className="text-slate-400 dark:text-slate-500">{topic.ref}</span> {topic.title}
        </h1>

        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} /> {topic.reading_minutes ?? 3} min de leitura
          </span>
          <span>
            Tópico {idx + 1} de {irmaos?.length ?? 0}
          </span>
        </p>
      </div>

      <TopicStatus topicId={topic.id} current={progresso?.status ?? null} />

      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-7 dark:bg-slate-900 dark:ring-slate-700">
        {blocos?.length ? (
          <Blocos blocos={blocos} />
        ) : (
          <pre className="overflow-x-auto font-mono text-[0.8rem] leading-6 whitespace-pre text-slate-700 dark:text-slate-300">
            {topic.body}
          </pre>
        )}
      </div>

      <nav className="grid gap-3 sm:grid-cols-2">
        {anterior ? (
          <Link
            href={`/materias/${d.slug}/${anterior.ref}`}
            className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-200 transition hover:ring-brand-400 dark:bg-slate-900 dark:ring-slate-700"
          >
            <ArrowLeft size={16} className="shrink-0 text-slate-400" />
            <span className="min-w-0">
              <span className="block text-xs text-slate-400">Anterior</span>
              <span className="block truncate font-medium">
                {anterior.ref} {anterior.title}
              </span>
            </span>
          </Link>
        ) : (
          <span />
        )}

        {proximo ? (
          <Link
            href={`/materias/${d.slug}/${proximo.ref}`}
            className="flex items-center gap-3 rounded-2xl bg-white p-4 text-right text-sm ring-1 ring-slate-200 transition hover:ring-brand-400 sm:justify-end dark:bg-slate-900 dark:ring-slate-700"
          >
            <span className="min-w-0">
              <span className="block text-xs text-slate-400">Próximo</span>
              <span className="block truncate font-medium">
                {proximo.ref} {proximo.title}
              </span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-slate-400" />
          </Link>
        ) : (
          <Link
            href={`/questoes?disciplina=${d.slug}`}
            className="flex items-center justify-center gap-2 rounded-2xl bg-brand-600 p-4 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <ListChecks size={16} />
            Treinar as questões desta matéria
          </Link>
        )}
      </nav>

      <div className="pb-2 text-center">
        <Link
          href={`/questoes?disciplina=${d.slug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          <ListChecks size={15} /> Fixar com questões de {d.name}
        </Link>
      </div>
    </article>
  );
}
