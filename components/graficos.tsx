'use client';

import { useEffect, useId, useRef, useState } from 'react';

/* =====================================================================
   Medidor — uma razão contra um limite (acerto da disciplina × meta).
   Uma única matiz (sequencial), com a meta marcada na trilha e o valor
   em rótulo direto. Nada de semáforo colorido barra a barra.
   ===================================================================== */
export function Medidor({
  valor,
  meta = 70,
  label,
  sublabel,
  destaque = false,
}: {
  valor: number | null;
  meta?: number;
  label: React.ReactNode;
  sublabel?: string;
  destaque?: boolean;
}) {
  const v = valor === null ? 0 : Math.max(0, Math.min(100, valor));

  return (
    <div className="viz">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>
        <span
          className={`shrink-0 font-semibold tabular-nums ${
            destaque ? 'text-lg' : 'text-sm'
          } ${valor === null ? 'text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}
        >
          {valor === null ? 'sem dados' : `${Math.round(valor)}%`}
        </span>
      </div>

      <div className="relative mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${v}%`, background: 'var(--viz-seq-450)' }}
          role="progressbar"
          aria-valuenow={Math.round(v)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={typeof label === 'string' ? label : undefined}
        />
        {/* marca da meta */}
        <span
          className="absolute top-0 h-full w-0.5"
          style={{ left: `${meta}%`, background: 'var(--viz-meta)', opacity: 0.65 }}
          aria-hidden
        />
      </div>

      {sublabel && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sublabel}</p>
      )}
    </div>
  );
}

/* =====================================================================
   Barras diárias — parte-do-todo por dia (acertos dentro do total).
   Colunas em grade (cabem na tela sem rolar), eixo com linhas de guia,
   dois segmentos separados por 2px e tooltip que nunca sai do gráfico.
   ===================================================================== */
export type Dia = { dia: string; total: number; acertos: number };

/** passo "redondo" para o eixo: 1, 2, 5, 10, 20, 50… */
function tetoDoEixo(max: number) {
  if (max <= 4) return 4;
  const base = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * base >= max) return m * base;
  return max;
}

export function BarrasDiarias({ dias, altura = 160 }: { dias: Dia[]; altura?: number }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const teto = tetoDoEixo(Math.max(1, ...dias.map((d) => d.total)));
  const guias = [teto, teto / 2, 0];

  const total = dias.reduce((a, d) => a + d.total, 0);
  const acertos = dias.reduce((a, d) => a + d.acertos, 0);
  const hoje = dias[dias.length - 1]?.dia;

  const data = (iso: string) => new Date(iso + 'T12:00:00');
  const curto = (iso: string) =>
    data(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const semana = (iso: string) =>
    data(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

  return (
    <div className="viz">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Legenda
          itens={[
            ['var(--viz-s1)', 'acertos'],
            ['var(--viz-s2)', 'erros'],
          ]}
        />
        <p className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
          {total} questões no período
          {total > 0 && (
            <>
              {' · '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {Math.round((100 * acertos) / total)}% de acerto
              </span>
            </>
          )}
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        {/* eixo vertical */}
        <div
          className="relative w-7 shrink-0 text-right text-[0.65rem] text-slate-400 tabular-nums"
          style={{ height: altura }}
          aria-hidden
        >
          {guias.map((g) => (
            <span
              key={g}
              className="absolute right-0 -translate-y-1/2 leading-none"
              style={{ top: `${(1 - g / teto) * 100}%` }}
            >
              {Number.isInteger(g) ? g : g.toFixed(1)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* área das barras */}
          <div className="relative" style={{ height: altura }}>
            {guias.map((g) => (
              <span
                key={g}
                aria-hidden
                className="absolute inset-x-0 h-px"
                style={{
                  top: `${(1 - g / teto) * 100}%`,
                  background: 'var(--viz-grid)',
                }}
              />
            ))}

            <ul
              className="absolute inset-0 grid items-end gap-1 sm:gap-1.5"
              style={{ gridTemplateColumns: `repeat(${dias.length}, minmax(0, 1fr))` }}
              onMouseLeave={() => setAtivo(null)}
            >
              {dias.map((d, i) => {
                const erros = d.total - d.acertos;
                const pctTotal = (d.total / teto) * 100;
                const pctAcertos = d.total ? (d.acertos / d.total) * pctTotal : 0;
                const pctErros = pctTotal - pctAcertos;
                // as colunas das pontas alinham o tooltip para dentro
                const lado =
                  i < 2 ? 'left-0' : i > dias.length - 3 ? 'right-0' : 'left-1/2 -translate-x-1/2';

                return (
                  <li
                    key={d.dia}
                    className="relative flex h-full items-end"
                    onMouseEnter={() => setAtivo(i)}
                  >
                    {ativo === i && (
                      <div
                        className={`pointer-events-none absolute z-20 w-max rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs leading-5 text-white shadow-lg dark:bg-slate-700 ${lado}`}
                        style={{ bottom: `calc(${pctTotal}% + 8px)` }}
                      >
                        <p className="font-semibold capitalize">
                          {semana(d.dia)}, {curto(d.dia)}
                        </p>
                        {d.total > 0 ? (
                          <>
                            <p className="tabular-nums">
                              {d.acertos} acertos · {erros} erros
                            </p>
                            <p className="text-slate-300 tabular-nums">
                              {Math.round((100 * d.acertos) / d.total)}% de {d.total}
                            </p>
                          </>
                        ) : (
                          <p className="text-slate-300">sem questões</p>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      aria-label={`${curto(d.dia)}: ${d.total} questões, ${d.acertos} acertos`}
                      onFocus={() => setAtivo(i)}
                      onBlur={() => setAtivo(null)}
                      className={`flex h-full w-full flex-col justify-end rounded-t-md outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-brand-500 ${
                        ativo !== null && ativo !== i ? 'opacity-50' : ''
                      }`}
                    >
                      {d.total === 0 ? (
                        <span
                          className="block w-full rounded-full"
                          style={{ height: 3, background: 'var(--viz-grid)' }}
                        />
                      ) : (
                        <>
                          {pctErros > 0 && (
                            <span
                              className="block w-full rounded-t-md"
                              style={{ height: `${pctErros}%`, background: 'var(--viz-s2)' }}
                            />
                          )}
                          {pctAcertos > 0 && (
                            <span
                              className="block w-full"
                              style={{
                                height: `${pctAcertos}%`,
                                background: 'var(--viz-s1)',
                                // 2px de superfície separando os dois segmentos
                                marginTop: pctErros > 0 ? 2 : 0,
                                borderRadius: pctErros > 0 ? 0 : '6px 6px 0 0',
                              }}
                            />
                          )}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* rótulos: dia da semana + data; no celular, só de dois em dois */}
          <ul
            className="mt-1.5 grid gap-1 sm:gap-1.5"
            style={{ gridTemplateColumns: `repeat(${dias.length}, minmax(0, 1fr))` }}
            aria-hidden
          >
            {dias.map((d, i) => (
              <li
                key={d.dia}
                className={`text-center text-[0.6rem] leading-tight tabular-nums sm:text-[0.65rem] ${
                  d.dia === hoje
                    ? 'font-bold text-slate-900 dark:text-slate-100'
                    : 'text-slate-400'
                } ${(dias.length - 1 - i) % 2 === 1 ? 'max-sm:invisible' : ''}`}
              >
                <span className="hidden capitalize sm:block">{semana(d.dia)}</span>
                {curto(d.dia).slice(0, 2)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   Linha de evolução — tendência do acerto ao longo das sessões.
   O SVG acompanha a largura real da caixa (sem esticar texto nem bolinhas),
   com área suave embaixo, meta tracejada, crosshair e tooltip que segue o
   ponteiro mais próximo.
   ===================================================================== */
export type Ponto = { rotulo: string; valor: number; detalhe?: string };

export function LinhaEvolucao({ pontos, meta = 70 }: { pontos: Ponto[]; meta?: number }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const [largura, setLargura] = useState(560);
  const caixa = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, '');

  // mede a caixa: o desenho nasce no tamanho certo em vez de ser esticado
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setLargura(Math.max(260, Math.round(el.clientWidth)));
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const H = 220;
  const L = 34;
  const R = 14;
  const T = 14;
  const B = 28;
  const W = largura;
  const larguraPlot = W - L - R;
  const alturaPlot = H - T - B;
  const n = pontos.length;

  const x = (i: number) => L + (n === 1 ? larguraPlot / 2 : (i / (n - 1)) * larguraPlot);
  const y = (v: number) => T + alturaPlot - (Math.max(0, Math.min(100, v)) / 100) * alturaPlot;

  const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.valor)}`).join(' ');
  const area = `${linha} L ${x(n - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;

  // até ~6 rótulos no eixo x, sempre incluindo o primeiro e o último
  const passo = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(larguraPlot / 70))));
  const mostrar = (i: number) => i === 0 || i === n - 1 || (i % passo === 0 && n - 1 - i >= passo);

  const ultimo = pontos[n - 1];
  const media = Math.round(pontos.reduce((a, p) => a + p.valor, 0) / n);

  function aoMover(e: React.PointerEvent<SVGSVGElement>) {
    const caixaSvg = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - caixaSvg.left;
    let melhor = 0;
    for (let i = 1; i < n; i++) if (Math.abs(x(i) - px) < Math.abs(x(melhor) - px)) melhor = i;
    setAtivo(melhor);
  }

  const dica = ativo !== null ? pontos[ativo] : null;
  const dicaX = ativo !== null ? x(ativo) : 0;

  return (
    <div className="viz">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Legenda
          itens={[
            ['var(--viz-s1)', 'acerto por sessão'],
            ['var(--viz-meta)', `meta ${meta}%`],
          ]}
        />
        <p className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
          última sessão{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{ultimo.valor}%</span>
          {' · '}média {media}%
        </p>
      </div>

      <div ref={caixa} className="relative w-full">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="block touch-pan-y select-none"
          role="img"
          aria-label={`Evolução do percentual de acerto por sessão. Última sessão: ${ultimo.valor}%`}
          onPointerMove={aoMover}
          onPointerDown={aoMover}
          onPointerLeave={() => setAtivo(null)}
        >
          <defs>
            <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--viz-s1)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--viz-s1)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((g) => (
            <g key={g}>
              <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="var(--viz-grid)" strokeWidth={1} />
              <text x={L - 8} y={y(g) + 3.5} textAnchor="end" fontSize={10} fill="var(--viz-eixo)">
                {g}%
              </text>
            </g>
          ))}

          <line
            x1={L}
            x2={W - R}
            y1={y(meta)}
            y2={y(meta)}
            stroke="var(--viz-meta)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />

          {n > 1 && <path d={area} fill={`url(#${id}-area)`} />}
          <path
            d={linha}
            fill="none"
            stroke="var(--viz-s1)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {ativo !== null && (
            <line
              x1={dicaX}
              x2={dicaX}
              y1={T}
              y2={T + alturaPlot}
              stroke="var(--viz-meta)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {pontos.map((p, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(p.valor)}
              r={ativo === i ? 6 : i === n - 1 ? 5 : 3.5}
              fill="var(--viz-s1)"
              stroke="var(--viz-surface)"
              strokeWidth={2}
            />
          ))}

          {pontos.map((p, i) =>
            mostrar(i) ? (
              <text
                key={i}
                x={x(i)}
                y={H - 8}
                textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                fontSize={10}
                fill="var(--viz-eixo)"
              >
                {p.rotulo}
              </text>
            ) : null,
          )}
        </svg>

        {dica && (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-[12rem] rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs leading-5 text-white shadow-lg dark:bg-slate-700"
            style={{
              left: Math.min(Math.max(dicaX, 70), W - 70),
              top: Math.max(0, y(dica.valor) - 58),
              transform: 'translateX(-50%)',
            }}
          >
            <p className="font-semibold tabular-nums">{dica.valor}% de acerto</p>
            <p className="text-slate-300 capitalize">{dica.detalhe ?? dica.rotulo}</p>
            <p className="text-slate-400 tabular-nums">{dica.rotulo}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================================
   Composição da prova — parte-do-todo horizontal, uma matiz.
   Mostra quanto cada disciplina pesa nas 60 questões.
   ===================================================================== */
export function PesoDaProva({
  itens,
}: {
  itens: { nome: string; questoes: number; acerto: number | null; slug: string }[];
}) {
  const [ativo, setAtivo] = useState<string | null>(null);
  const total = itens.reduce((a, i) => a + i.questoes, 0) || 1;

  // Uma matiz só, do mais pesado ao mais leve: a cor diz tamanho, não
  // identidade. Nove matizes diferentes viraria arco-íris e ninguém liga
  // cor a disciplina numa faixa dessas — quem identifica é a legenda.
  const degrau = (questoes: number) => {
    if (questoes >= 9) return 'var(--viz-seq-600)';
    if (questoes >= 7) return 'var(--viz-seq-450)';
    if (questoes >= 6) return 'var(--viz-seq-250)';
    return 'var(--viz-seq-100)';
  };

  const ordenados = [...itens].sort((a, b) => b.questoes - a.questoes);
  const destaque = ordenados.find((i) => i.slug === ativo) ?? null;
  const pct = (q: number) => Math.round((100 * q) / total);

  return (
    <div className="viz">
      {/* faixa: cada pedaço é uma disciplina, proporcional às questões */}
      <div className="flex h-8 w-full gap-[2px] overflow-hidden rounded-lg">
        {ordenados.map((i) => (
          <button
            key={i.slug}
            type="button"
            title={`${i.nome}: ${i.questoes} de ${total} questões`}
            aria-label={`${i.nome}, ${i.questoes} questões, ${pct(i.questoes)}% da prova`}
            onMouseEnter={() => setAtivo(i.slug)}
            onMouseLeave={() => setAtivo(null)}
            onFocus={() => setAtivo(i.slug)}
            onBlur={() => setAtivo(null)}
            className="h-full min-h-0 transition-opacity first:rounded-l-lg last:rounded-r-lg"
            style={{
              width: `${(i.questoes / total) * 100}%`,
              background: degrau(i.questoes),
              opacity: ativo && ativo !== i.slug ? 0.35 : 1,
            }}
          />
        ))}
      </div>

      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {destaque
          ? `${destaque.nome}: ${destaque.questoes} questões — ${pct(destaque.questoes)}% da prova objetiva`
          : `${total} questões objetivas, 1 ponto cada, divididas entre ${itens.length} disciplinas. Quanto maior o pedaço, mais ponto está em jogo ali.`}
      </p>

      {/* legenda: é ela que diz qual disciplina é qual */}
      <ul className="mt-3 grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
        {ordenados.map((i) => (
          <li
            key={i.slug}
            onMouseEnter={() => setAtivo(i.slug)}
            onMouseLeave={() => setAtivo(null)}
            className={`flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm transition ${
              ativo === i.slug ? 'bg-slate-100 dark:bg-slate-800' : ''
            }`}
          >
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: degrau(i.questoes) }}
            />
            <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">
              {i.nome}
            </span>
            <span className="shrink-0 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
              {i.questoes} questões
            </span>
            <span className="w-12 shrink-0 text-right text-xs text-slate-500 tabular-nums dark:text-slate-400">
              {pct(i.questoes)}%
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs leading-5 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
        Como ler: a soma dá {total} pontos na objetiva, e a redação vale outros 20. Para passar são
        50% do total — e <strong className="font-semibold">zerar uma disciplina elimina</strong>,
        mesmo com nota alta no resto. Por isso a maior faixa é onde mais se ganha, mas a menor é
        onde mais se perde.
      </p>
    </div>
  );
}

function Legenda({ itens }: { itens: [string, string][] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
      {itens.map(([cor, nome]) => (
        <li key={nome} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cor }} aria-hidden />
          {nome}
        </li>
      ))}
    </ul>
  );
}
