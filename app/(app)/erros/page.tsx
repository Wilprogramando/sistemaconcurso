import Link from 'next/link';
import { createClient, getUser } from '@/lib/supabase/server';
import { Card, Empty } from '@/components/ui';
import ErrorItem from './error-item';

export const metadata = { title: 'Caderno de erros — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function ErrosPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver } = await searchParams;
  const mostrarResolvidos = ver === 'resolvidos';
  const user = (await getUser())!;
  const supabase = await createClient();

  // as duas consultas são independentes: uma espera da outra era meia tela parada
  const [{ data: notes }, { data: disciplines }] = await Promise.all([
    supabase
      .from('error_notes')
      .select(
        'id, note, resolved, created_at, question_id, questions ( id, statement, answer, explanation, discipline_id )'
      )
      .eq('user_id', user.id)
      .eq('resolved', mostrarResolvidos)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('disciplines').select('id, name, slug'),
  ]);
  const nomeDisciplina = new Map((disciplines ?? []).map((d) => [d.id, d]));

  // agrupa por questão para não repetir a mesma dezenas de vezes
  const vistos = new Set<number>();
  const lista = (notes ?? []).filter((n) => {
    if (!n.question_id) return true;
    if (vistos.has(n.question_id)) return false;
    vistos.add(n.question_id);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">Caderno de erros</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Toda questão errada cai aqui automaticamente. Anote o motivo do erro — é nele que está a
            sua nota.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href="/erros"
            className={`rounded-lg px-3 py-1.5 font-medium ${
              !mostrarResolvidos ? 'bg-brand-600 text-white' : 'bg-white text-brand-700 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600'
            }`}
          >
            Abertos
          </Link>
          <Link
            href="/erros?ver=resolvidos"
            className={`rounded-lg px-3 py-1.5 font-medium ${
              mostrarResolvidos ? 'bg-brand-600 text-white' : 'bg-white text-brand-700 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600'
            }`}
          >
            Resolvidos
          </Link>
        </div>
      </div>

      {!lista.length ? (
        <Card>
          <Empty>
            {mostrarResolvidos
              ? 'Nenhum erro marcado como resolvido ainda.'
              : 'Nenhum erro registrado. Treine questões e os erros aparecerão aqui.'}
          </Empty>
        </Card>
      ) : (
        <ul className="space-y-3">
          {lista.map((n) => {
            const q = Array.isArray(n.questions) ? n.questions[0] : n.questions;
            const d = q?.discipline_id ? nomeDisciplina.get(q.discipline_id) : null;
            return (
              <li key={n.id}>
                <ErrorItem
                  id={n.id}
                  note={n.note ?? ''}
                  resolved={n.resolved}
                  statement={q?.statement ?? '(questão removida)'}
                  answer={q?.answer ?? null}
                  explanation={q?.explanation ?? ''}
                  disciplineName={d?.name ?? null}
                  disciplineSlug={d?.slug ?? null}
                  createdAt={n.created_at}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
