'use client';

import { useRef, useState } from 'react';
import { ExternalLink, FileText, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { useSessao } from '@/components/sessao';
import { BUCKET, useUrlsAssinadas } from '@/components/urls-assinadas';
import type { Anexo } from '@/lib/notas';

const TAMANHO_MAXIMO = 20 * 1024 * 1024;

const tamanhoLegivel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

/**
 * PDFs anexados à anotação: prova, apostila, informativo. O bucket é privado,
 * então fica guardado o caminho e a URL é assinada na hora de abrir.
 */
export default function AnexosDaNota({
  anexos,
  onChange,
  somenteLeitura = false,
}: {
  anexos: Anexo[];
  onChange?: (anexos: Anexo[]) => void;
  somenteLeitura?: boolean;
}) {
  const { userId, supabase } = useSessao();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  const urls = useUrlsAssinadas(anexos.map((a) => a.path));

  async function enviar(arquivos: File[]) {
    if (!onChange || somenteLeitura) return;
    const pdfs = arquivos.filter((f) => f.type === 'application/pdf');
    if (!pdfs.length) {
      if (arquivos.length) setErro('Aqui só entra PDF. Imagem vai no corpo da anotação.');
      return;
    }
    if (pdfs.some((f) => f.size > TAMANHO_MAXIMO)) {
      setErro('Cada PDF pode ter no máximo 20 MB.');
      return;
    }

    setErro(null);
    setEnviando((n) => n + pdfs.length);
    const novos: Anexo[] = [];

    for (const arquivo of pdfs) {
      const caminho = `${userId}/${crypto.randomUUID()}.pdf`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, arquivo, { contentType: 'application/pdf', upsert: false });

      if (error) {
        setErro(
          /mime|bucket/i.test(error.message)
            ? 'O bucket ainda não aceita PDF. Rode a migração 0007 no Supabase.'
            : error.message,
        );
      } else {
        // o servidor reescreve o arquivo no lugar, bem menor; se falhar, o
        // anexo continua valendo do jeito que subiu
        const tamanho = await comprimirNoServidor(caminho, arquivo.size);
        novos.push({ path: caminho, name: arquivo.name, size: tamanho });
      }
      setEnviando((n) => n - 1);
    }

    if (novos.length) onChange([...anexos, ...novos]);
  }

  /** Manda o servidor comprimir o PDF e devolve o tamanho que ficou. */
  async function comprimirNoServidor(caminho: string, tamanhoOriginal: number) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return tamanhoOriginal;

      const r = await fetch('/api/comprimir-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ caminho }),
      });
      if (!r.ok) return tamanhoOriginal;

      const { depois } = (await r.json()) as { depois?: number };
      return typeof depois === 'number' && depois > 0 ? depois : tamanhoOriginal;
    } catch {
      return tamanhoOriginal;
    }
  }

  function remover(caminho: string) {
    if (!onChange) return;
    onChange(anexos.filter((a) => a.path !== caminho));
    void supabase.storage.from(BUCKET).remove([caminho]);
  }

  if (somenteLeitura && !anexos.length) return null;

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
            <Paperclip size={15} /> Anexar PDF
          </button>
          <span>ou arraste o arquivo aqui (até 20 MB)</span>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
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

      {(anexos.length > 0 || enviando > 0) && (
        <ul className="space-y-1.5">
          {anexos.map((a) => (
            <li
              key={a.path}
              className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700"
            >
              <FileText size={16} className="shrink-0 text-red-600 dark:text-red-400" />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-200">
                {a.name}
              </span>
              {!!a.size && (
                <span className="shrink-0 text-xs text-slate-400 tabular-nums">
                  {tamanhoLegivel(a.size)}
                </span>
              )}
              {urls[a.path] ? (
                <a
                  href={urls[a.path]}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir o PDF"
                  aria-label={`Abrir ${a.name}`}
                  className="shrink-0 rounded-lg p-1.5 text-brand-600 transition hover:bg-white dark:text-brand-300 dark:hover:bg-slate-700"
                >
                  <ExternalLink size={14} />
                </a>
              ) : (
                <Loader2 size={14} className="shrink-0 animate-spin text-slate-400" />
              )}
              {!somenteLeitura && (
                <button
                  type="button"
                  onClick={() => remover(a.path)}
                  title="Remover o anexo"
                  aria-label={`Remover ${a.name}`}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}

          {Array.from({ length: enviando }, (_, i) => (
            <li
              key={`enviando-${i}`}
              className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"
            >
              <Loader2 size={15} className="animate-spin text-brand-500" /> enviando PDF…
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
