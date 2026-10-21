'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { nextReview, type ReviewState } from '@/lib/srs';
import type { Question } from '@/lib/types';

type Answered = {
  question: Question;
  chosen: 'C' | 'E' | null;
  correct: boolean;
};

export default function QuestionRunner({
  questions,
  kind,
  disciplineId = null,
  instant = true,
  timeLimitSeconds = null,
  titulo,
  voltarHref = '/dashboard',
}: {
  questions: Question[];
  kind: 'treino' | 'simulado' | 'revisao';
  disciplineId?: number | null;
  /** feedback imediato (treino/revisão) ou só no fim (simulado) */
  instant?: boolean;
  timeLimitSeconds?: number | null;
  titulo: string;
  voltarHref?: string;
}) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<'C' | 'E' | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [log, setLog] = useState<Answered[]>([]);
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);

  const sessionId = useRef<string | null>(null);
  const startedAt = useRef<number>(Date.now());
  const supabase = useMemo(() => createClient(), []);

  const q = questions[index];
  const total = questions.length;

  // cronômetro
  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [finished]);

  const encerrar = useCallback(
    async (registro: Answered[]) => {
      setFinished(true);
      setSaving(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        setSaving(false);
        return;
      }

      const duration = Math.floor((Date.now() - startedAt.current) / 1000);
      const correct = registro.filter((r) => r.correct).length;

      const { data: session } = await supabase
        .from('exam_sessions')
        .insert({
          user_id: user.id,
          kind,
          discipline_id: disciplineId,
          total: registro.length,
          correct,
          started_at: new Date(startedAt.current).toISOString(),
          finished_at: new Date().toISOString(),
          duration_seconds: duration,
        })
        .select('id')
        .single();

      sessionId.current = session?.id ?? null;

      if (registro.length) {
        await supabase.from('attempts').insert(
          registro.map((r) => ({
            user_id: user.id,
            question_id: r.question.id,
            session_id: sessionId.current,
            chosen: r.chosen,
            correct: r.correct,
          }))
        );

        // revisão espaçada: busca estado atual e recalcula
        const ids = registro.map((r) => r.question.id);
        const { data: prev } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', user.id)
          .in('question_id', ids);

        const prevMap = new Map<number, Partial<ReviewState>>(
          (prev ?? []).map((p) => [p.question_id as number, p as Partial<ReviewState>])
        );

        await supabase.from('reviews').upsert(
          registro.map((r) => {
            const st = nextReview(prevMap.get(r.question.id) ?? null, r.correct);
            return {
              user_id: user.id,
              question_id: r.question.id,
              ease: st.ease,
              interval_days: st.interval_days,
              repetitions: st.repetitions,
              lapses: st.lapses,
              due_on: st.due_on,
              last_result: st.last_result,
              updated_at: new Date().toISOString(),
            };
          }),
          { onConflict: 'user_id,question_id' }
        );

        // caderno de erros: registra os erros desta sessão
        const erros = registro.filter((r) => !r.correct);
        if (erros.length) {
          await supabase.from('error_notes').insert(
            erros.map((r) => ({
              user_id: user.id,
              question_id: r.question.id,
              topic_id: r.question.topic_id,
              note: '',
            }))
          );
        }
      }

      setSaving(false);
    },
    [disciplineId, kind, supabase]
  );

  // limite de tempo do simulado
  useEffect(() => {
    if (!timeLimitSeconds || finished) return;
    if (seconds >= timeLimitSeconds) void encerrar(log);
  }, [seconds, timeLimitSeconds, finished, log, encerrar]);

  function avaliar(escolha: 'C' | 'E' | null, acertouManual?: boolean) {
    const acertou =
      q.type === 'open' ? !!acertouManual : escolha !== null && escolha === q.answer;
    const registro = [...log, { question: q, chosen: escolha, correct: acertou }];
    setLog(registro);

    if (instant) {
      setChosen(escolha);
      setRevealed(true);
      return;
    }
    proximaDepoisDe(registro);
  }

  function proximaDepoisDe(registro: Answered[]) {
    setChosen(null);
    setRevealed(false);
    if (index + 1 >= total) void encerrar(registro);
    else setIndex(index + 1);
  }

  if (!total) {
    return (
      <div className="rounded-xl bg-white p-8 text-center ring-1 ring-slate-200/70">
        <p className="text-slate-600">Nenhuma questão disponível para este filtro.</p>
        <Link href={voltarHref} className="mt-4 inline-block text-sm text-brand-700 hover:underline">
          ← voltar
        </Link>
      </div>
    );
  }

  if (finished) return <Resultado log={log} seconds={seconds} saving={saving} voltarHref={voltarHref} />;

  const respondidas = log.length;
  const acertos = log.filter((r) => r.correct).length;
  const restante = timeLimitSeconds ? Math.max(0, timeLimitSeconds - seconds) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{titulo}</h1>
          <p className="text-sm text-slate-500">
            Questão {index + 1} de {total}
            {instant && respondidas > 0 && ` · ${acertos}/${respondidas} corretas`}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-semibold text-slate-700 tabular-nums">
            {fmt(restante ?? seconds)}
          </p>
          <p className="text-xs text-slate-500">{restante !== null ? 'tempo restante' : 'tempo'}</p>
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>

      <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200/70">
        <p className="text-base leading-relaxed text-slate-900">{q.statement}</p>

        {q.type === 'ce' ? (
          <div className="mt-6 flex gap-3">
            {(['C', 'E'] as const).map((op) => {
              const selecionado = chosen === op;
              const correto = q.answer === op;
              let cls =
                'flex-1 rounded-lg px-4 py-3 text-sm font-semibold ring-1 transition disabled:cursor-default';
              if (!revealed) {
                cls += ' bg-white text-slate-800 ring-slate-300 hover:bg-slate-50';
              } else if (correto) {
                cls += ' bg-emerald-600 text-white ring-emerald-600';
              } else if (selecionado) {
                cls += ' bg-red-600 text-white ring-red-600';
              } else {
                cls += ' bg-white text-slate-400 ring-slate-200';
              }
              return (
                <button
                  key={op}
                  type="button"
                  disabled={revealed}
                  onClick={() => avaliar(op)}
                  className={cls}
                >
                  {op === 'C' ? 'Certo' : 'Errado'}
                </button>
              );
            })}
          </div>
        ) : !revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Revelar resposta
          </button>
        ) : null}

        {revealed && instant && (
          <div className="mt-5 space-y-4">
            {q.type === 'ce' && (
              <p
                className={`text-sm font-semibold ${
                  chosen === q.answer ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {chosen === q.answer ? 'Você acertou.' : `Você errou — o gabarito é ${q.answer === 'C' ? 'CERTO' : 'ERRADO'}.`}
              </p>
            )}
            {q.explanation && (
              <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
                <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Fundamento
                </p>
                {q.explanation}
              </div>
            )}

            {q.type === 'open' && log.length === index ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => avaliar(null, true)}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Eu sabia
                </button>
                <button
                  type="button"
                  onClick={() => avaliar(null, false)}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Não sabia
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => proximaDepoisDe(log)}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                {index + 1 >= total ? 'Finalizar' : 'Próxima questão →'}
              </button>
            )}
          </div>
        )}

        {!instant && q.type === 'open' && revealed && (
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => avaliar(null, true)}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Eu sabia
            </button>
            <button
              type="button"
              onClick={() => avaliar(null, false)}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Não sabia
            </button>
          </div>
        )}
      </div>

      {!instant && (
        <div className="flex justify-between">
          <p className="text-sm text-slate-500">
            Simulado: o gabarito aparece somente no final, como na prova.
          </p>
          <button
            type="button"
            onClick={() => void encerrar(log)}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Encerrar agora
          </button>
        </div>
      )}
    </div>
  );
}

function Resultado({
  log,
  seconds,
  saving,
  voltarHref,
}: {
  log: Answered[];
  seconds: number;
  saving: boolean;
  voltarHref: string;
}) {
  const total = log.length;
  const acertos = log.filter((r) => r.correct).length;
  const pct = total ? Math.round((100 * acertos) / total) : 0;
  const erros = log.filter((r) => !r.correct);

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-6 text-center ring-1 ring-slate-200/70">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Resultado</p>
        <p
          className={`mt-2 text-4xl font-bold ${
            pct >= 70 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700'
          }`}
        >
          {acertos}/{total}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {pct}% de acerto · {fmt(seconds)} de duração
        </p>
        <p className="mt-3 text-sm text-slate-600">
          {pct >= 80
            ? 'Ritmo de aprovação. Mantenha a revisão espaçada.'
            : pct >= 60
              ? 'Bom desempenho. Foque nos pontos fracos abaixo.'
              : 'Volte à teoria das questões que errou antes de treinar mais.'}
        </p>
        {saving && <p className="mt-2 text-xs text-slate-400">salvando resultado…</p>}
      </div>

      {erros.length > 0 && (
        <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200/70">
          <h2 className="font-semibold text-slate-900">
            Revisão dos erros ({erros.length})
          </h2>
          <p className="mt-0.5 mb-3 text-sm text-slate-500">
            Estas questões já entraram no seu caderno de erros e voltam amanhã na revisão.
          </p>
          <ul className="space-y-3">
            {erros.map((r) => (
              <li key={r.question.id} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-sm text-slate-900">{r.question.statement}</p>
                <p className="mt-2 text-sm">
                  <span className="font-semibold text-emerald-700">
                    Gabarito: {r.question.answer === 'C' ? 'CERTO' : r.question.answer === 'E' ? 'ERRADO' : '—'}
                  </span>
                  {r.question.explanation && (
                    <span className="text-slate-600"> — {r.question.explanation}</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href={voltarHref}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Voltar
        </Link>
        <Link
          href="/erros"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Caderno de erros
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Painel
        </Link>
      </div>
    </div>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
