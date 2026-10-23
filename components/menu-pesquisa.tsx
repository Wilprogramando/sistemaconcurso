'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Eye, EyeOff, Loader2, Scissors, Search, X } from 'lucide-react';
import type { Alternativa } from '@/lib/types';

type Aberto = { x: number; y: number; texto: string; editavel: boolean };

type Previa = {
  id: number;
  kind: 'ce' | 'mc' | 'open';
  options: Alternativa[] | null;
  statement: string;
  answer: string | null;
  explanation: string;
  origin_label: string | null;
  year: number | null;
  banca: string | null;
};

const MIN = 2;
const MAX = 120;

/**
 * Menu do botão direito: selecionou uma palavra ou frase em qualquer tela,
 * clicou com o direito e escolheu "Pesquisar questões" — abre um pop-up com
 * as primeiras questões, sem sair da tela. O botão do pop-up leva à busca
 * completa por palavra-chave.
 *
 * Sem texto selecionado o menu do navegador continua o de sempre. Com texto,
 * este menu assume e traz também Copiar (e Recortar, nos campos de escrita);
 * colar segue no Ctrl+V.
 */
export default function MenuPesquisa() {
  const router = useRouter();
  const [aberto, setAberto] = useState<Aberto | null>(null);
  /** palavra com o pop-up de resultados aberto */
  const [busca, setBusca] = useState<string | null>(null);
  const buscaAberta = useRef(false);
  buscaAberta.current = busca !== null;
  const caixa = useRef<HTMLDivElement>(null);

  const fechar = useCallback(() => setAberto(null), []);
  const fecharBusca = useCallback(() => setBusca(null), []);

  useEffect(() => {
    const aoAbrir = (e: MouseEvent) => {
      if (buscaAberta.current) return; // com o pop-up aberto, vale o menu normal
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

  const popup =
    busca !== null ? (
      <PopupQuestoes
        busca={busca}
        aoFechar={fecharBusca}
        aoProcurarMais={() => {
          router.push(`/questoes?q=${encodeURIComponent(busca)}`);
          setBusca(null);
        }}
      />
    ) : null;

  if (!aberto) return popup;

  // não deixa o menu escapar pela borda da tela
  const largura = 288;
  const altura = aberto.editavel ? 128 : 96;
  const x = Math.max(8, Math.min(aberto.x, window.innerWidth - largura - 8));
  const y = Math.max(8, Math.min(aberto.y, window.innerHeight - altura - 8));

  const pesquisar = () => {
    setBusca(aberto.texto);
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
    <>
      {popup}
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
          <span className="min-w-0 truncate">Pesquisar questões: “{aberto.texto}”</span>
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
    </>
  );
}

/** Realça a palavra buscada dentro do texto, sem diferenciar maiúsculas. */
function Realce({ texto, termo }: { texto: string; termo: string }) {
  const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const partes = texto.split(new RegExp(`(${escapado})`, 'i'));
  return (
    <>
      {partes.map((p, i) =>
        p.toLowerCase() === termo.toLowerCase() ? (
          <mark key={i} className="rounded bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-500/40">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

type Estado =
  | { fase: 'carregando' }
  | { fase: 'erro' }
  | { fase: 'ok'; total: number; questoes: Previa[] };

/**
 * Pop-up com as primeiras questões da palavra. A pessoa continua na tela
 * onde estava; o botão de baixo leva à busca completa.
 */
function PopupQuestoes({
  busca,
  aoFechar,
  aoProcurarMais,
}: {
  busca: string;
  aoFechar: () => void;
  aoProcurarMais: () => void;
}) {
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' });
  const [gabaritos, setGabaritos] = useState<Set<number>>(new Set());

  useEffect(() => {
    const ctl = new AbortController();
    setEstado({ fase: 'carregando' });
    setGabaritos(new Set());
    fetch(`/api/buscar-questoes?q=${encodeURIComponent(busca)}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('falha'))))
      .then((d) => setEstado({ fase: 'ok', total: d.total, questoes: d.questoes }))
      .catch((e) => {
        if (e?.name !== 'AbortError') setEstado({ fase: 'erro' });
      });
    return () => ctl.abort();
  }, [busca]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = antes;
    };
  }, [aoFechar]);

  const alternar = (id: number) =>
    setGabaritos((g) => {
      const n = new Set(g);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-slate-900/60 p-3 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Questões com ${busca}`}
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
      >
        <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
            <Search size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold text-slate-900 dark:text-slate-100">
              Questões com “{busca}”
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {estado.fase === 'carregando' && 'buscando…'}
              {estado.fase === 'erro' && 'não foi possível buscar agora'}
              {estado.fase === 'ok' &&
                (estado.total === 0
                  ? 'nenhuma questão encontrada'
                  : `${estado.total} ${estado.total === 1 ? 'questão' : 'questões'} no banco — mostrando as ${estado.questoes.length} primeiras`)}
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-24 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
          {estado.fase === 'carregando' && (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> buscando questões…
            </p>
          )}
          {estado.fase === 'erro' && (
            <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-300">
              Tente de novo em instantes.
            </p>
          )}
          {estado.fase === 'ok' && estado.questoes.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-300">
              Nenhuma questão com “{busca}”. Tente uma palavra mais curta ou sem acento.
            </p>
          )}
          {estado.fase === 'ok' &&
            estado.questoes.map((q) => {
              const aberta = gabaritos.has(q.id);
              return (
                <article
                  key={q.id}
                  className="rounded-xl p-3 text-sm ring-1 ring-slate-200 dark:ring-slate-700"
                >
                  {(q.origin_label || q.banca) && (
                    <p className="mb-1 text-[0.7rem] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                      {[q.origin_label, q.banca, q.year].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="leading-6 whitespace-pre-line text-slate-800 dark:text-slate-100">
                    <Realce texto={q.statement} termo={busca} />
                  </p>
                  {q.kind === 'mc' && q.options && (
                    <ul className="mt-2 space-y-1">
                      {q.options.map((o) => (
                        <li
                          key={o.letter}
                          className={`flex gap-2 rounded-md px-1.5 py-0.5 leading-6 text-slate-700 dark:text-slate-300 ${
                            aberta && o.letter === q.answer
                              ? 'bg-emerald-50 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : ''
                          }`}
                        >
                          <span className="font-semibold">{o.letter})</span>
                          <span className="min-w-0">{o.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => alternar(q.id)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
                  >
                    {aberta ? <EyeOff size={13} /> : <Eye size={13} />}
                    {aberta ? 'Esconder gabarito' : 'Ver gabarito'}
                  </button>
                  {aberta && (
                    <div className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <p className="font-semibold">
                        Gabarito:{' '}
                        {q.kind === 'ce'
                          ? q.answer === 'C'
                            ? 'Certo'
                            : 'Errado'
                          : (q.answer ?? '—')}
                      </p>
                      {q.explanation && <p className="mt-1 whitespace-pre-line">{q.explanation}</p>}
                    </div>
                  )}
                </article>
              );
            })}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Continuar aqui
          </button>
          <button
            type="button"
            onClick={aoProcurarMais}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Search size={15} /> Procurar mais questões com “{busca}”
          </button>
        </footer>
      </div>
    </div>
  );
}
