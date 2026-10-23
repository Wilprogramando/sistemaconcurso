'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useUrlsAssinadas } from '@/components/urls-assinadas';
import { aplicarUrls, caminhosNoHtml, sanitizarHtml } from '@/lib/html-nota';

/**
 * Leitura do corpo da anotação. Se houver HTML, ele é saneado de novo na hora
 * de exibir (defesa em profundidade) e as imagens internas recebem URL
 * assinada. Sem HTML, cai no texto simples das anotações antigas.
 */
export default function CorpoNota({
  html,
  texto,
  className = '',
}: {
  html?: string | null;
  texto?: string;
  className?: string;
}) {
  const [ampliada, setAmpliada] = useState<string | null>(null);

  const limpo = useMemo(() => (html ? sanitizarHtml(html) : ''), [html]);
  const caminhos = useMemo(() => caminhosNoHtml(limpo), [limpo]);
  const urls = useUrlsAssinadas(caminhos);
  const final = useMemo(() => aplicarUrls(limpo, urls), [limpo, urls]);

  if (!limpo) {
    if (!texto) return null;
    return (
      <p
        className={`text-sm leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-300 ${className}`}
      >
        {texto}
      </p>
    );
  }

  return (
    <>
      <div
        className={`nota-rica text-sm leading-7 text-slate-700 dark:text-slate-300 ${className}`}
        onClick={(e) => {
          const alvo = e.target as HTMLElement;
          if (alvo.tagName === 'IMG') {
            const src = (alvo as HTMLImageElement).src;
            if (src) setAmpliada(src);
          }
        }}
        dangerouslySetInnerHTML={{ __html: final }}
      />

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
    </>
  );
}
