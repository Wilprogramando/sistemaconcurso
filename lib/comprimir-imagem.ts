/**
 * Compressão da imagem no navegador, antes de subir para o bucket.
 *
 * Print de apostila e foto de celular chegam com 3–8 MB e resolução que a tela
 * nunca usa. Aqui a imagem é redesenhada no tamanho máximo útil e reescrita em
 * WebP, o que costuma derrubar o arquivo para algumas centenas de KB sem perda
 * visível na leitura.
 *
 * GIF fica de fora: redesenhar mataria a animação.
 */

/** maior lado da imagem depois de redimensionar */
const LADO_MAXIMO = 1280;
/** qualidade do WebP; 0.72 ainda deixa texto de print legível e pesa bem menos */
const QUALIDADE = 0.72;
/** abaixo disso não vale a pena recomprimir */
const PISO = 60 * 1024;

export type Comprimida = { arquivo: File; antes: number; depois: number };

const semExtensao = (nome: string) => nome.replace(/\.[^.]+$/, '') || 'imagem';

/** Lê o arquivo como bitmap, com volta pelo <img> quando falta createImageBitmap. */
async function carregar(arquivo: File): Promise<{ largura: number; altura: number; fonte: CanvasImageSource }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(arquivo);
    return { largura: bitmap.width, altura: bitmap.height, fonte: bitmap };
  }

  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const el = new Image();
      el.onload = () => ok(el);
      el.onerror = () => falha(new Error('imagem ilegível'));
      el.src = url;
    });
    return { largura: img.naturalWidth, altura: img.naturalHeight, fonte: img };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Devolve a imagem reduzida. Se a conta não fechar — formato que o navegador
 * não decodifica, resultado maior que o original, GIF — devolve o arquivo
 * original, para o upload nunca ficar bloqueado pela compressão.
 */
export async function comprimirImagem(arquivo: File): Promise<Comprimida> {
  const intacto = { arquivo, antes: arquivo.size, depois: arquivo.size };

  if (arquivo.type === 'image/gif') return intacto;
  if (!/^image\//.test(arquivo.type)) return intacto;

  try {
    const { largura, altura, fonte } = await carregar(arquivo);
    if (!largura || !altura) return intacto;

    // imagem pequena e leve: não mexe
    const escala = Math.min(1, LADO_MAXIMO / Math.max(largura, altura));
    if (escala === 1 && arquivo.size <= PISO) return intacto;

    const l = Math.max(1, Math.round(largura * escala));
    const a = Math.max(1, Math.round(altura * escala));

    const canvas = document.createElement('canvas');
    canvas.width = l;
    canvas.height = a;
    const ctx = canvas.getContext('2d');
    if (!ctx) return intacto;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(fonte, 0, 0, l, a);

    const blob = await new Promise<Blob | null>((ok) =>
      canvas.toBlob(ok, 'image/webp', QUALIDADE),
    );
    if (!blob || blob.size >= arquivo.size) return intacto;

    return {
      arquivo: new File([blob], `${semExtensao(arquivo.name)}.webp`, { type: 'image/webp' }),
      antes: arquivo.size,
      depois: blob.size,
    };
  } catch {
    return intacto;
  }
}
