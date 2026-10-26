import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  GraduationCap,
  Hash,
  Lightbulb,
  ListChecks,
  MonitorPlay,
  Play,
  ShieldAlert,
  Target,
} from 'lucide-react';
import { createClient, getUserId } from '@/lib/supabase/server';
import { Badge, Card } from '@/components/ui';
import { Medidor } from '@/components/graficos';
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
  const user = { id: (await getUserId())! };
  const supabase = await createClient();

  const { data: d } = await supabase.from('disciplines').select('*').eq('slug', slug).maybeSingle();
  if (!d) notFound();

  const [{ data: topics }, { data: progresso }, { count: qTotal }, { data: desempenho }] =
    await Promise.all([
      supabase
        .from('topics')
        .select('id, ref, title, ord, reading_minutes, summary')
        .eq('discipline_id', d.id)
        .order('ord'),
      supabase.from('topic_progress').select('topic_id, status').eq('user_id', user.id),
      supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('discipline_id', d.id)
        .neq('source', 'simulado'),
      supabase
        .from('v_discipline_stats')
        .select('answered, correct, accuracy')
        .eq('user_id', user.id)
        .eq('discipline_id', d.id)
        .maybeSingle(),
    ]);

  const status = new Map((progresso ?? []).map((p) => [p.topic_id as number, p.status as string]));
  const lidos = (topics ?? []).filter((t) => status.get(t.id) === 'lido').length;
  const pct = topics?.length ? Math.round((100 * lidos) / topics.length) : 0;
  const minutos = (topics ?? []).reduce((a, t) => a + (t.reading_minutes ?? 3), 0);

  const continuar =
    (topics ?? []).find((t) => status.get(t.id) === 'lendo') ??
    (topics ?? []).find((t) => !status.get(t.id));

  const acerto = desempenho?.accuracy ? Number(desempenho.accuracy) : null;
  const armadilhas = (d.traps as string[] | null) ?? [];
  const numeros = (d.key_numbers as string[] | null) ?? [];
  const oQueEstudar = (d.what_to_study as string[] | null) ?? [];

  return (
    <div className="space-y-5">
      {/* ---------------- cabeçalho ---------------- */}
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

      {d.answers_question && (
        <p className="rounded-2xl bg-brand-600 px-5 py-4 text-base font-semibold text-white sm:text-lg">
          {d.answers_question}
        </p>
      )}

      {/* ---------------- o que é e para que serve ---------------- */}
      {d.summary && (
        <Card>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                O que é esta matéria
              </h2>
              <p className="mt-2 text-[0.95rem] leading-7 text-slate-700 dark:text-slate-300">
                {d.summary}
              </p>
            </div>
            {d.what_for && (
              <div>
                <h2 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Para que serve na prática
                </h2>
                <p className="mt-2 text-[0.95rem] leading-7 text-slate-700 dark:text-slate-300">
                  {d.what_for}
                </p>
              </div>
            )}
          </div>

          {d.how_it_falls && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Target size={14} /> Como a banca cobra
              </h2>
              <p className="mt-1.5 text-sm leading-7 text-slate-700 dark:text-slate-300">
                {d.how_it_falls}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ---------------- guia prático ---------------- */}
      {(oQueEstudar.length > 0 || d.example) && (
        <div className="grid gap-4 md:grid-cols-2">
          {oQueEstudar.length > 0 && (
            <Card title="O que estudar nesta matéria" icon={ListChecks}>
              <ul className="space-y-2">
                {oQueEstudar.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-sm leading-6 text-slate-700 dark:text-slate-300"
                  >
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="entra space-y-4">
            {d.example && (
              <Card title="Na prática" icon={Lightbulb}>
                <p className="text-[0.95rem] leading-7 text-slate-700 dark:text-slate-300">
                  {d.example}
                </p>
              </Card>
            )}
            {d.study_tip && (
              <Card title="Como estudar" icon={GraduationCap}>
                <p className="text-[0.95rem] leading-7 text-slate-700 dark:text-slate-300">
                  {d.study_tip}
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ---------------- progresso e desempenho ---------------- */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <Medidor
            valor={pct}
            meta={100}
            destaque
            label="Teoria estudada"
            sublabel={`${lidos} de ${topics?.length ?? 0} tópicos marcados como estudados`}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {continuar && (
              <Link
                href={`/materias/${d.slug}/${continuar.ref}`}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <Play size={15} />
                {lidos ? `Continuar no ${continuar.ref}` : 'Começar a estudar'}
              </Link>
            )}
            {(qTotal ?? 0) > 0 && (
              <Link
                href={`/questoes?disciplina=${d.slug}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
              >
                <ListChecks size={15} /> Treinar questões
              </Link>
            )}
            <Link
              href={`/videos?disciplina=${d.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
            >
              <MonitorPlay size={15} /> Vídeo-aulas
            </Link>
          </div>
        </Card>

        <Card>
          <Medidor
            valor={acerto}
            meta={70}
            destaque
            label="Seu acerto nesta matéria"
            sublabel={
              desempenho?.answered
                ? `${desempenho.correct} acertos em ${desempenho.answered} questões respondidas · a marca é a meta de 70%`
                : 'Nenhuma questão respondida ainda nesta matéria'
            }
          />
          {d.question_count > 0 && (
            <p className="mt-4 rounded-xl bg-brand-50 px-3.5 py-2.5 text-xs leading-5 text-brand-900 dark:bg-brand-950/50 dark:text-brand-200">
              Nesta disciplina estão em jogo <strong>{d.question_count} pontos</strong> dos 60 da
              objetiva. Com o seu acerto atual, a projeção aqui é de{' '}
              <strong>
                {acerto === null ? '—' : Math.round((acerto / 100) * d.question_count * 10) / 10}
              </strong>{' '}
              ponto(s).
            </p>
          )}
        </Card>
      </div>

      {/* ---------------- armadilhas e números ---------------- */}
      {(armadilhas.length > 0 || numeros.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {armadilhas.length > 0 && (
            <Card title="Armadilhas mais frequentes" icon={ShieldAlert}>
              <ul className="space-y-2.5">
                {armadilhas.map((a) => (
                  <li
                    key={a}
                    className="flex gap-2.5 text-sm leading-6 text-slate-700 dark:text-slate-300"
                  >
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    {a}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {numeros.length > 0 && (
            <Card title="Números na ponta da língua" icon={Hash}>
              <ul className="space-y-2">
                {numeros.map((n) => (
                  <li
                    key={n}
                    className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-[0.8rem] leading-6 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                  >
                    {n}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* ---------------- tópicos ---------------- */}
      <div>
        <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">
          Tópicos ({topics?.length ?? 0})
        </h2>
        <ListaTopicos
          slug={d.slug}
          topicos={(topics ?? []).map((t) => ({
            id: t.id,
            ref: t.ref,
            title: t.title,
            minutos: t.reading_minutes ?? 3,
            resumo: t.summary ?? null,
            status: status.get(t.id) ?? null,
          }))}
        />
      </div>
    </div>
  );
}
