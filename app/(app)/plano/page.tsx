import Link from 'next/link';
import { Check } from 'lucide-react';
import { createClient, getUserId } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import Contador from '@/components/contador';
import { BANCA_TIPS, GOLDEN_RULE, PLAN_12, PLAN_30 } from '@/lib/plans';
import DayCheck from './day-check';

export const metadata = { title: 'Plano de estudo — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function PlanoPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const { plano } = await searchParams;
  const atual = plano === '12' ? '12' : '30';
  const user = { id: (await getUserId())! };
  const supabase = await createClient();

  const [{ data: dias }, { data: profile }, { data: disciplines }] = await Promise.all([
    supabase.from('study_days').select('day, plan').eq('user_id', user.id).eq('plan', atual),
    supabase.from('profiles').select('exam_date').eq('id', user.id).maybeSingle(),
    supabase.from('disciplines').select('slug, name'),
  ]);

  const feitos = new Set((dias ?? []).map((d) => d.day));
  const slugPorNome = new Map((disciplines ?? []).map((d) => [d.slug, d.name]));

  const diasRestantes = profile?.exam_date
    ? Math.ceil((new Date(profile.exam_date + 'T12:00:00').getTime() - Date.now()) / 86400000)
    : null;

  // o progresso é a mesma conta nos dois cronogramas: etapas marcadas sobre
  // etapas existentes — dias no de 30, blocos de semanas no de 12
  const totalEtapas = atual === '30' ? PLAN_30.reduce((a, b) => a + b.days.length, 0) : PLAN_12.length;
  const etapasFeitas = [...feitos].filter((d) => d >= 1 && d <= totalEtapas).length;
  const pct = totalEtapas ? Math.round((100 * etapasFeitas) / totalEtapas) : 0;

  /** o bloco inteiro cumprido muda de estado: marcador verde e corpo recuado */
  const blocoFeito = (etapas: number[]) => etapas.every((e) => feitos.has(e));

  return (
    <div className="entra space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            Plano de estudo
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cronogramas da apostila. Marque cada etapa concluída.
            {diasRestantes !== null &&
              diasRestantes > 0 &&
              ` Faltam ${diasRestantes} dias para a prova.`}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          {(['30', '12'] as const).map((p) => (
            <Link
              key={p}
              href={`/plano?plano=${p}`}
              aria-current={atual === p ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                atual === p
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600 dark:hover:bg-slate-700'
              }`}
            >
              {p === '30' ? 'Reta final (30 dias)' : '12 semanas'}
            </Link>
          ))}
        </div>
      </div>

      {/* Quanto do cronograma já foi cumprido: a barra nasce do zero na carga */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700/70">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <p className="text-3xl leading-none font-bold text-slate-900 tabular-nums dark:text-slate-100">
            <Contador para={etapasFeitas} />
            <span className="text-xl font-semibold text-slate-400 dark:text-slate-500">
              {' '}
              de {totalEtapas} {atual === '30' ? 'dias' : 'blocos'}
            </span>
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {etapasFeitas === totalEtapas
              ? 'Cronograma inteiro cumprido.'
              : etapasFeitas === 0
                ? 'Nada marcado ainda. Comece pela primeira etapa.'
                : `${pct}% do caminho. Falta${totalEtapas - etapasFeitas === 1 ? '' : 'm'} ${totalEtapas - etapasFeitas}.`}
          </p>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="cresce h-full rounded-full bg-emerald-500"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="progresso do cronograma"
          />
        </div>
      </section>

      {/* Escala: um trilho vertical liga as etapas na ordem em que são
          cumpridas. O marcador é o número da etapa, porque aqui o conteúdo
          é mesmo uma sequência — e vira um tique quando o bloco fecha. */}
      <ol className="relative space-y-3 pl-11 sm:pl-14">
        <span
          aria-hidden
          className="absolute top-4 bottom-4 left-4 w-px bg-slate-200 sm:left-5 dark:bg-slate-700"
        />

        {atual === '30'
          ? PLAN_30.map((bloco, i) => {
              const feito = blocoFeito(bloco.days);
              return (
                <li key={bloco.range} className="relative">
                  <Marcador numero={i + 1} feito={feito} />
                  <Card className={feito ? 'opacity-70' : ''}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                        {bloco.range}
                      </h2>
                      <div className="flex flex-wrap gap-1.5">
                        {bloco.days.map((dia) => (
                          <DayCheck key={dia} plan="30" day={dia} done={feitos.has(dia)} />
                        ))}
                      </div>
                    </div>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-brand-50 p-3 dark:bg-brand-950/50">
                        <dt className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                          Manhã · 2h
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                          {bloco.morning}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                        <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Noite · 2h
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                          {bloco.night}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                </li>
              );
            })
          : PLAN_12.map((bloco, i) => {
              const feito = feitos.has(i + 1);
              return (
                <li key={bloco.weeks} className="relative">
                  <Marcador numero={i + 1} feito={feito} />
                  <Card className={feito ? 'opacity-70' : ''}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                        Semanas {bloco.weeks}
                      </h2>
                      <DayCheck plan="12" day={i + 1} done={feito} label="concluída" />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {bloco.focus}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Revisão: {bloco.review}
                    </p>
                    {bloco.disciplines.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {bloco.disciplines.map((slug) => (
                          <Link
                            key={slug}
                            href={`/materias/${slug}`}
                            className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-brand-50 hover:ring-brand-300 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600 dark:hover:bg-slate-700"
                          >
                            {slugPorNome.get(slug) ?? slug}
                          </Link>
                        ))}
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
      </ol>

      <Card title="Como a AOCP cobra" subtitle="Padrões de pegadinha mapeados na apostila">
        <ul className="space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
          {BANCA_TIPS.map((t) => (
            <li key={t} className="flex gap-2.5">
              <span
                aria-hidden
                className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
              />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-xl border-l-4 border-amber-400 bg-amber-50 px-3.5 py-2.5 text-sm leading-6 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {GOLDEN_RULE}
        </p>
      </Card>
    </div>
  );
}

/** marcador da etapa no trilho: número enquanto falta, tique quando fecha */
function Marcador({ numero, feito }: { numero: number; feito: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute top-4 -left-11 grid h-8 w-8 place-items-center rounded-full text-xs font-bold tabular-nums transition sm:-left-14 sm:h-10 sm:w-10 sm:text-sm ${
        feito
          ? 'bg-emerald-600 text-white'
          : 'bg-white text-slate-500 ring-1 ring-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-600'
      }`}
    >
      {feito ? <Check size={16} strokeWidth={3} /> : numero}
    </span>
  );
}
