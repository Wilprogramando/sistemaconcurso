'use client';

import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';

type Uso =
  | { indisponivel: true }
  | { banco: number; arquivos: number; limiteBanco: number; limiteArquivos: number };

function formatar(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2).replace('.', ',')} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Barra no canto superior direito com o espaço usado no banco de dados,
 * contra o teto do plano. Os arquivos (imagens e PDFs das anotações) ficam
 * no bucket e entram na dica ao passar o mouse.
 */
export default function BarraEspaco() {
  const [uso, setUso] = useState<Uso | null>(null);

  useEffect(() => {
    let vivo = true;
    const buscar = () =>
      fetch('/api/espaco')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => vivo && d && setUso(d))
        .catch(() => {});
    void buscar();
    const timer = setInterval(buscar, 5 * 60 * 1000);
    return () => {
      vivo = false;
      clearInterval(timer);
    };
  }, []);

  if (!uso) return null;

  // medidor desligado (migração 0010 não rodou): não mostra nada
  if ('indisponivel' in uso) return null;

  const pct = Math.min(100, (uso.banco / uso.limiteBanco) * 100);
  const cor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-500';
  const pctArquivos = Math.min(100, Math.round((uso.arquivos / uso.limiteArquivos) * 100));

  return (
    <div
      className="flex h-7 items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
      title={`Banco de dados: ${formatar(uso.banco)} de ${formatar(uso.limiteBanco)} (${pct.toFixed(1).replace('.', ',')}%)\nArquivos (imagens e PDFs): ${formatar(uso.arquivos)} de ${formatar(uso.limiteArquivos)} (${pctArquivos}%)`}
    >
      <Database size={14} className="shrink-0 text-slate-400" />
      <span
        role="progressbar"
        aria-label="Espaço usado no banco de dados"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2 w-24 overflow-hidden rounded-full bg-slate-200 sm:w-32 dark:bg-slate-700"
      >
        <span
          className={`block h-full rounded-full transition-[width] duration-500 ${cor}`}
          style={{ width: `${Math.max(pct, 1.5)}%` }}
        />
      </span>
      <span className="tabular-nums">
        <strong className="font-semibold text-slate-800 dark:text-slate-100">
          {formatar(uso.banco)}
        </strong>{' '}
        / {formatar(uso.limiteBanco)}
      </span>
    </div>
  );
}
