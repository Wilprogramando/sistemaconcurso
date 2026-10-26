'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Número que sobe do zero até o valor, uma vez, na carga da tela.
 *
 * Existe porque num placar o número é o conteúdo principal: vê-lo chegar
 * conta o quanto foi conquistado, e é o único movimento gratuito que estas
 * telas têm. Quem pediu menos animação no sistema recebe o valor final de
 * saída, sem nenhum quadro intermediário.
 *
 * O percurso é por `requestAnimationFrame`, com `easeOutCubic`: começa
 * rápido e encosta devagar no alvo, senão a chegada parece um corte.
 */
export default function Contador({
  para,
  duracao = 900,
  sufixo = '',
  decimais = 0,
}: {
  para: number;
  duracao?: number;
  sufixo?: string;
  decimais?: number;
}) {
  const [valor, setValor] = useState(0);
  const quadro = useRef(0);

  useEffect(() => {
    const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (parado || para === 0) {
      setValor(para);
      return;
    }

    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      const suave = 1 - (1 - t) ** 3;
      setValor(para * suave);
      if (t < 1) quadro.current = requestAnimationFrame(passo);
    };
    quadro.current = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro.current);
  }, [para, duracao]);

  // o alvo exato fecha a conta: o easing para em 0,999… e arredondar sozinho
  // deixaria "69%" onde o valor é 70%
  const mostrar = valor >= para ? para : valor;

  return (
    <span className="tabular-nums">
      {mostrar.toLocaleString('pt-BR', {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais,
      })}
      {sufixo}
    </span>
  );
}
