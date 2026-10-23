import { createClient, getUserId } from '@/lib/supabase/server';
import { limparBusca } from '@/lib/questions';

/**
 * Prévia da busca por palavra-chave, para o pop-up do botão direito: as
 * primeiras questões e o total, sem tirar a pessoa da tela em que está.
 */
export const dynamic = 'force-dynamic';

const PREVIA = 5;

export async function GET(request: Request) {
  if (!(await getUserId())) return Response.json({ erro: 'sem sessão' }, { status: 401 });

  const busca = limparBusca(new URL(request.url).searchParams.get('q'));
  if (busca.length < 2) return Response.json({ erro: 'busca curta demais' }, { status: 400 });

  const padrao = `"%${busca}%"`;
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from('questions')
    .select('id, kind, options, statement, answer, explanation, origin_label, year, banca', {
      count: 'exact',
    })
    .neq('source', 'simulado')
    .or(`statement.ilike.${padrao},explanation.ilike.${padrao}`)
    .order('id')
    .limit(PREVIA);

  if (error) return Response.json({ erro: 'falha na busca' }, { status: 500 });
  return Response.json({ busca, total: count ?? data?.length ?? 0, questoes: data ?? [] });
}
