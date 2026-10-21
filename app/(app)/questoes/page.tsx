import Link from 'next/link';
import { Flag, Shuffle, Target } from 'lucide-react';
import { createClient, getUser } from '@/lib/supabase/server';
import QuestionRunner from '@/components/question-runner';
import { Badge, Card } from '@/components/ui';
import { PRIORITY_CLASS, PRIORITY_LABEL, type Question } from '@/lib/types';
import { COLUNAS, comTextosDeApoio, embaralhar } from '@/lib/questions';

export const metadata = { title: 'Questões — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function QuestoesPage({
  searchParams,
}: {
  searchParams: Promise<{ disciplina?: string; n?: string; foco?: string; origem?: string }>;
}) {
  const { disciplina, n, foco, origem } = await searchParams;
  const user = (await getUser())!;
  const supabase = await createClient();

  const { data: disciplines } = await supabase
    .from('disciplines')
    .select('*')
    .order('question_count', { ascending: false });

  // ---------- tela de seleção ----------
  if (!disciplina) {
    const { data: todas } = await supabase
      .from('questions')
      .select('discipline_id, origin')
      .neq('source', 'simulado');

    const porDisciplina = new Map<number, number>();
    let deProva = 0;
    let ineditas = 0;
    for (const q of todas ?? []) {
      if (q.discipline_id) porDisciplina.set(q.discipline_id, (porDisciplina.get(q.discipline_id) ?? 0) + 1);
      if (q.origin === 'prova') deProva++;
      if (q.origin === 'inedita') ineditas++;
    }

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            Treinar questões
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {todas?.length ?? 0} questões no banco — {deProva} da prova oficial de 2023 (Cebraspe),{' '}
            {ineditas} inéditas no estilo da banca e as comentadas da apostila. Cada resposta alimenta
            a revisão espaçada.
          </p>
        </div>

        <Card title="Treino rápido" icon={Shuffle}>
          <div className="flex flex-wrap gap-2">
            {[10, 20, 30, 60].map((qtd) => (
              <Link
                key={qtd}
                href={`/questoes?disciplina=todas&n=${qtd}`}
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                {qtd} aleatórias
              </Link>
            ))}
            <Link
              href="/questoes?disciplina=todas&n=20&foco=erros"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
            >
              <Target size={15} /> 20 focadas nos meus erros
            </Link>
            {deProva > 0 && (
              <Link
                href="/questoes?disciplina=todas&origem=prova"
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                <Flag size={15} /> Só prova oficial ({deProva})
              </Link>
            )}
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          {(disciplines ?? [])
            .filter((d) => (porDisciplina.get(d.id) ?? 0) > 0)
            .map((d) => (
              <Link
                key={d.id}
                href={`/questoes?disciplina=${d.slug}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-slate-200 transition hover:ring-brand-400 dark:bg-slate-900 dark:ring-slate-700"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{d.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {porDisciplina.get(d.id)} questões · {d.question_count} na prova ({d.weight}%)
                  </p>
                </div>
                <Badge className={PRIORITY_CLASS[d.priority as keyof typeof PRIORITY_CLASS]}>
                  {PRIORITY_LABEL[d.priority as keyof typeof PRIORITY_LABEL].replace('Prioridade ', '')}
                </Badge>
              </Link>
            ))}
        </div>
      </div>
    );
  }

  // ---------- monta a lista ----------
  const alvo = disciplines?.find((d) => d.slug === disciplina) ?? null;

  let query = supabase.from('questions').select(COLUNAS).neq('source', 'simulado');
  if (alvo) query = query.eq('discipline_id', alvo.id);
  if (origem === 'prova') query = query.eq('origin', 'prova');

  const { data: raw } = await query;
  let questions = (raw ?? []) as unknown as Question[];

  if (foco === 'erros') {
    const { data: errados } = await supabase
      .from('attempts')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('correct', false);
    const pesados = new Set((errados ?? []).map((a) => a.question_id));
    const comErro = embaralhar(questions.filter((q) => pesados.has(q.id)));
    const resto = embaralhar(questions.filter((q) => !pesados.has(q.id)));
    questions = [...comErro, ...resto];
  } else {
    questions = embaralhar(questions);
  }

  const limite = Math.min(Number(n) || (alvo ? questions.length : 20), questions.length);
  questions = await comTextosDeApoio(supabase, questions.slice(0, limite));

  const subtitulo =
    origem === 'prova' ? 'prova oficial 2023' : foco === 'erros' ? 'focado nos seus erros' : undefined;

  return (
    <div className="space-y-4">
      <Link
        href="/questoes"
        className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
      >
        ← escolher outro filtro
      </Link>
      <QuestionRunner
        questions={questions}
        kind="treino"
        disciplineId={alvo?.id ?? null}
        instant
        titulo={alvo ? alvo.name : 'Treino geral'}
        subtitulo={subtitulo}
        voltarHref="/questoes"
      />
    </div>
  );
}
