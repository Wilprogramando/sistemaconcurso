import { createClient } from '@supabase/supabase-js';

/**
 * Comprime um PDF que acabou de entrar no bucket.
 *
 * O navegador não dá conta disso — o motor de PDF é pesado demais para
 * carregar numa aba — então o arquivo sobe cru e esta rota o reescreve no
 * lugar: objetos repetidos (as fontes costumam vir embutidas em cada página)
 * viram um só, o que sobra sem dono é descartado e tudo é regravado
 * comprimido. No edital isso tirou 78% do tamanho.
 *
 * A rota não guarda chave de serviço: ela usa o token de quem está logado,
 * então o RLS do Storage continua valendo e ninguém mexe na pasta do outro.
 */
export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'anotacoes';

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /i, '');
  if (!token) return Response.json({ erro: 'sem sessão' }, { status: 401 });

  let caminho: string;
  try {
    ({ caminho } = (await request.json()) as { caminho: string });
  } catch {
    return Response.json({ erro: 'pedido inválido' }, { status: 400 });
  }

  if (!caminho || !/^[\w-]+\/[\w-]+\.pdf$/i.test(caminho)) {
    return Response.json({ erro: 'caminho inválido' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
  );

  const { data, error } = await supabase.storage.from(BUCKET).download(caminho);
  if (error || !data) {
    return Response.json({ erro: error?.message ?? 'arquivo não encontrado' }, { status: 404 });
  }

  const original = Buffer.from(await data.arrayBuffer());

  let menor: Buffer;
  try {
    // o motor é carregado só aqui: no topo do arquivo ele quebra a coleta de
    // rotas do build, porque o pacote inicializa WebAssembly ao ser importado
    const mupdf = await import('mupdf');
    const doc = mupdf.PDFDocument.openDocument(original, 'application/pdf') as InstanceType<
      typeof mupdf.PDFDocument
    >;
    const saida = doc.saveToBuffer('compress,compress-images,compress-fonts,garbage=4,sanitize');
    menor = Buffer.from(saida.asUint8Array());
  } catch {
    // PDF que o motor não abre (protegido, quebrado): fica como está
    return Response.json({ antes: original.length, depois: original.length, mexeu: false });
  }

  // reescrever por algo maior seria piorar
  if (menor.length >= original.length) {
    return Response.json({ antes: original.length, depois: original.length, mexeu: false });
  }

  /**
   * O bucket só tem política de ler, gravar e apagar — não de sobrescrever —,
   * então o caminho é apagar e gravar de novo. O arquivo original continua na
   * memória: se a gravação falhar, ele volta para o lugar e o anexo não se
   * perde.
   */
  await supabase.storage.from(BUCKET).remove([caminho]);

  const { error: erroSubir } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, menor, { contentType: 'application/pdf', upsert: true });

  if (erroSubir) {
    await supabase.storage
      .from(BUCKET)
      .upload(caminho, original, { contentType: 'application/pdf', upsert: true });
    return Response.json({ antes: original.length, depois: original.length, mexeu: false });
  }

  return Response.json({ antes: original.length, depois: menor.length, mexeu: true });
}
