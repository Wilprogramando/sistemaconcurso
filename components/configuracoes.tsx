'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Check, ImagePlus, RotateCcw, Settings, ShieldCheck, Trash2, X } from 'lucide-react';
import {
  CHAVE_CONFIG,
  CONFIG_PADRAO,
  CORES,
  aplicarConfig,
  lerConfig,
  type Config,
} from '@/lib/config-visual';

/* ---------------- armazenamento: um mini "store" sobre o localStorage ---------------- */

const ouvintes = new Set<() => void>();
let atual: Config = CONFIG_PADRAO;
let iniciado = false;

function iniciar() {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;
  atual = lerConfig();
  // outra aba mudou o ajuste: acompanha
  window.addEventListener('storage', (e) => {
    if (e.key !== CHAVE_CONFIG) return;
    atual = lerConfig();
    aplicarConfig(atual);
    ouvintes.forEach((f) => f());
  });
}

function assinar(f: () => void) {
  iniciar();
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}

function gravar(c: Config) {
  atual = c;
  aplicarConfig(c);
  try {
    localStorage.setItem(CHAVE_CONFIG, JSON.stringify(c));
  } catch {
    // sem espaço ou modo privativo: o ajuste vale só até recarregar
  }
  ouvintes.forEach((f) => f());
}

export function useConfig(): Config {
  return useSyncExternalStore(
    assinar,
    () => {
      iniciar();
      return atual;
    },
    () => CONFIG_PADRAO,
  );
}

/* ---------------- marca no topo da barra ---------------- */

/**
 * Logo (a escolhida, ou o escudo) e o título. O título some por CSS quando o
 * ajuste está ligado — o atributo vem no <html> antes da primeira pintura.
 */
export function Marca({ tamanho = 22, aoEscuro = true }: { tamanho?: number; aoEscuro?: boolean }) {
  const { logo } = useConfig();
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt="Logo"
          className="shrink-0 rounded-md object-contain"
          style={{ height: tamanho + 14, width: tamanho + 14 }}
        />
      ) : (
        <ShieldCheck size={tamanho} className={`shrink-0 ${aoEscuro ? 'text-brand-300' : ''}`} />
      )}
      <span className="marca-titulo min-w-0 leading-tight">
        <span className="block font-bold">PM SC 2026</span>
        <span className="block text-xs text-brand-200">Soldado QPPM</span>
      </span>
    </Link>
  );
}

/* ---------------- botão e painel ---------------- */

export function BotaoConfig() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Configurações"
        title="Configurações"
        className="rounded-lg p-2 text-brand-100 transition hover:bg-white/10"
      >
        <Settings size={18} />
      </button>
      {aberto && <PainelConfig fechar={() => setAberto(false)} />}
    </>
  );
}

/** encolhe a imagem escolhida para um quadrado de até 128 px, em WebP */
async function reduzirLogo(arquivo: File): Promise<string | null> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error('imagem inválida'));
      i.src = url;
    });
    const escala = Math.min(1, 128 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * escala));
    c.height = Math.max(1, Math.round(img.height * escala));
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', 0.9);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function PainelConfig({ fechar }: { fechar: () => void }) {
  const config = useConfig();
  const [erro, setErro] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [fechar]);

  async function escolherLogo(arquivo?: File) {
    if (!arquivo) return;
    setErro(null);
    if (!arquivo.type.startsWith('image/')) {
      setErro('Escolha um arquivo de imagem.');
      return;
    }
    const logo = await reduzirLogo(arquivo);
    if (!logo) setErro('Não consegui ler essa imagem.');
    else gravar({ ...config, logo });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-slate-900/60 p-3 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) fechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configurações"
        style={{ maxHeight: 'calc(100dvh - 1.5rem)' }}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
            <Settings size={16} />
          </span>
          <h2 className="flex-1 font-semibold">Configurações</h2>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto px-4 py-4 text-sm">
          <section>
            <h3 className="mb-2 font-semibold">Cor do layout</h3>
            <ul className="flex flex-wrap gap-2.5">
              {CORES.map((c) => {
                const ativa = config.cor === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => gravar({ ...config, cor: c.id })}
                      title={c.nome}
                      aria-label={c.nome}
                      aria-pressed={ativa}
                      className={`grid h-10 w-10 place-items-center rounded-full text-white ring-2 ring-offset-2 ring-offset-white transition hover:scale-105 dark:ring-offset-slate-900 ${
                        ativa ? 'ring-slate-900 dark:ring-white' : 'ring-transparent'
                      }`}
                      style={{ background: c.amostra }}
                    >
                      {ativa && <Check size={18} strokeWidth={3} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-semibold">Logo no topo, à esquerda</h3>
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-900 text-brand-300 dark:bg-slate-950">
                {config.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={config.logo} alt="Logo atual" className="h-full w-full object-contain" />
                ) : (
                  <ShieldCheck size={26} />
                )}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
                >
                  <ImagePlus size={14} /> {config.logo ? 'Trocar imagem' : 'Escolher imagem'}
                </button>
                {config.logo && (
                  <button
                    type="button"
                    onClick={() => gravar({ ...config, logo: null })}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:text-slate-300 dark:ring-slate-600 dark:hover:bg-slate-800"
                  >
                    <Trash2 size={14} /> Tirar
                  </button>
                )}
              </div>
              <input
                ref={input}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void escolherLogo(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
            {erro && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{erro}</p>}
          </section>

          <section>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={config.esconderTitulo}
                onChange={(e) => gravar({ ...config, esconderTitulo: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-brand-600"
              />
              <span>
                <span className="block font-semibold">
                  Esconder “PM SC 2026 · Soldado QPPM”
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Deixa só a logo (ou o escudo) no topo da barra lateral.
                </span>
              </span>
            </label>
          </section>
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
          <p className="mr-auto text-xs text-slate-500 dark:text-slate-400">
            Os ajustes ficam salvos neste aparelho.
          </p>
          <button
            type="button"
            onClick={() => gravar(CONFIG_PADRAO)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw size={13} /> Restaurar
          </button>
          <button
            type="button"
            onClick={fechar}
            className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
          >
            Pronto
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
