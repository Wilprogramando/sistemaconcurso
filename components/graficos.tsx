'use client';

import { useId, useState } from 'react';

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
   Duas séries categóricas, com legenda, 2px de folga entre os segmentos
   e tooltip no toque/hover.
   ===================================================================== */
export type Dia = { dia: string; total: number; acertos: number };

export function BarrasDiarias({ dias, altura = 132 }: { dias: Dia[]; altura?: number }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const max = Math.max(1, ...dias.map((d) => d.total));

  const rotulo = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <div className="viz">
      <Legenda itens={[['var(--viz-s1)', 'acertos'], ['var(--viz-s2)', 'erros']]} />

      <div className="relative mt-3 overflow-x-auto pb-1">
        <ul className="flex min-w-full items-end gap-1.5" style={{ height: altura + 34 }}>
          {dias.map((d, i) => {
            const h = Math.round((d.total / max) * altura);
            const hAcertos = d.total ? Math.round((d.acertos / d.total) * h) : 0;
            const hErros = Math.max(0, h - hAcertos);
            const erros = d.total - d.acertos;

            return (
              <li
                key={d.dia}
                className="relative flex flex-1 flex-col items-center justify-end gap-1"
                style={{ minWidth: 26 }}
                onMouseEnter={() => setAtivo(i)}
                onMouseLeave={() => setAtivo(null)}
                onFocus={() => setAtivo(i)}
                onBlur={() => setAtivo(null)}
              >
                {ativo === i && d.total > 0 && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 w-max max-w-[11rem] rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs leading-5 text-white shadow-lg dark:bg-slate-700">
                    <p className="font-semibold">{rotulo(d.dia)}</p>
                    <p className="tabular-nums">
                      {d.acertos} acertos · {erros} erros
                    </p>
                    <p className="tabular-nums text-slate-300">
                      {Math.round((100 * d.acertos) / d.total)}% de acerto
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  aria-label={`${rotulo(d.dia)}: ${d.total} questões, ${d.acertos} acertos`}
                  className="flex w-full flex-col justify-end rounded-t-[4px] outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  style={{ height: altura }}
                >
                  {hErros > 0 && (
                    <span
                      className="block w-full rounded-t-[4px]"
                      style={{ height: hErros, background: 'var(--viz-s2)' }}
                    />
                  )}
                  {hAcertos > 0 && (
                    <span
                      className="block w-full"
                      style={{
                        height: hAcertos,
                        background: 'var(--viz-s1)',
                        // 2px de superfície separando os dois segmentos
                        marginTop: hErros > 0 ? 2 : 0,
                        borderRadius: hErros > 0 ? 0 : '4px 4px 0 0',
                      }}
                    />
                  )}
                  {h === 0 && (
                    <span
                      className="block w-full rounded-t-[4px]"
                      style={{ height: 3, background: 'var(--viz-grid)' }}
                    />
                  )}
                </button>

                <span className="text-[0.62rem] text-slate-400 tabular-nums">{rotulo(d.dia)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* =====================================================================
   Linha de evolução — tendência do acerto ao longo das sessões.
   Série única, 2px, marcadores de 8px, crosshair no hover.
   ===================================================================== */
export type Ponto = { rotulo: string; valor: number; detalhe?: string };

export function LinhaEvolucao({ pontos, meta = 70 }: { pontos: Ponto[]; meta?: number }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const id = useId();

  const L = 34;
  const R = 8;
  const T = 10;
  const B = 24;
  const W = 520;
  const H = 180;
  const larguraPlot = W - L - R;
  const alturaPlot = H - T - B;

  const x = (i: number) =>
    L + (pontos.length === 1 ? larguraPlot / 2 : (i / (pontos.length - 1)) * larguraPlot);
  const y = (v: number) => T + alturaPlot - (Math.max(0, Math.min(100, v)) / 100) * alturaPlot;

  const caminho = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.valor)}`).join(' ');

  return (
    <div className="viz relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 200 }}
        role="img"
        aria-label="Evolução do percentual de acerto por sessão"
        onMouseLeave={() => setAtivo(null)}
      >
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line
              x1={L}
              x2={W - R}
              y1={y(g)}
              y2={y(g)}
              stroke="var(--viz-grid)"
              strokeWidth={1}
            />
            <text x={L - 6} y={y(g) + 3.5} textAnchor="end" fontSize={9} fill="var(--viz-eixo)">
              {g}
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
          strokeDasharray="4 4"
        />
        <text x={W - R} y={y(meta) - 4} textAnchor="end" fontSize={9} fill="var(--viz-meta)">
          meta {meta}%
        </text>

        <path d={caminho} fill="none" stroke="var(--viz-s1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {pontos.map((p, i) => (
          <g key={`${id}-${i}`}>
            <circle
              cx={x(i)}
              cy={y(p.valor)}
              r={ativo === i ? 6 : 4}
              fill="var(--viz-s1)"
              stroke="var(--viz-surface)"
              strokeWidth={2}
            />
            <rect
              x={x(i) - larguraPlot / Math.max(1, pontos.length) / 2}
              y={T}
              width={Math.max(18, larguraPlot / Math.max(1, pontos.length))}
              height={alturaPlot}
              fill="transparent"
              onMouseEnter={() => setAtivo(i)}
            />
          </g>
        ))}

        {pontos.length > 1 && (
          <>
            <text x={L} y={H - 7} fontSize={9} fill="var(--viz-eixo)">
              {pontos[0].rotulo}
            </text>
            <text x={W - R} y={H - 7} textAnchor="end" fontSize={9} fill="var(--viz-eixo)">
              {pontos[pontos.length - 1].rotulo}
            </text>
          </>
        )}
      </svg>

      {ativo !== null && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-slate-700"
          style={{ left: `${(x(ativo) / W) * 100}%`, transform: 'translateX(-50%)' }}
        >
          <p className="font-semibold tabular-nums">{pontos[ativo].valor}% de acerto</p>
          <p className="text-slate-300">{pontos[ativo].detalhe ?? pontos[ativo].rotulo}</p>
        </div>
      )}
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
