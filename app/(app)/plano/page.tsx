import Link from 'next/link';
import { createClient, getUserId } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">Plano de estudo</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cronogramas da apostila. Marque cada etapa concluída.
            {diasRestantes !== null && diasRestantes > 0 && ` Faltam ${diasRestantes} dias para a prova.`}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          {(['30', '12'] as const).map((p) => (
            <Link
              key={p}
              href={`/plano?plano=${p}`}
              className={`rounded-lg px-3 py-1.5 font-medium ${
                atual === p ? 'bg-brand-600 text-white' : 'bg-white text-brand-700 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600'
              }`}
            >
              {p === '30' ? 'Reta final (30 dias)' : '12 semanas'}
            </Link>
          ))}
        </div>
      </div>

      {atual === '30' ? (
        <div className="space-y-3">
          {PLAN_30.map((bloco) => (
            <Card key={bloco.range}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{bloco.range}</h2>
                <div className="flex flex-wrap gap-1.5">
                  {bloco.days.map((dia) => (
                    <DayCheck key={dia} plan="30" day={dia} done={feitos.has(dia)} />
                  ))}
                </div>
              </div>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-brand-50 p-3 dark:bg-brand-950/50">
                  <dt className="text-xs font-semibold text-brand-700 uppercase">Manhã (2h)</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">{bloco.morning}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <dt className="text-xs font-semibold text-slate-600 uppercase">Noite (2h)</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">{bloco.night}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {PLAN_12.map((bloco, i) => (
            <Card key={bloco.weeks}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">Semanas {bloco.weeks}</h2>
                <DayCheck plan="12" day={i + 1} done={feitos.has(i + 1)} label="concluída" />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{bloco.focus}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Revisão: {bloco.review}</p>
              {bloco.disciplines.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {bloco.disciplines.map((slug) => (
                    <Link
                      key={slug}
                      href={`/materias/${slug}`}
                      className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
                    >
                      {slugPorNome.get(slug) ?? slug} →
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card title="Como a AOCP cobra" subtitle="Padrões de pegadinha mapeados na apostila">
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-300">
          {BANCA_TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
          {GOLDEN_RULE}
        </p>
      </Card>
    </div>
  );
}
