import { createClient, getUserId } from '@/lib/supabase/server';
import { limparBusca } from '@/lib/questions';

/**
 * Busca por palavra-chave para o pop-up do botão direito: devolve uma página
 * de questões e o total, sem tirar a pessoa da tela em que está. `de` é o
 * deslocamento, para o botão "procurar mais" continuar de onde parou.
 */
export const dynamic = 'force-dynamic';

const POR_PAGINA = 5;

export async function GET(request: Request) {
  if (!(await getUserId())) return Response.json({ erro: 'sem sessão' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const busca = limparBusca(params.get('q'));
  if (busca.length < 2) return Response.json({ erro: 'busca curta demais' }, { status: 400 });
  const de = Math.max(0, Math.min(Number(params.get('de')) || 0, 5000));

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
    .range(de, de + POR_PAGINA - 1);

  if (error) return Response.json({ erro: 'falha na busca' }, { status: 500 });
  return Response.json({ busca, total: count ?? de + (data?.length ?? 0), questoes: data ?? [] });
}
