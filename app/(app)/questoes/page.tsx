import Link from 'next/link';
import { createClient, getUser } from '@/lib/supabase/server';
import QuestionRunner from '@/components/question-runner';
import { Badge, Card } from '@/components/ui';
import { PRIORITY_CLASS, PRIORITY_LABEL, type Question } from '@/lib/types';

export const metadata = { title: 'Questões — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function QuestoesPage({
  searchParams,
}: {
  searchParams: Promise<{ disciplina?: string; n?: string; errosPrimeiro?: string }>;
}) {
  const { disciplina, n, errosPrimeiro } = await searchParams;
  const user = (await getUser())!;
  const supabase = await createClient();

  const { data: disciplines } = await supabase
    .from('disciplines')
    .select('*')
    .order('question_count', { ascending: false });

  // tela de seleção
  if (!disciplina) {
    const { data: counts } = await supabase
      .from('questions')
      .select('discipline_id')
      .eq('source', 'apostila');
    const porDisciplina = new Map<number, number>();
    for (const q of counts ?? []) {
      if (q.discipline_id) porDisciplina.set(q.discipline_id, (porDisciplina.get(q.discipline_id) ?? 0) + 1);
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Treinar questões</h1>
          <p className="text-sm text-slate-500">
            Questões comentadas da apostila, com feedback e fundamento imediatos. Cada resposta
            alimenta a revisão espaçada.
          </p>
        </div>

        <Card title="Misturar tudo">
          <div className="flex flex-wrap gap-2">
            {[10, 20, 30, 60].map((qtd) => (
              <Link
                key={qtd}
                href={`/questoes?disciplina=todas&n=${qtd}`}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                {qtd} questões aleatórias
              </Link>
            ))}
            <Link
              href="/questoes?disciplina=todas&n=20&errosPrimeiro=1"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              20 focadas nos meus erros
            </Link>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          {(disciplines ?? [])
            .filter((d) => (porDisciplina.get(d.id) ?? 0) > 0)
            .map((d) => (
              <Link
                key={d.id}
                href={`/questoes?disciplina=${d.slug}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200/70 transition hover:ring-brand-500"
              >
                <div>
                  <p className="font-medium text-slate-900">{d.name}</p>
                  <p className="text-xs text-slate-500">
                    {porDisciplina.get(d.id)} questões · {d.question_count} na prova ({d.weight}%)
                  </p>
                </div>
                <Badge className={PRIORITY_CLASS[d.priority as keyof typeof PRIORITY_CLASS]}>
                  {PRIORITY_LABEL[d.priority as keyof typeof PRIORITY_LABEL]}
                </Badge>
              </Link>
            ))}
        </div>
      </div>
    );
  }

  // monta a lista de questões
  const alvo = disciplines?.find((d) => d.slug === disciplina) ?? null;
  let query = supabase.from('questions').select('*').eq('source', 'apostila');
  if (alvo) query = query.eq('discipline_id', alvo.id);

  const { data: raw } = await query;
  let questions = (raw ?? []) as Question[];

  if (errosPrimeiro === '1') {
    const { data: errados } = await supabase
      .from('attempts')
      .select('question_id, correct')
      .eq('user_id', user.id)
      .eq('correct', false);
    const peso = new Set((errados ?? []).map((a) => a.question_id));
    questions = questions.sort(
      (a, b) => Number(peso.has(b.id)) - Number(peso.has(a.id)) || Math.random() - 0.5
    );
  } else {
    questions = questions.sort(() => Math.random() - 0.5);
  }

  const limite = Math.min(Number(n) || (alvo ? questions.length : 20), questions.length);
  questions = questions.slice(0, limite);

  return (
    <div className="space-y-4">
      <Link href="/questoes" className="text-sm text-brand-700 hover:underline">
        ← escolher outro filtro
      </Link>
      <QuestionRunner
        questions={questions}
        kind="treino"
        disciplineId={alvo?.id ?? null}
        instant
        titulo={alvo ? alvo.name : 'Treino geral'}
        voltarHref="/questoes"
      />
    </div>
  );
}
