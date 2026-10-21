'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

const CHAVE = 'pmsc-tema';

/** Script inline: aplica o tema antes da primeira pintura, sem piscar. */
export const scriptTema = `
(function () {
  try {
    var t = localStorage.getItem('${CHAVE}');
    if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function BotaoTema() {
  const [escuro, setEscuro] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains('dark'));
    setMontado(true);
  }, []);

  function alternar() {
    const novo = !escuro;
    setEscuro(novo);
    document.documentElement.classList.toggle('dark', novo);
    try {
      localStorage.setItem(CHAVE, novo ? 'dark' : 'light');
    } catch {
      // modo privativo: o tema vale so para esta sessao
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={escuro ? 'Tema claro' : 'Tema escuro'}
      className="rounded-lg p-2 text-brand-100 transition hover:bg-white/10"
    >
      {montado && escuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
