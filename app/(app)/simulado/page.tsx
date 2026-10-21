import Link from 'next/link';
import { createClient, getUser } from '@/lib/supabase/server';
import QuestionRunner from '@/components/question-runner';
import { Card } from '@/components/ui';
import type { Question } from '@/lib/types';

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
    const [{ count: simuladoCount }, { count: bancoCount }] = await Promise.all([
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('source', 'simulado'),
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('source', 'apostila'),
    ]);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Simulado</h1>
          <p className="text-sm text-slate-500">
            Sem feedback durante a prova — o gabarito comentado aparece no final, como na AOCP.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card
            title="Simulado oficial da apostila"
            subtitle={`${simuladoCount ?? 0} questões de todas as disciplinas · 60 minutos`}
          >
            <p className="text-sm text-slate-600">
              O simulado final do capítulo 11, com o gabarito comentado da apostila.
            </p>
            <Link
              href="/simulado?modo=apostila"
              className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Iniciar
            </Link>
          </Card>

          <Card
            title="Simulado ponderado — 60 questões"
            subtitle="Distribuição igual à da prova · 120 minutos"
          >
            <p className="text-sm text-slate-600">
              Sorteia questões do banco ({bancoCount ?? 0} no total) respeitando a Tabela 8.1: 10 de
              Institucional, 8 de Constitucional, 8 de Português e assim por diante.
            </p>
            <Link
              href="/simulado?modo=ponderado"
              className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Iniciar
            </Link>
          </Card>
        </div>

        <Card title="Como a prova é pontuada">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>60 questões objetivas de 5 alternativas, 1,00 ponto cada.</li>
            <li>Redação vale 20 pontos — um quarto da nota da 1ª fase.</li>
            <li>Aprovação exige no mínimo 50% do total da etapa.</li>
            <li>Zerar uma única área de conhecimento elimina o candidato.</li>
          </ul>
        </Card>
      </div>
    );
  }

  let questions: Question[] = [];
  let limite = 60 * 60;
  let titulo = '';

  if (modo === 'apostila') {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('source', 'simulado')
      .order('number');
    questions = (data ?? []) as Question[];
    limite = 60 * 60;
    titulo = 'Simulado final da apostila';
  } else {
    const [{ data: disciplines }, { data: banco }] = await Promise.all([
      supabase.from('disciplines').select('*').gt('question_count', 0),
      supabase.from('questions').select('*').eq('source', 'apostila'),
    ]);

    const porDisciplina = new Map<number, Question[]>();
    for (const q of (banco ?? []) as Question[]) {
      if (!q.discipline_id) continue;
      const arr = porDisciplina.get(q.discipline_id) ?? [];
      arr.push(q);
      porDisciplina.set(q.discipline_id, arr);
    }

    for (const d of disciplines ?? []) {
      const pool = (porDisciplina.get(d.id) ?? []).sort(() => Math.random() - 0.5);
      questions.push(...pool.slice(0, d.question_count));
    }
    questions = questions.sort(() => Math.random() - 0.5);
    limite = 120 * 60;
    titulo = `Simulado ponderado (${questions.length} questões)`;
  }

  return (
    <div className="space-y-4">
      <Link href="/simulado" className="text-sm text-brand-700 hover:underline">
        ← simulados
      </Link>
      <QuestionRunner
        questions={questions}
        kind="simulado"
        instant={false}
        timeLimitSeconds={limite}
        titulo={titulo}
        voltarHref="/simulado"
      />
    </div>
  );
}
