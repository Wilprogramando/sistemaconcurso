/**
 * Ajustes visuais guardados no próprio aparelho: cor do layout, logo no topo
 * da barra lateral e se o título "PM SC 2026 · Soldado QPPM" aparece.
 *
 * Ficam no localStorage — valem para este navegador, sem passar pelo banco.
 * A cor entra pelas variáveis `--color-brand-*` do Tailwind, então todo o
 * sistema muda junto, sem tocar em componente nenhum.
 */

export const CHAVE_CONFIG = 'pmsc-config';

export type CorId = 'azul' | 'verde' | 'roxo' | 'vermelho' | 'laranja' | 'rosa' | 'grafite';

export type Config = {
  cor: CorId;
  /** imagem pequena (data URL) mostrada no topo da barra lateral */
  logo: string | null;
  esconderTitulo: boolean;
};

export const CONFIG_PADRAO: Config = { cor: 'azul', logo: null, esconderTitulo: false };

/** matiz e saturação de cada cor; o azul é o do tema original e não se mexe */
export const CORES: { id: CorId; nome: string; h: number; s: number; amostra: string }[] = [
  { id: 'azul', nome: 'Azul', h: 221, s: 76, amostra: '#2f6fe4' },
  { id: 'verde', nome: 'Verde', h: 152, s: 62, amostra: '#1f9d63' },
  { id: 'roxo', nome: 'Roxo', h: 266, s: 62, amostra: '#7c4fd8' },
  { id: 'vermelho', nome: 'Vermelho', h: 354, s: 68, amostra: '#d63a50' },
  { id: 'laranja', nome: 'Laranja', h: 24, s: 88, amostra: '#ec7424' },
  { id: 'rosa', nome: 'Rosa', h: 330, s: 66, amostra: '#d9479b' },
  { id: 'grafite', nome: 'Grafite', h: 215, s: 14, amostra: '#5f6b7c' },
];

/** claridade de cada degrau da escala, do mais claro ao mais escuro */
const DEGRAUS: [string, number][] = [
  ['50', 97],
  ['100', 93],
  ['200', 86],
  ['300', 76],
  ['400', 65],
  ['500', 54],
  ['600', 45],
  ['700', 37],
  ['800', 30],
  ['900', 22],
  ['950', 14],
];

/** escala `brand` inteira a partir de um matiz */
export function paleta(h: number, s: number): Record<string, string> {
  return Object.fromEntries(
    DEGRAUS.map(([degrau, l]) => [degrau, `hsl(${h} ${s}% ${l}%)`]),
  );
}

export function lerConfig(): Config {
  try {
    const bruto = localStorage.getItem(CHAVE_CONFIG);
    if (!bruto) return CONFIG_PADRAO;
    const c = JSON.parse(bruto) as Partial<Config>;
    return {
      cor: CORES.some((x) => x.id === c.cor) ? (c.cor as CorId) : 'azul',
      logo: typeof c.logo === 'string' && c.logo.startsWith('data:image/') ? c.logo : null,
      esconderTitulo: !!c.esconderTitulo,
    };
  } catch {
    return CONFIG_PADRAO;
  }
}

/** pinta o sistema com a cor e liga/desliga o título; roda no navegador */
export function aplicarConfig(c: Config) {
  const raiz = document.documentElement;
  const cor = CORES.find((x) => x.id === c.cor);
  for (const [degrau] of DEGRAUS) {
    if (!cor || cor.id === 'azul') raiz.style.removeProperty(`--color-brand-${degrau}`);
    else raiz.style.setProperty(`--color-brand-${degrau}`, paleta(cor.h, cor.s)[degrau]);
  }
  if (c.esconderTitulo) raiz.setAttribute('data-sem-titulo', '');
  else raiz.removeAttribute('data-sem-titulo');
}

/** Script inline: aplica cor e título antes da primeira pintura, sem piscar. */
export const scriptConfig = `
(function () {
  try {
    var c = JSON.parse(localStorage.getItem('${CHAVE_CONFIG}') || 'null');
    if (!c) return;
    var P = ${JSON.stringify(
      Object.fromEntries(
        CORES.filter((x) => x.id !== 'azul').map((x) => [x.id, paleta(x.h, x.s)]),
      ),
    )};
    var r = document.documentElement;
    if (P[c.cor]) for (var k in P[c.cor]) r.style.setProperty('--color-brand-' + k, P[c.cor][k]);
    if (c.esconderTitulo) r.setAttribute('data-sem-titulo', '');
  } catch (e) {}
})();
`;
