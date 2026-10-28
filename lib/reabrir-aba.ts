import { useEffect } from 'react';

const EVENTO = 'aba-reaberta';

/**
 * Clicar no item do menu da aba em que já se está não navega: o Next mantém a
 * página montada e o estado de dentro dela (matéria aberta, por exemplo)
 * continua. O menu avisa aqui e a página volta para a tela inicial da aba.
 */
export function avisarAbaReaberta(href: string) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: href }));
}

/** `aoReabrir` roda quando o menu é clicado estando em `href` (ou dentro dele) */
export function useAoReabrirAba(href: string, aoReabrir: () => void) {
  useEffect(() => {
    const ouvir = (e: Event) => {
      if ((e as CustomEvent<string>).detail === href) aoReabrir();
    };
    window.addEventListener(EVENTO, ouvir);
    return () => window.removeEventListener(EVENTO, ouvir);
  }, [href, aoReabrir]);
}
