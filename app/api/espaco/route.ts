import { createClient, getUserId } from '@/lib/supabase/server';

/**
 * Quanto do banco e do bucket de arquivos está ocupado, para a barra de
 * espaço no canto da tela. Vem da função `uso_de_espaco()` (migração 0010);
 * sem ela a resposta diz que o medidor está indisponível, em vez de falhar.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getUserId())) return Response.json({ erro: 'sem sessão' }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('uso_de_espaco');
  if (error || !data) return Response.json({ indisponivel: true });

  const { banco, arquivos } = data as { banco: number; arquivos: number };
  return Response.json({
    banco: Number(banco),
    arquivos: Number(arquivos),
    limiteBanco: Number(process.env.LIMITE_BANCO_MB ?? 500) * 1024 * 1024,
    limiteArquivos: Number(process.env.LIMITE_ARQUIVOS_MB ?? 1024) * 1024 * 1024,
  });
}
