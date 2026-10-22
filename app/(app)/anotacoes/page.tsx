import { NotebookPen } from 'lucide-react';
import { createClient, getUser } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { ehTabelaAusente, type Nota } from '@/lib/notas';
import ListaDeNotas from './lista';

export const metadata = { title: 'Anotações — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function AnotacoesPage() {
  const user = (await getUser())!;
  const supabase = await createClient();

  const [{ data: notas, error }, { data: disciplinas }, { data: topicos }] = await Promise.all([
    supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false }),
    supabase.from('disciplines').select('id, name, slug').order('chapter'),
    supabase.from('topics').select('id, ref, title'),
  ]);

  if (error && ehTabelaAusente(error.message)) return <FaltaMigracao />;

  const porDisciplina = new Map((disciplinas ?? []).map((d) => [d.id, d]));
  const porTopico = new Map((topicos ?? []).map((t) => [t.id, t]));

  const comContexto = ((notas ?? []) as Nota[]).map((n) => {
    const d = n.discipline_id ? porDisciplina.get(n.discipline_id) : null;
    const t = n.topic_id ? porTopico.get(n.topic_id) : null;
    return {
      ...n,
      disciplinaNome: d?.name ?? null,
      disciplinaSlug: d?.slug ?? null,
      topicoRef: t?.ref ?? null,
      topicoTitulo: t?.title ?? null,
    };
  });

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl bg-brand-900 px-5 py-6 text-white sm:px-7 dark:bg-slate-900">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-8 -right-10 h-48 w-64 rotate-12 opacity-[0.07]"
          style={{
            backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 3px, transparent 3px 22px)',
          }}
        />
        <div className="relative flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15">
            <NotebookPen size={24} />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-bold sm:text-3xl">Anotações</h1>
            <p className="mt-1 max-w-2xl text-sm text-brand-100">
              Seu caderno livre: macetes, números que não grudam, dúvidas para tirar depois. Cada
              matéria tem o seu caderno — clique no card para abrir.
            </p>
          </div>
        </div>
      </header>

      <ListaDeNotas
        notas={comContexto}
        disciplinas={(disciplinas ?? []).map((d) => ({ id: d.id, nome: d.name, slug: d.slug }))}
      />
    </div>
  );
}

function FaltaMigracao() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
        Anotações
      </h1>
      <Card title="Falta um passo no banco de dados" icon={NotebookPen}>
        <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">
          As anotações ficam guardadas numa tabela que ainda não existe no seu Supabase. Rode{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
            supabase/migrations/0005_anotacoes_e_aulas.sql
          </code>{' '}
          no SQL Editor e recarregue esta página.
        </p>
      </Card>
    </div>
  );
}
