import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Dumbbell,
  ExternalLink,
  FileText,
  ListChecks,
  PenLine,
  ScrollText,
  Target,
  TriangleAlert,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { visualDe } from '@/lib/disciplinas-visual';
import {
  AREAS,
  CONTEUDO,
  CORTES,
  CRONOGRAMA,
  EDITAL,
  ESTRATEGIA,
  FASES,
  NUMEROS,
  PESOS,
  REDACAO,
  REQUISITOS,
  TAF,
} from '@/lib/edital';

export const metadata = { title: 'Edital — Estudo PM SC 2026' };

const TOTAL_QUESTOES = 60;

export default function EditalPage() {
  return (
    <div className="space-y-5">
      {/* ---------------- faixa de título ---------------- */}
      <header className="relative overflow-hidden rounded-2xl bg-brand-900 px-5 py-6 text-white sm:px-7 dark:bg-slate-900">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-8 -right-10 h-48 w-64 rotate-12 opacity-[0.07]"
          style={{
            backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 3px, transparent 3px 22px)',
          }}
        />
        <div className="relative">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-100 hover:underline"
          >
            <ArrowLeft size={15} /> Painel
          </Link>

          <div className="mt-3 flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15">
              <ScrollText size={24} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl leading-tight font-bold sm:text-3xl">{EDITAL.numero}</h1>
              <p className="mt-1 text-sm text-brand-100">
                {EDITAL.cargo} · código {EDITAL.codigoCargo} · {EDITAL.orgao} · banca{' '}
                {EDITAL.banca}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={EDITAL.arquivo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
            >
              <FileText size={16} /> Abrir o edital em PDF
              <ExternalLink size={13} className="opacity-60" />
            </a>
            <a
              href={EDITAL.arquivo}
              download="Edital-002-CCP-2026-PMSC.pdf"
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
            >
              Baixar o PDF
            </a>
          </div>
        </div>
      </header>

      {/* ---------------- números do concurso ---------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NUMEROS.map((n) => (
          <div
            key={n.rotulo}
            className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
          >
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">{n.rotulo}</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{n.valor}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{n.detalhe}</p>
          </div>
        ))}
      </div>

      {/* ---------------- o que vale mais ponto ---------------- */}
      <Card
        title="O que vale mais ponto"
        subtitle={`Tabela 8.1 · cada questão vale 1,00 ponto · ${TOTAL_QUESTOES} questões na objetiva`}
        icon={Target}
      >
        <ul className="space-y-2.5">
          {PESOS.map((p) => {
            const visual = visualDe(p.slug);
            const Icone = visual.icone;
            const pct = Math.round((1000 * p.questoes) / TOTAL_QUESTOES) / 10;
            return (
              <li key={p.slug} className="flex items-center gap-3">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${visual.tile}`}
                >
                  <Icone size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <Link
                      href={`/materias/${p.slug}`}
                      className="text-sm font-semibold text-slate-900 hover:underline dark:text-slate-100"
                    >
                      {p.disciplina}
                    </Link>
                    <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
                      {p.questoes} questões · {pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: `${(100 * p.questoes) / 10}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          {AREAS.map((a) => (
            <div key={a.area} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Área {a.area}
              </dt>
              <dd className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                {a.questoes} questões{' '}
                <span className="font-normal text-slate-500 dark:text-slate-400">
                  · {a.disciplinas} matérias
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* ---------------- leitura estratégica ---------------- */}
      <Card
        title="Onde investir o tempo"
        subtitle="Leitura dos pesos do edital, em ordem de retorno"
        icon={ListChecks}
      >
        <ul className="space-y-2.5">
          {ESTRATEGIA.map((e, i) => (
            <li key={i} className="flex gap-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
              <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[0.7rem] font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {i + 1}
              </span>
              {e}
            </li>
          ))}
        </ul>
      </Card>

      {/* ---------------- o que estudar ---------------- */}
      <Card
        title="O que preciso estudar"
        subtitle="Anexo II — conteúdo programático, da matéria que mais vale para a que menos vale"
        icon={BookOpen}
      >
        <div className="space-y-3">
          {CONTEUDO.map((c) => {
            const visual = visualDe(c.slug);
            const Icone = visual.icone;
            return (
              <details
                key={c.slug}
                className="group rounded-2xl bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-800/50 dark:ring-slate-700"
              >
                <summary className="flex cursor-pointer items-center gap-3 p-3.5">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${visual.tile}`}
                  >
                    <Icone size={17} />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {c.disciplina}
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                    {c.questoes} questões
                  </span>
                </summary>
                <div className="border-t border-slate-200 px-4 py-3.5 dark:border-slate-700">
                  <ul className="space-y-1.5 text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {c.itens.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/materias/${c.slug}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                  >
                    Estudar {c.disciplina} →
                  </Link>
                </div>
              </details>
            );
          })}
        </div>
      </Card>

      {/* ---------------- cortes e eliminação ---------------- */}
      <Card
        title="O que elimina e o que classifica"
        subtitle="As notas de corte de cada etapa"
        icon={TriangleAlert}
      >
        <ul className="space-y-3">
          {CORTES.map((c) => (
            <li
              key={c.titulo}
              className="rounded-xl border-l-4 border-amber-400 bg-amber-50/70 p-3.5 dark:bg-amber-950/30"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.titulo}</p>
              <p className="mt-0.5 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {c.regra}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      {/* ---------------- fases ---------------- */}
      <Card title="As cinco fases do concurso" icon={ListChecks}>
        <ol className="space-y-3">
          {FASES.map((f) => (
            <li key={f.fase} className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {f.fase.replace(' fase', '')}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {f.nome}
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {f.carater}
                  </span>
                </p>
                <p className="mt-0.5 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {f.detalhe}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* ---------------- redação ---------------- */}
      <Card
        title="Prova de redação"
        subtitle={REDACAO.pontos}
        icon={PenLine}
        action={
          <Link
            href="/redacao"
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            treinar redação →
          </Link>
        }
      >
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
            <dt className="text-xs font-bold tracking-wide text-slate-500 uppercase">Formato</dt>
            <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
              {REDACAO.tipo}. {REDACAO.linhas}.
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
            <dt className="text-xs font-bold tracking-wide text-slate-500 uppercase">
              Como a nota é calculada
            </dt>
            <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
              {REDACAO.formula}. {REDACAO.penalidades}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Temas possíveis — ordem pública
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {REDACAO.temas.map((t) => (
            <li
              key={t}
              className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100 dark:bg-brand-950/50 dark:text-brand-300 dark:ring-brand-900"
            >
              {t}
            </li>
          ))}
        </ul>
      </Card>

      {/* ---------------- requisitos e TAF ---------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Requisitos para ingressar" icon={ListChecks}>
          <ul className="space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {REQUISITOS.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                {r}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Teste de Aptidão Física" subtitle="Índices mínimos do Anexo V" icon={Dumbbell}>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[22rem] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  <th className="pb-2 font-semibold">Teste</th>
                  <th className="pb-2 font-semibold">Mínimo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {TAF.map((t) => (
                  <tr key={t.teste}>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{t.teste}</td>
                    <td className="py-2 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                      {t.minimo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ---------------- cronograma ---------------- */}
      <Card
        title="Cronograma preliminar"
        subtitle="Anexo I — as datas podem mudar; confira sempre o site da banca"
        icon={CalendarDays}
      >
        <ol className="space-y-0">
          {CRONOGRAMA.map((c, i) => (
            <li key={i} className="flex gap-3 py-2.5">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  c.destaque ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                <span
                  className={`text-sm tabular-nums ${
                    c.destaque
                      ? 'font-bold text-brand-700 dark:text-brand-300'
                      : 'font-semibold text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {c.data}
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300">{c.evento}</span>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <p className="pb-2 text-center text-xs leading-6 text-slate-500 dark:text-slate-400">
        Resumo feito a partir do PDF oficial ({EDITAL.processo}) · validade do concurso:{' '}
        {EDITAL.validade}. Em qualquer divergência, vale o texto do edital —{' '}
        <a href={EDITAL.arquivo} target="_blank" rel="noopener noreferrer" className="underline">
          abrir o PDF
        </a>
        .
      </p>
    </div>
  );
}
