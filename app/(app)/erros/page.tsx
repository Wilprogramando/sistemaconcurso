import Link from 'next/link';
import { NotebookPen } from 'lucide-react';
import { createClient, getUserId } from '@/lib/supabase/server';
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
  const user = { id: (await getUserId())! };
  const supabase = await createClient();

  // as consultas são independentes: uma esperando a outra era meia tela parada
  const [{ data: notes }, { data: disciplines }, { count: abertos }, { count: resolvidos }] =
    await Promise.all([
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
      supabase
        .from('error_notes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('resolved', false),
      supabase
        .from('error_notes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('resolved', true),
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

  const comMotivo = lista.filter((n) => (n.note ?? '').trim().length > 0).length;
  const abas = [
    { href: '/erros', nome: 'Abertos', ativo: !mostrarResolvidos, quantos: abertos ?? 0 },
    {
      href: '/erros?ver=resolvidos',
      nome: 'Resolvidos',
      ativo: mostrarResolvidos,
      quantos: resolvidos ?? 0,
    },
  ];

  return (
    <div className="entra space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            Caderno de erros
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Toda questão errada cai aqui automaticamente. Anote o motivo do erro — é nele que está a
            sua nota.
          </p>
        </div>
        {/* a contagem vive na aba: dá para ver o tamanho dos dois lados sem trocar de tela */}
        <div className="flex gap-2 text-sm">
          {abas.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              aria-current={a.ativo ? 'page' : undefined}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-medium transition ${
                a.ativo
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600 dark:hover:bg-slate-700'
              }`}
            >
              {a.nome}
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  a.ativo
                    ? 'bg-white/20'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {a.quantos}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {!lista.length ? (
        <section className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200/80 sm:p-8 dark:bg-slate-900 dark:ring-slate-700/70">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
            <NotebookPen size={26} />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {mostrarResolvidos ? 'Nenhum erro resolvido ainda' : 'Caderno vazio'}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
            {mostrarResolvidos
              ? 'Quando você entender um erro e marcar como resolvido, ele fica guardado aqui.'
              : 'Treine questões: cada erro cai aqui com o gabarito e o espaço para você anotar o motivo.'}
          </p>
          <Link
            href="/questoes"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Treinar questões
          </Link>
        </section>
      ) : (
        <>
          {!mostrarResolvidos && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {comMotivo} de {lista.length} com o motivo anotado. O motivo é o que impede o erro de
              voltar.
            </p>
          )}
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
        </>
      )}
    </div>
  );
}
