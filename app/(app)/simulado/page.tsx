import Link from 'next/link';
import { FileText, Flag, Scale } from 'lucide-react';
import { createClient, getUser } from '@/lib/supabase/server';
import QuestionRunner from '@/components/question-runner';
import { Card } from '@/components/ui';
import type { Question } from '@/lib/types';
import { COLUNAS, comTextosDeApoio, embaralhar } from '@/lib/questions';

export const metadata = { title: 'Simulado — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function SimuladoPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string }>;
}) {
  const { modo } = await searchParams;
  await getUser();
  const supabase = await createClient();

  if (!modo) {
    const [{ count: simuladoCount }, { count: provaCount }, { count: bancoCount }] =
      await Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('source', 'simulado'),
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('origin', 'prova'),
        supabase.from('questions').select('id', { count: 'exact', head: true }).neq('source', 'simulado'),
      ]);

    const opcoes = [
      {
        modo: 'prova2023',
        titulo: 'Prova oficial de 2023',
        icone: Flag,
        resumo: `${provaCount ?? 0} questões reais de Soldado da PMSC aplicadas pelo Cebraspe em 27/8/2023, com 5 alternativas, como na prova.`,
        meta: `${provaCount ?? 0} questões · 2h`,
        destaque: true,
      },
      {
        modo: 'ponderado',
        titulo: 'Simulado ponderado — 60 questões',
        icone: Scale,
        resumo: `Sorteia do banco (${bancoCount ?? 0} questões) respeitando a Tabela 8.1: 10 de Institucional, 8 de Constitucional, 8 de Português e assim por diante.`,
        meta: '60 questões · 2h',
        destaque: false,
      },
      {
        modo: 'apostila',
        titulo: 'Simulado da apostila',
        icone: FileText,
        resumo: 'O simulado final do capítulo 11, em certo/errado, com o gabarito comentado.',
        meta: `${simuladoCount ?? 0} questões · 1h`,
        destaque: false,
      },
    ];

    return (
      <div className="space-y-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            Simulado
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sem feedback durante a prova — a correção comentada, com a sua resposta ao lado da
            correta, aparece no final.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {opcoes.map((o) => {
            const Icone = o.icone;
            return (
              <Card key={o.modo} className={o.destaque ? 'ring-2 ring-brand-400' : ''}>
                <div className="flex h-full flex-col">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl ${
                      o.destaque
                        ? 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300'
                        : 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300'
                    }`}
                  >
                    <Icone size={20} />
                  </span>
                  <h2 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{o.titulo}</h2>
                  <p className="mt-1 text-xs font-medium text-slate-400">{o.meta}</p>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {o.resumo}
                  </p>
                  <Link
                    href={`/simulado?modo=${o.modo}`}
                    className="mt-4 inline-flex justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    Iniciar
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>

        <Card title="Como a prova é pontuada">
          <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            {[
              '60 questões objetivas de 5 alternativas, 1,00 ponto cada.',
              'Redação vale 20 pontos — um quarto da nota da 1ª fase.',
              'Aprovação exige no mínimo 50% do total da etapa.',
              'Zerar uma única área de conhecimento elimina o candidato.',
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  let questions: Question[] = [];
  let limite = 60 * 60;
  let titulo = '';
  let subtitulo: string | undefined;

  if (modo === 'apostila') {
    const { data } = await supabase
      .from('questions')
      .select(COLUNAS)
      .eq('source', 'simulado')
      .order('number');
    questions = (data ?? []) as unknown as Question[];
    titulo = 'Simulado final da apostila';
  } else if (modo === 'prova2023') {
    const { data } = await supabase
      .from('questions')
      .select(COLUNAS)
      .eq('origin', 'prova')
      .order('number');
    questions = (data ?? []) as unknown as Question[];
    limite = 120 * 60;
    titulo = 'Prova oficial PMSC 2023 — Soldado';
    subtitulo = 'Cebraspe, 27/8/2023';
  } else {
    const [{ data: disciplines }, { data: banco }] = await Promise.all([
      supabase.from('disciplines').select('*').gt('question_count', 0),
      supabase.from('questions').select(COLUNAS).neq('source', 'simulado'),
    ]);

    const porDisciplina = new Map<number, Question[]>();
    for (const q of (banco ?? []) as unknown as Question[]) {
      if (!q.discipline_id) continue;
      const arr = porDisciplina.get(q.discipline_id) ?? [];
      arr.push(q);
      porDisciplina.set(q.discipline_id, arr);
    }

    for (const d of disciplines ?? []) {
      const pool = embaralhar(porDisciplina.get(d.id) ?? []);
      questions.push(...pool.slice(0, d.question_count));
    }
    questions = embaralhar(questions);
    limite = 120 * 60;
    titulo = `Simulado ponderado (${questions.length} questões)`;
    subtitulo = 'distribuição da Tabela 8.1';
  }

  questions = await comTextosDeApoio(supabase, questions);

  return (
    <div className="space-y-4">
      <Link
        href="/simulado"
        className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
      >
        ← simulados
      </Link>
      <QuestionRunner
        questions={questions}
        kind="simulado"
        instant={false}
        timeLimitSeconds={limite}
        titulo={titulo}
        subtitulo={subtitulo}
        voltarHref="/simulado"
      />
    </div>
  );
}
