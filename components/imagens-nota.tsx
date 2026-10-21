'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Maximize2, Trash2, X } from 'lucide-react';
import { useSessao } from '@/components/sessao';

export const BUCKET = 'anotacoes';
const TAMANHO_MAXIMO = 8 * 1024 * 1024;
const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const extensaoDe = (tipo: string) =>
  ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' })[tipo] ??
  'png';

/**
 * Anexos de imagem da anotação: print da apostila, foto do caderno, recorte
 * de uma questão. O bucket é privado, então o caminho é o que fica guardado
 * e a URL é assinada na hora de exibir.
 */
export default function ImagensDaNota({
  caminhos,
  onChange,
  somenteLeitura = false,
}: {
  caminhos: string[];
  onChange?: (caminhos: string[]) => void;
  somenteLeitura?: boolean;
}) {
  const { userId, supabase } = useSessao();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // assina as URLs sempre que a lista muda
  useEffect(() => {
    const faltando = caminhos.filter((c) => !urls[c]);
    if (!faltando.length) return;

    let cancelado = false;
    (async () => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrls(faltando, 3600);
      if (cancelado || !data) return;
      const novas: Record<string, string> = {};
      for (const item of data) {
        if (item.signedUrl && item.path) novas[item.path] = item.signedUrl;
      }
      setUrls((u) => ({ ...u, ...novas }));
    })();

    return () => {
      cancelado = true;
    };
  }, [caminhos, urls, supabase]);

  const enviar = useCallback(
    async (arquivos: File[]) => {
      if (!onChange || somenteLeitura) return;
      const validos = arquivos.filter((f) => TIPOS.includes(f.type));
      if (!validos.length) return;

      setErro(null);
      const grandes = validos.filter((f) => f.size > TAMANHO_MAXIMO);
      if (grandes.length) {
        setErro('Cada imagem pode ter no máximo 8 MB.');
        return;
      }

      setEnviando((n) => n + validos.length);
      const novos: string[] = [];

      for (const arquivo of validos) {
        const caminho = `${userId}/${crypto.randomUUID()}.${extensaoDe(arquivo.type)}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });

        if (error) {
          setErro(
            /bucket/i.test(error.message)
              ? 'O bucket de imagens ainda não existe. Rode a migração 0006 no Supabase.'
              : error.message
          );
        } else {
          novos.push(caminho);
        }
        setEnviando((n) => n - 1);
      }

      if (novos.length) onChange([...caminhos, ...novos]);
    },
    [caminhos, onChange, somenteLeitura, supabase, userId]
  );

  // colar print direto do Ctrl+V
  useEffect(() => {
    if (somenteLeitura || !onChange) return;
    const aoColar = (e: ClipboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (!alvo?.closest?.('[data-area-nota]')) return;
      const arquivos = [...(e.clipboardData?.files ?? [])];
      if (!arquivos.length) return;
      e.preventDefault();
      void enviar(arquivos);
    };
    document.addEventListener('paste', aoColar);
    return () => document.removeEventListener('paste', aoColar);
  }, [enviar, onChange, somenteLeitura]);

  function remover(caminho: string) {
    if (!onChange) return;
    onChange(caminhos.filter((c) => c !== caminho));
    void supabase.storage.from(BUCKET).remove([caminho]);
  }

  const vazio = caminhos.length === 0 && enviando === 0;
  if (somenteLeitura && vazio) return null;

  return (
    <div className="space-y-2">
      {!somenteLeitura && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void enviar([...e.dataTransfer.files]);
          }}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400"
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
          >
            <ImagePlus size={15} /> Adicionar imagem
          </button>
          <span>ou cole um print com Ctrl + V, ou arraste o arquivo aqui</span>
          <input
            ref={inputRef}
            type="file"
            accept={TIPOS.join(',')}
            multiple
            hidden
            onChange={(e) => {
              void enviar([...(e.target.files ?? [])]);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {erro}
        </p>
      )}

      {(caminhos.length > 0 || enviando > 0) && (
        <ul className="flex flex-wrap gap-2">
          {caminhos.map((c) => (
            <li key={c} className="group relative">
              {urls[c] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urls[c]}
                  alt="Imagem da anotação"
                  className="h-24 w-32 cursor-zoom-in rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  onClick={() => setAmpliada(urls[c])}
                />
              ) : (
                <div className="grid h-24 w-32 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <Loader2 size={18} className="animate-spin text-slate-400" />
                </div>
              )}

              <button
                type="button"
                onClick={() => urls[c] && setAmpliada(urls[c])}
                aria-label="Ampliar"
                className="absolute bottom-1 left-1 rounded-md bg-slate-900/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
              >
                <Maximize2 size={12} />
              </button>

              {!somenteLeitura && (
                <button
                  type="button"
                  onClick={() => remover(c)}
                  aria-label="Remover imagem"
                  className="absolute top-1 right-1 rounded-md bg-red-600/90 p-1 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </li>
          ))}

          {Array.from({ length: enviando }, (_, i) => (
            <li
              key={`enviando-${i}`}
              className="grid h-24 w-32 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800"
            >
              <Loader2 size={18} className="animate-spin text-brand-500" />
            </li>
          ))}
        </ul>
      )}

      {ampliada && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/80 p-4 backdrop-blur-sm"
          onClick={() => setAmpliada(null)}
          role="dialog"
          aria-label="Imagem ampliada"
        >
          <button
            type="button"
            aria-label="Fechar"
            className="absolute top-4 right-4 rounded-lg bg-white/15 p-2 text-white"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ampliada}
            alt="Imagem da anotação ampliada"
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
