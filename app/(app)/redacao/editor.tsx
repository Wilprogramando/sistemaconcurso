'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Dice5,
  Info,
  Lightbulb,
  RotateCcw,
  Save,
  XCircle,
} from 'lucide-react';
import { useSessao } from '@/components/sessao';
import { Card } from '@/components/ui';
import { Medidor } from '@/components/graficos';
import { analisar, type Analise, type Apontamento } from '@/lib/redacao/analise';
import { sortearTema, type Tema } from '@/lib/redacao/temas';

const ESTILO: Record<
  Apontamento['tipo'],
  { icone: typeof Info; caixa: string; titulo: string; rotulo: string }
> = {
  erro: {
    icone: XCircle,
    caixa: 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40',
    titulo: 'text-red-900 dark:text-red-200',
    rotulo: 'Corrigir',
  },
  alerta: {
    icone: AlertTriangle,
    caixa: 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
    titulo: 'text-amber-900 dark:text-amber-200',
    rotulo: 'Conferir',
  },
  sugestao: {
    icone: Lightbulb,
    caixa: 'border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40',
    titulo: 'text-sky-900 dark:text-sky-200',
    rotulo: 'Melhorar',
  },
  elogio: {
    icone: CheckCircle2,
    caixa: 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40',
    titulo: 'text-emerald-900 dark:text-emerald-200',
    rotulo: 'Ponto forte',
  },
};

export default function Editor({ temaInicial }: { temaInicial: Tema }) {
  const { userId, supabase } = useSessao();

  const [tema, setTema] = useState<Tema>(temaInicial);
  const [texto, setTexto] = useState('');
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [rodando, setRodando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const inicio = useRef<number | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(() => {
      if (inicio.current) setSegundos(Math.floor((Date.now() - inicio.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [rodando]);

  const palavras = useMemo(() => (texto.match(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]*/g) ?? []).length, [texto]);
  const linhas = Math.ceil(palavras / 11);

  function novoTema() {
    setTema(sortearTema(tema.id));
    setTexto('');
    setAnalise(null);
    setSalvo(false);
    setSegundos(0);
    setRodando(false);
    inicio.current = null;
  }

  function comecar() {
    inicio.current = Date.now();
    setRodando(true);
    areaRef.current?.focus();
  }

  function corrigir() {
    setRodando(false);
    setAnalise(analisar(texto));
    setSalvo(false);
    queueMicrotask(() => document.getElementById('correcao')?.scrollIntoView({ behavior: 'smooth' }));
  }

  async function salvar() {
    if (!analise || !tema) return;
    setSalvando(true);
    await supabase.from('essays').insert({
      user_id: userId,
      theme_id: tema.id,
      theme_title: tema.titulo,
      body: texto,
      words: analise.palavras,
      score: analise.nota,
      max_score: analise.maximo,
      minutes: Math.round(segundos / 60),
      breakdown: analise.criterios,
    });
    setSalvando(false);
    setSalvo(true);
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      {/* ---------------- tema ---------------- */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {tema.eixo}
            </span>
            <h2 className="mt-2 text-lg leading-snug font-bold text-slate-900 sm:text-xl dark:text-slate-100">
              {tema.titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={novoTema}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
          >
            <Dice5 size={16} /> Outro tema
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">
            Texto motivador
          </p>
          <p className="mt-1.5 text-sm leading-7 text-slate-700 dark:text-slate-300">
            {tema.motivador}
          </p>
        </div>

        <details className="mt-3 rounded-xl bg-sky-50 p-4 dark:bg-sky-950/40">
          <summary className="cursor-pointer text-sm font-semibold text-sky-900 dark:text-sky-200">
            Repertório que você pode usar
          </summary>
          <ul className="mt-2 space-y-1.5">
            {tema.repertorio.map((r) => (
              <li key={r} className="flex gap-2.5 text-sm leading-6 text-slate-700 dark:text-slate-300">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                {r}
              </li>
            ))}
          </ul>
        </details>
      </Card>

      {/* ---------------- editor ---------------- */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="tabular-nums">
              <strong className="text-slate-800 dark:text-slate-200">{palavras}</strong> palavras
            </span>
            <span className="tabular-nums">≈ {linhas} linhas</span>
            <span
              className={`inline-flex items-center gap-1.5 tabular-nums ${
                rodando ? 'text-brand-600 dark:text-brand-300' : ''
              }`}
            >
              <Clock size={14} /> {fmt(segundos)}
            </span>
          </div>

          {!rodando && segundos === 0 && (
            <button
              type="button"
              onClick={comecar}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Iniciar cronômetro
            </button>
          )}
        </div>

        <textarea
          ref={areaRef}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            if (!rodando && inicio.current === null && e.target.value.length > 0) comecar();
          }}
          rows={16}
          placeholder={
            'Escreva aqui.\n\nIntrodução: contextualize o tema e feche com a tese.\n\nDesenvolvimento 1: um argumento, com lei, dado ou exemplo.\n\nDesenvolvimento 2: outro ângulo — jurídico, social ou institucional.\n\nConclusão: retome a tese e apresente a proposta de intervenção (quem faz, o que faz, como, para quê e com qual detalhe).'
          }
          className="w-full resize-y rounded-xl border border-slate-300 bg-white p-4 text-[0.95rem] leading-8 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-900"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={corrigir}
            disabled={palavras < 30}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Corrigir redação
          </button>
          {palavras < 30 && (
            <span className="self-center text-xs text-slate-400">
              escreva pelo menos 30 palavras para corrigir
            </span>
          )}
          {texto.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setTexto('');
                setAnalise(null);
                setSalvo(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600"
            >
              <RotateCcw size={15} /> Limpar
            </button>
          )}
        </div>
      </Card>

      {/* ---------------- correção ---------------- */}
      {analise && (
        <div id="correcao" className="space-y-4 scroll-mt-20">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Nota estimada
                </p>
                <p className="mt-1 text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {analise.nota}
                  <span className="text-xl font-semibold text-slate-400">/{analise.maximo}</span>
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {analise.nota >= 16
                    ? 'Texto forte: a forma está dominada.'
                    : analise.nota >= 12
                      ? 'No caminho. Ataque os pontos marcados em vermelho.'
                      : 'Ainda longe do formato cobrado — comece pela estrutura e pela proposta de intervenção.'}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                {[
                  ['Palavras', analise.palavras],
                  ['Parágrafos', analise.paragrafos],
                  ['Períodos', analise.periodos],
                  ['Média/período', analise.mediaPalavrasPorPeriodo],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">{k}</dt>
                    <dd className="font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {analise.criterios.map((c) => (
                <div key={c.id}>
                  <Medidor
                    valor={Math.round((100 * c.nota) / c.maximo)}
                    meta={75}
                    label={
                      <span>
                        {c.nome}{' '}
                        <span className="text-slate-400 tabular-nums">
                          {c.nota}/{c.maximo}
                        </span>
                      </span>
                    }
                  />
                  <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {c.descricao}
                  </p>
                  {c.observacoes.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {c.observacoes.map((o, i) => (
                        <li key={i} className="text-xs leading-5 text-slate-600 dark:text-slate-400">
                          · {o}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={salvar}
                disabled={salvando || salvo}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                <Save size={15} />
                {salvo ? 'Salva no histórico' : salvando ? 'Salvando…' : 'Salvar no histórico'}
              </button>
              <button
                type="button"
                onClick={novoTema}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
              >
                <Dice5 size={15} /> Escrever outra
              </button>
            </div>
          </Card>

          <Card title={`Apontamentos (${analise.apontamentos.length})`}>
            <ul className="space-y-3">
              {analise.apontamentos.map((a, i) => {
                const e = ESTILO[a.tipo];
                const Icone = e.icone;
                return (
                  <li key={i} className={`rounded-xl border p-4 ${e.caixa}`}>
                    <p className={`flex items-center gap-2 text-sm font-semibold ${e.titulo}`}>
                      <Icone size={16} />
                      <span className="text-xs font-medium opacity-80">
                        {e.rotulo}
                      </span>
                      {a.titulo}
                    </p>
                    <p className="mt-1.5 text-sm leading-7 text-slate-700 dark:text-slate-300">
                      {a.detalhe}
                    </p>
                    {a.trecho && (
                      <p className="mt-2 rounded-lg bg-white/70 px-3 py-1.5 font-mono text-xs text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
                        {a.trecho}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <aside className="rounded-2xl border-l-4 border-slate-400 bg-slate-50 p-4 text-sm leading-7 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
            <p className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
              <Info size={15} /> Como ler esta nota
            </p>
            <p className="mt-1">
              A correção é automática e mede o que dá para medir no texto: estrutura, conectivos,
              elementos da proposta de intervenção, repetição, oralidade, clichês e desvios de
              registro. Ela <strong>não julga a qualidade dos seus argumentos</strong> nem confere se
              o repertório citado é verdadeiro, e não substitui um corretor humano. Use como treino
              da forma — que é justamente a parte que dá para treinar sozinho.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
