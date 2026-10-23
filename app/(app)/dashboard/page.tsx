import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  Flame,
  ListChecks,
  MonitorPlay,
  PenLine,
  Play,
  RefreshCw,
  ScrollText,
  Target,
  TrendingUp,
} from 'lucide-react';
import { createClient, getUser } from '@/lib/supabase/server';
import { Aviso, Card, Empty, Stat } from '@/components/ui';
import { Medidor, PesoDaProva } from '@/components/graficos';
import { visualDe } from '@/lib/disciplinas-visual';
import { PRIORITY_CLASS, PRIORITY_LABEL, type DisciplineStats } from '@/lib/types';
import { GOLDEN_RULE, PLAN_30 } from '@/lib/plans';
import ExamDateForm from './exam-date-form';

export const metadata = { title: 'Painel — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = (await getUser())!;
  const supabase = await createClient();

  const agora = new Date();
  const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString();
  const hojeISO = new Date().toISOString().slice(0, 10);

  const [
    { data: profile },
    { data: stats },
    { data: hojeAttempts },
    dueCount,
    { data: ultimas },
    { data: disciplines },
    errosAbertos,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('v_discipline_stats').select('*').eq('user_id', user.id),
    supabase.from('attempts').select('correct').gte('answered_at', inicioDoDia),
    supabase.from('reviews').select('question_id', { count: 'exact', head: true }).lte('due_on', hojeISO),
    supabase
      .from('exam_sessions')
      .select('id, kind, total, correct, finished_at')
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(5),
    supabase.from('disciplines').select('*').order('chapter'),
    supabase.from('error_notes').select('id', { count: 'exact', head: true }).eq('resolved', false),
  ]);

  const statMap = new Map<number, DisciplineStats>(
    (stats ?? []).map((s) => [s.discipline_id as number, s as DisciplineStats])
  );

  const metaDiaria = profile?.daily_goal ?? 20;
  const respondidasHoje = hojeAttempts?.length ?? 0;
  const acertosHoje = (hojeAttempts ?? []).filter((a) => a.correct).length;
  const revisoesHoje = dueCount.count ?? 0;

  const objetivas = (disciplines ?? []).filter((d) => d.question_count > 0);

  let pontos = 0;
  let avaliado = 0;
  for (const d of objetivas) {
    const s = statMap.get(d.id);
    if (!s?.accuracy) continue;
    pontos += (Number(s.accuracy) / 100) * d.question_count;
    avaliado += d.question_count;
  }
  const projecao = avaliado ? Math.round(pontos) : null;
  const cobertura = Math.round((100 * avaliado) / 60);

  const diasRestantes = profile?.exam_date
    ? Math.ceil((new Date(profile.exam_date + 'T12:00:00').getTime() - Date.now()) / 86400000)
    : null;

  const zeradas = objetivas.filter((d) => !statMap.get(d.id)?.answered);

  const blocoAtual =
    diasRestantes !== null && diasRestantes > 0 && diasRestantes <= 30
      ? PLAN_30.find((b) => b.days.includes(31 - diasRestantes))
      : null;

  const ordenadas = objetivas
    .slice()
    .sort((a, b) => b.question_count - a.question_count || a.chapter - b.chapter);

  const atalhos = [
    { href: '/treino', label: 'Treino do dia', icone: Flame, cor: 'bg-brand-600 text-white hover:bg-brand-700' },
    { href: '/questoes', label: 'Questões livres', icone: ListChecks, cor: 'bg-white text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600' },
    { href: '/revisao', label: revisoesHoje > 0 ? `Revisar (${revisoesHoje})` : 'Revisão', icone: RefreshCw, cor: 'bg-white text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600' },
    { href: '/materias', label: 'Estudar teoria', icone: BookOpen, cor: 'bg-white text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600' },
    { href: '/redacao', label: 'Redação', icone: PenLine, cor: 'bg-white text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600' },
    { href: '/videos', label: 'Vídeo-aulas', icone: MonitorPlay, cor: 'bg-white text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600' },
  ];

  return (
    <div className="space-y-5">
      {/* ---------------- cabeçalho ---------------- */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
          Painel de estudo
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          60 questões objetivas + redação (20 pontos). Aprovação exige 50% do total e nenhuma
          disciplina zerada.
        </p>
      </div>

      {/* ---------------- atalhos ---------------- */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {atalhos.map(({ href, label, icone: Icone, cor }) => (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${cor}`}
          >
            <Icone size={16} />
            {label}
          </Link>
        ))}
      </div>

      {/* ---------------- projeção em destaque ---------------- */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 p-5 text-white sm:p-6 dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-brand-100 uppercase">
              <Target size={14} /> Projeção na prova objetiva
            </p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl leading-none font-bold tabular-nums sm:text-6xl">
                {projecao === null ? '—' : projecao}
              </span>
              <span className="text-2xl font-semibold text-brand-200">/60</span>
            </p>
            <p className="mt-2 max-w-md text-sm text-brand-100">
              {projecao === null
                ? 'Responda questões em cada disciplina para o sistema calcular sua projeção.'
                : `Calculada com o seu acerto em ${cobertura}% do peso da prova. ${
                    projecao >= 40
                      ? 'Ritmo de aprovação.'
                      : projecao >= 30
                        ? 'Perto do corte — ainda dá para subir.'
                        : 'Abaixo do corte seguro.'
                  }`}
            </p>
          </div>

          {/* três números do dia: à direita no computador, linha inteira no celular */}
          <dl className="grid w-full grid-cols-3 gap-3 text-center sm:ml-auto sm:w-auto sm:shrink-0 sm:gap-8">
            {[
              ['Hoje', `${respondidasHoje}/${metaDiaria}`, `${acertosHoje} acertos`],
              ['Revisões', revisoesHoje, 'para hoje'],
              [
                'Dias p/ prova',
                diasRestantes === null ? '—' : diasRestantes > 0 ? diasRestantes : 'hoje',
                profile?.exam_date ? '' : 'informe a data',
              ],
            ].map(([k, v, hint]) => (
              <div key={String(k)}>
                <dt className="text-[0.6rem] leading-4 font-semibold tracking-wide text-brand-200 uppercase sm:text-[0.65rem] sm:tracking-wider">
                  {k}
                </dt>
                <dd className="mt-0.5 text-2xl font-bold tabular-nums">{v}</dd>
                {hint ? <dd className="text-[0.65rem] text-brand-200">{hint}</dd> : null}
              </div>
            ))}
          </dl>
        </div>
      </section>


      {/* ---------------- desempenho ---------------- */}
      <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 sm:p-5 dark:bg-slate-900 dark:ring-slate-700/70">
        <header className="flex flex-wrap items-center gap-4 rounded-2xl bg-brand-50/70 p-4 sm:p-5 dark:bg-brand-950/30">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
            <TrendingUp size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl leading-tight font-bold text-slate-900 sm:text-2xl dark:text-slate-100">
              Seu acerto por disciplina
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Ordenado pelo peso na prova · a marca na barra é a meta de 70%
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 ring-1 ring-brand-100 dark:bg-slate-900 dark:ring-brand-900">
              <Target size={18} className="shrink-0 text-brand-600 dark:text-brand-300" />
              <span className="leading-tight">
                <span className="block text-[0.7rem] font-medium text-slate-500 dark:text-slate-400">
                  Meta por disciplina
                </span>
                <span className="block text-base font-bold text-slate-900 dark:text-slate-100">
                  70%
                </span>
              </span>
            </span>

            <Link
              href="/edital"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 sm:flex-none"
            >
              <ScrollText size={16} /> Edital
            </Link>

            <a
              href="/edital-002-2026.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50 sm:flex-none dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600"
            >
              <FileText size={16} /> Ver o PDF
            </a>
          </div>
        </header>

        <ul className="mt-3 space-y-2.5">
          {ordenadas.map((d) => {
            const s = statMap.get(d.id);
            const acc = s?.accuracy ? Number(s.accuracy) : null;
            const visual = visualDe(d.slug);
            const Icone = visual.icone;
            return (
              <li
                key={d.id}
                className="flex items-center gap-3 rounded-2xl p-3 ring-1 ring-slate-200/80 transition hover:ring-brand-300 sm:gap-4 sm:p-3.5 dark:ring-slate-700/70"
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11 ${visual.tile}`}
                >
                  <Icone size={20} />
                </span>

                <div className="min-w-0 flex-1">
                  <Medidor
                    valor={acc}
                    meta={70}
                    destaque
                    label={
                      <Link
                        href={`/materias/${d.slug}`}
                        className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 hover:underline"
                      >
                        {d.name}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ring-1 ring-inset ${
                            PRIORITY_CLASS[d.priority as keyof typeof PRIORITY_CLASS]
                          }`}
                        >
                          {PRIORITY_LABEL[d.priority as keyof typeof PRIORITY_LABEL].replace(
                            'Prioridade ',
                            ''
                          )}
                        </span>
                      </Link>
                    }
                    sublabel={`${d.question_count} questões na prova (${d.weight}% do total) · ${s?.answered ?? 0} respondidas${
                      acc !== null ? ` · ${s!.correct} acertos` : ''
                    }`}
                  />
                </div>

                <span className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 sm:inline-flex dark:bg-slate-800 dark:text-slate-300">
                  <BarChart3 size={14} className="text-slate-400" />
                  {acc !== null ? `${Math.round(acc)}%` : 'sem dados'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------------- etapa do plano ---------------- */}
      {blocoAtual && (
        <Card
          title={`Plano de 30 dias — ${blocoAtual.range}`}
          subtitle="Esta é a sua etapa de hoje"
          icon={CalendarDays}
          action={
            <Link
              href="/plano"
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              ver plano →
            </Link>
          }
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-brand-50 p-3.5 dark:bg-brand-950/50">
              <dt className="text-xs font-bold tracking-wide text-brand-700 uppercase dark:text-brand-300">
                Manhã (2h)
              </dt>
              <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {blocoAtual.morning}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
              <dt className="text-xs font-bold tracking-wide text-slate-600 uppercase dark:text-slate-400">
                Noite (2h)
              </dt>
              <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {blocoAtual.night}
              </dd>
            </div>
          </dl>
        </Card>
      )}

      {/* ---------------- peso da prova ---------------- */}
      <Card
        title="Como os 60 pontos estão distribuídos"
        subtitle="Tabela 8.1 do edital — a cor mostra o tamanho da fatia, a legenda diz qual é qual"
        icon={Target}
      >
        <PesoDaProva
          itens={ordenadas.map((d) => ({
            nome: d.name,
            questoes: d.question_count,
            acerto: statMap.get(d.id)?.accuracy ? Number(statMap.get(d.id)!.accuracy) : null,
            slug: d.slug,
          }))}
        />
      </Card>


      {/* ---------------- rodapé do painel ---------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Últimas sessões" icon={CheckCircle2}>
          {!ultimas?.length ? (
            <Empty>Nenhuma sessão concluída ainda. Comece por um treino de questões.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {ultimas.map((s) => {
                const pct = s.total ? Math.round((100 * s.correct) / s.total) : 0;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="capitalize">{s.kind}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(s.finished_at!).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {s.correct}/{s.total}
                      <span className="ml-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
                        {pct}%
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {(errosAbertos.count ?? 0) > 0 && (
            <Link
              href="/erros"
              className="mt-3 inline-flex text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              {errosAbertos.count} erros abertos no caderno →
            </Link>
          )}
        </Card>

        <Card title="Sua configuração" subtitle="Data da prova e meta diária de questões">
          <ExamDateForm examDate={profile?.exam_date ?? ''} dailyGoal={profile?.daily_goal ?? 20} />
          <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-5 text-amber-900 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
            {GOLDEN_RULE}
          </p>
        </Card>
      </div>

      {/* ---------------- alertas ---------------- */}
      {zeradas.length > 0 && (
        <Aviso title={`Atenção: ${zeradas.length} disciplina(s) sem nenhuma questão respondida`}>
          <p className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>Zerar uma única disciplina elimina o candidato, mesmo com nota alta nas demais.</span>
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {zeradas.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/questoes?disciplina=${d.slug}`}
                  className="inline-flex items-center rounded-lg bg-white/70 px-3 py-1.5 text-sm font-medium ring-1 ring-amber-300 transition hover:bg-white dark:bg-slate-900/60 dark:ring-amber-800"
                >
                  {d.name} →
                </Link>
              </li>
            ))}
          </ul>
        </Aviso>
      )}

      <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
        <Play size={14} className="mt-0.5 shrink-0" />
        <span>
          A projeção multiplica seu percentual de acerto em cada disciplina pelo número de questões
          que ela tem na prova. Disciplinas ainda não treinadas ficam de fora da conta — por isso a
          cobertura de {cobertura}% aparece ao lado do número.
        </span>
      </div>
    </div>
  );
}
