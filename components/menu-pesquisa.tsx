'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Scissors, Search } from 'lucide-react';

type Aberto = { x: number; y: number; texto: string; editavel: boolean };

const MIN = 2;
const MAX = 120;

/**
 * Menu do botão direito: selecionou uma palavra ou frase em qualquer tela,
 * clicou com o direito e escolheu "Pesquisar questões" — cai na busca por
 * palavra-chave do banco de questões.
 *
 * Sem texto selecionado o menu do navegador continua o de sempre. Com texto,
 * este menu assume e traz também Copiar (e Recortar, nos campos de escrita);
 * colar segue no Ctrl+V.
 */
export default function MenuPesquisa() {
  const router = useRouter();
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  const fechar = useCallback(() => setAberto(null), []);

  useEffect(() => {
    const aoAbrir = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement | null;
      const campo = alvo?.closest<HTMLInputElement | HTMLTextAreaElement>('input, textarea');

      let texto = '';
      if (campo && typeof campo.selectionStart === 'number') {
        texto = campo.value.slice(campo.selectionStart, campo.selectionEnd ?? campo.selectionStart);
      } else {
        texto = window.getSelection()?.toString() ?? '';
      }
      texto = texto.replace(/\s+/g, ' ').trim();
      if (texto.length < MIN) return; // sem seleção: menu normal do navegador

      e.preventDefault();
      setAberto({
        x: e.clientX,
        y: e.clientY,
        texto: texto.slice(0, MAX),
        editavel: !!campo || !!alvo?.closest('[contenteditable="true"]'),
      });
    };

    const aoFechar = (e: Event) => {
      if (e.type === 'mousedown' && caixa.current?.contains(e.target as Node)) return;
      setAberto(null);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(null);
    };

    document.addEventListener('contextmenu', aoAbrir);
    document.addEventListener('mousedown', aoFechar);
    document.addEventListener('keydown', aoTeclar);
    window.addEventListener('scroll', aoFechar, true);
    window.addEventListener('resize', aoFechar);
    return () => {
      document.removeEventListener('contextmenu', aoAbrir);
      document.removeEventListener('mousedown', aoFechar);
      document.removeEventListener('keydown', aoTeclar);
      window.removeEventListener('scroll', aoFechar, true);
      window.removeEventListener('resize', aoFechar);
    };
  }, []);

  if (!aberto) return null;

  // não deixa o menu escapar pela borda da tela
  const largura = 288;
  const altura = aberto.editavel ? 128 : 96;
  const x = Math.max(8, Math.min(aberto.x, window.innerWidth - largura - 8));
  const y = Math.max(8, Math.min(aberto.y, window.innerHeight - altura - 8));

  const pesquisar = () => {
    router.push(`/questoes?q=${encodeURIComponent(aberto.texto)}`);
    fechar();
  };
  const copiar = () => {
    void navigator.clipboard?.writeText(aberto.texto);
    fechar();
  };
  const recortar = () => {
    document.execCommand('cut');
    fechar();
  };

  return (
    <div
      ref={caixa}
      role="menu"
      // o clique no menu não pode desfazer a seleção de quem está lendo
      onMouseDown={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-[100] w-72 overflow-hidden rounded-xl bg-white py-1 text-sm shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600"
      style={{ left: x, top: y }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={pesquisar}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left font-medium text-slate-900 transition hover:bg-brand-50 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        <Search size={15} className="shrink-0 text-brand-600 dark:text-brand-300" />
        <span className="min-w-0 truncate">
          Pesquisar questões: “{aberto.texto}”
        </span>
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={copiar}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <Copy size={15} className="shrink-0 text-slate-400" /> Copiar
      </button>
      {aberto.editavel && (
        <button
          type="button"
          role="menuitem"
          onClick={recortar}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Scissors size={15} className="shrink-0 text-slate-400" /> Recortar
        </button>
      )}
    </div>
  );
}
