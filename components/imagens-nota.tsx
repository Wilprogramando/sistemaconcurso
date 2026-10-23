'use client';

import { useCallback, useRef, useState } from 'react';
import { ImagePlus, Loader2, Maximize2, Trash2, X } from 'lucide-react';
import { useSessao } from '@/components/sessao';
import { BUCKET, useUrlsAssinadas } from '@/components/urls-assinadas';
import { comprimirImagem } from '@/lib/comprimir-imagem';

const TAMANHO_MAXIMO = 8 * 1024 * 1024;
const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const extensaoDe = (tipo: string) =>
  ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' })[tipo] ??
  'webp';

/**
 * Galeria de imagens soltas da anotação: print da apostila, foto do caderno.
 * Para amarrar a imagem ao texto da questão, o caminho é a imagem dentro do
 * corpo (botão de imagem do editor) — aqui é só anexo.
 *
 * O bucket é privado, então o caminho é o que fica guardado e a URL é
 * assinada na hora de exibir.
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
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const urls = useUrlsAssinadas(caminhos);

  const enviar = useCallback(
    async (arquivos: File[]) => {
      if (!onChange || somenteLeitura) return;
      const validos = arquivos.filter((f) => TIPOS.includes(f.type));
      if (!validos.length) return;

      setErro(null);
      setEnviando((n) => n + validos.length);
      const novos: string[] = [];

      for (const original of validos) {
        // redimensiona e reescreve em WebP: só o arquivo leve vai para o bucket
        const { arquivo } = await comprimirImagem(original);

        if (arquivo.size > TAMANHO_MAXIMO) {
          setErro('Esta imagem passa de 8 MB mesmo depois de comprimida.');
          setEnviando((n) => n - 1);
          continue;
        }

        const caminho = `${userId}/${crypto.randomUUID()}.${extensaoDe(arquivo.type)}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });

        if (error) {
          setErro(
            /bucket/i.test(error.message)
              ? 'O bucket de imagens ainda não existe. Rode a migração 0006 no Supabase.'
              : error.message,
          );
        } else {
          novos.push(caminho);
        }
        setEnviando((n) => n - 1);
      }

      if (novos.length) onChange([...caminhos, ...novos]);
    },
    [caminhos, onChange, somenteLeitura, supabase, userId],
  );

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
            <ImagePlus size={15} /> Imagem em anexo
          </button>
          <span>ou arraste o arquivo aqui — para colar no meio do texto, use Ctrl + V no corpo</span>
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
