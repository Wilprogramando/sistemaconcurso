import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, ListChecks, Play } from 'lucide-react';
import { createClient, getUser } from '@/lib/supabase/server';
import { Badge, Bar, Card } from '@/components/ui';
import { PRIORITY_CLASS, PRIORITY_LABEL } from '@/lib/types';
import ListaTopicos from './lista-topicos';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('disciplines').select('name').eq('slug', slug).maybeSingle();
  return { title: `${data?.name ?? 'Matéria'} — Estudo PM SC 2026` };
}

export default async function DisciplinaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = (await getUser())!;
  const supabase = await createClient();

  const { data: d } = await supabase.from('disciplines').select('*').eq('slug', slug).maybeSingle();
  if (!d) notFound();

  const [{ data: topics }, { data: progresso }, { count: qTotal }] = await Promise.all([
    supabase
      .from('topics')
      .select('id, ref, title, ord, reading_minutes')
      .eq('discipline_id', d.id)
      .order('ord'),
    supabase.from('topic_progress').select('topic_id, status').eq('user_id', user.id),
    supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('discipline_id', d.id)
      .neq('source', 'simulado'),
  ]);

  const status = new Map((progresso ?? []).map((p) => [p.topic_id as number, p.status as string]));
  const lidos = (topics ?? []).filter((t) => status.get(t.id) === 'lido').length;
  const pct = topics?.length ? Math.round((100 * lidos) / topics.length) : 0;
  const minutos = (topics ?? []).reduce((a, t) => a + (t.reading_minutes ?? 3), 0);

  const continuar =
    (topics ?? []).find((t) => status.get(t.id) === 'lendo') ??
    (topics ?? []).find((t) => !status.get(t.id));

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/materias"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          <ArrowLeft size={15} /> Matérias
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            {d.name}
          </h1>
          <Badge className={PRIORITY_CLASS[d.priority as keyof typeof PRIORITY_CLASS]}>
            {PRIORITY_LABEL[d.priority as keyof typeof PRIORITY_LABEL]}
          </Badge>
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
          <span>
            {d.question_count
              ? `${d.question_count} das 60 questões (${d.weight}% da prova)`
              : 'Prova de redação — 20 pontos'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} /> {minutos} min de leitura
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ListChecks size={14} /> {qTotal ?? 0} questões
          </span>
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-48 flex-1">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Progresso da teoria
              </span>
              <span className="text-slate-500 tabular-nums dark:text-slate-400">
                {lidos}/{topics?.length ?? 0} tópicos
              </span>
            </div>
            <Bar percent={pct} />
          </div>

          <div className="flex gap-2">
            {continuar && (
              <Link
                href={`/materias/${d.slug}/${continuar.ref}`}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <Play size={15} />
                {lidos ? 'Continuar' : 'Começar'}
              </Link>
            )}
            {(qTotal ?? 0) > 0 && (
              <Link
                href={`/questoes?disciplina=${d.slug}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
              >
                <ListChecks size={15} /> Questões
              </Link>
            )}
          </div>
        </div>
      </Card>

      <ListaTopicos
        slug={d.slug}
        topicos={(topics ?? []).map((t) => ({
          id: t.id,
          ref: t.ref,
          title: t.title,
          minutos: t.reading_minutes ?? 3,
          status: status.get(t.id) ?? null,
        }))}
      />
    </div>
  );
}
