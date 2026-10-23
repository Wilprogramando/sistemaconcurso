'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  CircleAlert,
  Clock,
  Flag,
  X,
} from 'lucide-react';
import { useSessao } from '@/components/sessao';
import { nextReview, type ReviewState } from '@/lib/srs';
import type { Question } from '@/lib/types';

type Resposta = {
  question: Question;
  chosen: string | null;
  correct: boolean;
};

export default function QuestionRunner({
  questions,
  kind,
  disciplineId = null,
  instant = true,
  timeLimitSeconds = null,
  titulo,
  subtitulo,
  diaDoTreino,
  voltarHref = '/dashboard',
}: {
  questions: Question[];
  kind: 'treino' | 'simulado' | 'revisao';
  disciplineId?: number | null;
  /** feedback imediato (treino/revisão) ou só no fim (simulado) */
  instant?: boolean;
  timeLimitSeconds?: number | null;
  titulo: string;
  subtitulo?: string;
  /** quando vem preenchido, o resultado conta para o treino daquele dia */
  diaDoTreino?: string;
  voltarHref?: string;
}) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [revelado, setRevelado] = useState(false);
  const [log, setLog] = useState<Resposta[]>([]);
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());

  const startedAt = useRef<number>(Date.now());
  const { userId, supabase } = useSessao();

  const q = questions[index];
  const total = questions.length;

  useEffect(() => {
    if (finished) return;
    const t = setInterval(
      () => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)),
      1000
    );
    return () => clearInterval(t);
  }, [finished]);

  const encerrar = useCallback(
    async (registro: Resposta[]) => {
      setFinished(true);
      setSaving(true);


      const duration = Math.floor((Date.now() - startedAt.current) / 1000);
      const acertos = registro.filter((r) => r.correct).length;

      const { data: session } = await supabase
        .from('exam_sessions')
        .insert({
          user_id: userId,
          kind,
          discipline_id: disciplineId,
          total: registro.length,
          correct: acertos,
          started_at: new Date(startedAt.current).toISOString(),
          finished_at: new Date().toISOString(),
          duration_seconds: duration,
        })
        .select('id')
        .single();

      if (registro.length) {
        await supabase.from('attempts').insert(
          registro.map((r) => ({
            user_id: userId,
            question_id: r.question.id,
            session_id: session?.id ?? null,
            // 'chosen' guarda a letra marcada (A-E) ou C/E
            chosen: r.chosen,
            correct: r.correct,
          }))
        );

        const ids = registro.map((r) => r.question.id);
        const { data: prev } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', userId)
          .in('question_id', ids);

        const prevMap = new Map<number, Partial<ReviewState>>(
          (prev ?? []).map((p) => [p.question_id as number, p as Partial<ReviewState>])
        );

        await supabase.from('reviews').upsert(
          registro.map((r) => {
            const st = nextReview(prevMap.get(r.question.id) ?? null, r.correct);
            return {
              user_id: userId,
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
          { onConflict: 'user_id,question_id', defaultToNull: false }
        );

        const erros = registro.filter((r) => !r.correct);
        if (erros.length) {
          await supabase.from('error_notes').insert(
            erros.map((r) => ({
              user_id: userId,
              question_id: r.question.id,
              topic_id: r.question.topic_id,
              note: '',
            }))
          );
        }
      }

      if (diaDoTreino) {
        // o treino do dia e cumulativo: pode ser retomado depois de fechar o app
        const { data: atual } = await supabase
          .from('daily_sets')
          .select('answered, correct, goal')
          .eq('user_id', userId)
          .eq('day', diaDoTreino)
          .maybeSingle();

        const respondidas = (atual?.answered ?? 0) + registro.length;
        const certas = (atual?.correct ?? 0) + acertos;

        await supabase
          .from('daily_sets')
          .update({
            answered: respondidas,
            correct: certas,
            finished_at:
              respondidas >= (atual?.goal ?? registro.length) ? new Date().toISOString() : null,
          })
          .eq('user_id', userId)
          .eq('day', diaDoTreino);
      }

      setSaving(false);
    },
    [diaDoTreino, disciplineId, kind, supabase, userId]
  );

  useEffect(() => {
    if (!timeLimitSeconds || finished) return;
    if (seconds >= timeLimitSeconds) void encerrar(log);
  }, [seconds, timeLimitSeconds, finished, log, encerrar]);

  async function marcar(questionId: number) {
    const nova = new Set(marcadas);
    const tinha = nova.has(questionId);
    tinha ? nova.delete(questionId) : nova.add(questionId);
    setMarcadas(nova);

    if (tinha) {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('question_id', questionId);
    } else {
      await supabase
        .from('bookmarks')
        .upsert({ user_id: userId, question_id: questionId }, { onConflict: 'user_id,question_id' });
    }
  }

  function responder(escolha: string | null, sabiaManual?: boolean) {
    const acertou = q.kind === 'open' ? !!sabiaManual : escolha !== null && escolha === q.answer;
    const registro = [...log, { question: q, chosen: escolha, correct: acertou }];
    setLog(registro);

    if (instant) {
      setChosen(escolha);
      setRevelado(true);
      return;
    }
    avancar(registro);
  }

  function avancar(registro: Resposta[]) {
    setChosen(null);
    setRevelado(false);
    if (index + 1 >= total) void encerrar(registro);
    else setIndex(index + 1);
  }

  if (!total) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <p className="text-slate-600 dark:text-slate-300">
          Nenhuma questão disponível para este filtro.
        </p>
        <Link
          href={voltarHref}
          className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          ← voltar
        </Link>
      </div>
    );
  }

  if (finished) {
    return <Resultado log={log} seconds={seconds} saving={saving} voltarHref={voltarHref} />;
  }

  const respondidas = log.length;
  const acertos = log.filter((r) => r.correct).length;
  const restante = timeLimitSeconds ? Math.max(0, timeLimitSeconds - seconds) : null;
  const jaRespondeuEsta = log.length > index;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-100">{titulo}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Questão {index + 1} de {total}
            {instant && respondidas > 0 && ` · ${acertos}/${respondidas} corretas`}
            {subtitulo ? ` · ${subtitulo}` : ''}
          </p>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-base font-semibold tabular-nums ${
            restante !== null && restante < 300
              ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
              : 'bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700'
          }`}
        >
          <Clock size={15} />
          {fmt(restante ?? seconds)}
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>

      <article className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-6 dark:bg-slate-900 dark:ring-slate-700">
        <div className="mb-3 flex items-start justify-between gap-3">
          <Origem q={q} />
          <button
            type="button"
            onClick={() => marcar(q.id)}
            aria-label="Marcar para revisar depois"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
          >
            {marcadas.has(q.id) ? (
              <BookmarkCheck size={18} className="text-brand-600 dark:text-brand-300" />
            ) : (
              <Bookmark size={18} />
            )}
          </button>
        </div>

        {q.passage_body && (
          <details
            className="mb-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700"
            open
          >
            <summary className="cursor-pointer text-xs font-bold tracking-wide text-slate-500 uppercase">
              {q.passage_label ?? 'Texto de apoio'}
            </summary>
            <p className="mt-2 text-sm leading-7 whitespace-pre-line text-slate-700 dark:text-slate-300">
              {q.passage_body}
            </p>
          </details>
        )}

        <p className="text-base leading-7 text-slate-900 dark:text-slate-100">{q.statement}</p>

        {q.kind === 'mc' && q.options ? (
          <ul className="mt-5 space-y-2.5">
            {q.options.map((op) => {
              const selecionada = chosen === op.letter;
              const certa = q.answer === op.letter;
              let cls =
                'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-sm leading-6 transition';
              if (!revelado) {
                cls +=
                  ' border-slate-200 bg-white hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500 dark:hover:bg-slate-800';
              } else if (certa) {
                cls += ' border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/50';
              } else if (selecionada) {
                cls += ' border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/50';
              } else {
                cls += ' border-slate-200 bg-white opacity-60 dark:border-slate-700 dark:bg-slate-900';
              }
              return (
                <li key={op.letter}>
                  <button type="button" disabled={revelado} onClick={() => responder(op.letter)} className={cls}>
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                        revelado && certa
                          ? 'bg-emerald-600 text-white'
                          : revelado && selecionada
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {op.letter}
                    </span>
                    <span className="min-w-0 flex-1 text-slate-800 dark:text-slate-200">{op.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : q.kind === 'ce' ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            {(['C', 'E'] as const).map((op) => {
              const selecionada = chosen === op;
              const certa = q.answer === op;
              let cls =
                'flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-semibold transition';
              if (!revelado) {
                cls +=
                  ' border-slate-300 bg-white text-slate-800 hover:border-brand-400 hover:bg-brand-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500';
              } else if (certa) {
                cls += ' border-emerald-600 bg-emerald-600 text-white';
              } else if (selecionada) {
                cls += ' border-red-600 bg-red-600 text-white';
              } else {
                cls += ' border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900';
              }
              return (
                <button key={op} type="button" disabled={revelado} onClick={() => responder(op)} className={cls}>
                  {op === 'C' ? <Check size={16} /> : <X size={16} />}
                  {op === 'C' ? 'Certo' : 'Errado'}
                </button>
              );
            })}
          </div>
        ) : !revelado ? (
          <button
            type="button"
            onClick={() => setRevelado(true)}
            className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Revelar resposta
          </button>
        ) : null}

        {revelado && instant && (
          <div className="mt-5 space-y-4">
            {q.kind !== 'open' && <Veredito q={q} chosen={chosen} />}

            {q.explanation && (
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  <CircleAlert size={13} /> Fundamento
                </p>
                <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">{q.explanation}</p>
              </div>
            )}

            {q.kind === 'open' && !jaRespondeuEsta ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => responder(null, true)}
                  className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Eu sabia
                </button>
                <button
                  type="button"
                  onClick={() => responder(null, false)}
                  className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Não sabia
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => avancar(log)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                {index + 1 >= total ? 'Finalizar' : 'Próxima questão'}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}

        {!instant && q.kind === 'open' && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => responder(null, true)}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Eu sabia
            </button>
            <button
              type="button"
              onClick={() => responder(null, false)}
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Não sabia
            </button>
          </div>
        )}
      </article>

      {!instant && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Modo prova: o gabarito comentado aparece no final.
          </p>
          <button
            type="button"
            onClick={() => void encerrar(log)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600"
          >
            Encerrar e corrigir
          </button>
        </div>
      )}
    </div>
  );
}

function Origem({ q }: { q: Question }) {
  if (q.origin === 'prova') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800 ring-1 ring-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-900">
        <Flag size={12} />
        {q.origin_label ?? `Prova oficial ${q.year ?? ''}`}
      </span>
    );
  }
  if (q.origin === 'inedita') {
    return (
      <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900">
        {q.origin_label ?? 'Inédita — baseada no edital'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
      {q.origin_label ?? 'Apostila PM SC 2026'}
    </span>
  );
}

function rotuloResposta(q: Question, letra: string | null) {
  if (!letra) return '—';
  if (q.kind === 'ce') return letra === 'C' ? 'CERTO' : 'ERRADO';
  const op = q.options?.find((o) => o.letter === letra);
  return op ? `${letra}) ${op.text}` : letra;
}

/** O que o usuário marcou × o que era a resposta certa. */
function Veredito({ q, chosen }: { q: Question; chosen: string | null }) {
  const acertou = chosen === q.answer;

  if (acertou) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
        <Check size={16} /> Você acertou.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-xl bg-red-50 px-3.5 py-3 dark:bg-red-950/40">
      <p className="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-300">
        <X size={16} /> Você errou.
      </p>
      <dl className="space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-red-900/70 dark:text-red-300/70">Sua resposta:</dt>
          <dd className="text-red-900 line-through dark:text-red-200">{rotuloResposta(q, chosen)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-emerald-800/80 dark:text-emerald-300/80">
            Resposta correta:
          </dt>
          <dd className="font-semibold text-emerald-800 dark:text-emerald-300">
            {rotuloResposta(q, q.answer)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Resultado({
  log,
  seconds,
  saving,
  voltarHref,
}: {
  log: Resposta[];
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
      <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <p className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Resultado
        </p>
        <p
          className={`mt-2 text-4xl font-bold tabular-nums ${
            pct >= 70
              ? 'text-emerald-600 dark:text-emerald-400'
              : pct >= 50
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
          }`}
        >
          {acertos}/{total}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {pct}% de acerto · {fmt(seconds)} de duração
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-600 dark:text-slate-300">
          {pct >= 80
            ? 'Ritmo de aprovação. Mantenha a revisão espaçada.'
            : pct >= 60
              ? 'Bom desempenho. Foque nos pontos fracos abaixo.'
              : 'Volte à teoria das questões que errou antes de treinar mais.'}
        </p>
        {saving && <p className="mt-2 text-xs text-slate-400">salvando resultado…</p>}
      </div>

      {erros.length > 0 && (
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            Correção dos seus erros ({erros.length})
          </h2>
          <p className="mt-0.5 mb-4 text-sm text-slate-500 dark:text-slate-400">
            Já entraram no caderno de erros e voltam amanhã na revisão.
          </p>
          <ul className="space-y-4">
            {erros.map((r) => (
              <li
                key={r.question.id}
                className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700"
              >
                <p className="text-sm leading-6 text-slate-900 dark:text-slate-100">
                  {r.question.statement}
                </p>
                <div className="mt-3">
                  <Veredito q={r.question} chosen={r.chosen} />
                </div>
                {r.question.explanation && (
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Por quê:{' '}
                    </span>
                    {r.question.explanation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href={voltarHref}
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Voltar
        </Link>
        <Link
          href="/erros"
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
        >
          Caderno de erros
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
        >
          Painel
        </Link>
      </div>
    </div>
  );
}

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const dois = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${dois(m)}:${dois(r)}` : `${dois(m)}:${dois(r)}`;
}
