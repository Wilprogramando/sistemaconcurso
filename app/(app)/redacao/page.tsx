import Link from 'next/link';
import { PenLine, TrendingUp } from 'lucide-react';
import { createClient, getUserId } from '@/lib/supabase/server';
import { Card, Empty } from '@/components/ui';
import { TEMAS, sortearTema } from '@/lib/redacao/temas';
import Editor from './editor';

export const metadata = { title: 'Redação — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function RedacaoPage() {
  const user = { id: (await getUserId())! };
  const supabase = await createClient();

  const { data: anteriores } = await supabase
    .from('essays')
    .select('id, theme_title, score, max_score, words, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(8);

  const historico = anteriores ?? [];
  const media = historico.length
    ? Math.round((10 * historico.reduce((a, e) => a + Number(e.score), 0)) / historico.length) / 10
    : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">Redação</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          A redação vale <strong className="text-slate-700 dark:text-slate-200">20 dos 80 pontos</strong>{' '}
          da 1ª fase — um quarto da nota. Sorteie um tema de ordem pública, escreva com o cronômetro
          rodando e receba a correção por critérios.
        </p>
      </div>

      {historico.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <p className="text-[0.7rem] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Redações escritas
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{historico.length}</p>
          </Card>
          <Card>
            <p className="text-[0.7rem] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Nota média
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{media}/20</p>
          </Card>
          <Card>
            <p className="text-[0.7rem] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Última nota
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{historico[0].score}/20</p>
          </Card>
        </div>
      )}

      <Editor temaInicial={sortearTema()} />

      <Card
        title="Histórico"
        subtitle="As últimas redações salvas neste sistema"
        icon={TrendingUp}
      >
        {!historico.length ? (
          <Empty>Nenhuma redação ainda. Sorteie um tema acima e escreva a primeira.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {historico.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">
                  {e.theme_title}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(e.created_at).toLocaleDateString('pt-BR')} · {e.words} palavras
                </span>
                <span className="font-semibold tabular-nums">
                  {e.score}/{e.max_score}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Os temas do banco" subtitle={`${TEMAS.length} temas, todos no recorte de ordem pública`} icon={PenLine}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {TEMAS.map((t) => (
            <li
              key={t.id}
              className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
            >
              <span className="mb-1 block text-[0.7rem] font-semibold tracking-wide text-slate-400 uppercase">
                {t.eixo}
              </span>
              {t.titulo}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
          O recorte vem do edital, e o repertório de cada tema sai do capítulo 10 da apostila. Para
          revisar a estrutura antes de escrever, veja{' '}
          <Link href="/materias/redacao" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
            Matérias → Prova de Redação
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
