import Link from 'next/link';
import { FileText, Flag, Scale, Timer } from 'lucide-react';
import { createClient, getUserId } from '@/lib/supabase/server';
import QuestionRunner from '@/components/question-runner';
import { Card } from '@/components/ui';
import Contador from '@/components/contador';
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
  await getUserId();
  const supabase = await createClient();

  if (!modo) {
    const [{ count: simuladoCount }, { count: provaCount }, { count: bancoCount }] =
      await Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('source', 'simulado'),
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('origin', 'prova'),
        supabase.from('questions').select('id', { count: 'exact', head: true }).neq('source', 'simulado'),
      ]);

    const secundarios = [
      {
        modo: 'ponderado',
        titulo: 'Simulado ponderado',
        icone: Scale,
        resumo: `Sorteia do banco de ${bancoCount ?? 0} questões respeitando a Tabela 8.1: 10 de Institucional, 8 de Constitucional, 8 de Português e assim por diante.`,
        questoes: 60,
        tempo: '2h',
      },
      {
        modo: 'apostila',
        titulo: 'Simulado da apostila',
        icone: FileText,
        resumo:
          'O simulado final do capítulo 11, em certo/errado, com o gabarito comentado questão por questão.',
        questoes: simuladoCount ?? 0,
        tempo: '1h',
      },
    ];

    return (
      <div className="entra space-y-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            Simulado
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sem feedback durante a prova — a correção comentada, com a sua resposta ao lado da
            correta, aparece no final.
          </p>
        </div>

        {/* A prova oficial é a melhor medida que existe aqui, então ela ganha
            a linha inteira e os números em tamanho de dado, não de etiqueta.
            Os dois simulados montados ficam abaixo, do mesmo tamanho entre si. */}
        <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700/70">
          <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
                  <Flag size={20} />
                </span>
                <div>
                  <h2 className="text-lg leading-tight font-semibold text-slate-900 dark:text-slate-100">
                    Prova oficial PMSC 2023
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Soldado · Cebraspe · 27 de agosto de 2023
                  </p>
                </div>
              </div>
              <p className="mt-3 max-w-prose text-sm leading-6 text-slate-600 dark:text-slate-400">
                As questões que caíram de verdade, com 5 alternativas e no tempo de prova. É o
                número mais honesto que você consegue hoje.
              </p>
              <Link
                href="/simulado?modo=prova2023"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <Timer size={16} />
                Iniciar a prova de 2h
              </Link>
            </div>

            <dl className="flex shrink-0 gap-6 border-slate-200 sm:flex-col sm:gap-4 sm:border-l sm:pl-6 dark:border-slate-700/70">
              <div>
                <dd className="text-3xl leading-none font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  <Contador para={provaCount ?? 0} />
                </dd>
                <dt className="mt-1 text-sm text-slate-500 dark:text-slate-400">questões reais</dt>
              </div>
              <div>
                <dd className="text-3xl leading-none font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  5
                </dd>
                <dt className="mt-1 text-sm text-slate-500 dark:text-slate-400">alternativas</dt>
              </div>
              <div>
                <dd className="text-3xl leading-none font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  2h
                </dd>
                <dt className="mt-1 text-sm text-slate-500 dark:text-slate-400">de relógio</dt>
              </div>
            </dl>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {secundarios.map((o) => {
            const Icone = o.icone;
            return (
              <Card key={o.modo}>
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                      <Icone size={18} />
                    </span>
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">{o.titulo}</h2>
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {o.resumo}
                  </p>
                  <p className="mt-3 text-sm text-slate-500 tabular-nums dark:text-slate-400">
                    {o.questoes} questões em {o.tempo}
                  </p>
                  <Link
                    href={`/simulado?modo=${o.modo}`}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 ring-1 ring-slate-300 transition hover:bg-brand-50 hover:ring-brand-300 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600 dark:hover:bg-slate-700"
                  >
                    <Timer size={16} />
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
