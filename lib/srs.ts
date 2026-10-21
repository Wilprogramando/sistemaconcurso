/**
 * Revisão espaçada (SM-2 simplificado).
 * A apostila recomenda revisar 1 dia, 7 dias e 30 dias depois; o algoritmo
 * abaixo cresce nesse ritmo quando você acerta e zera quando erra.
 */

export type ReviewState = {
  ease: number;
  interval_days: number;
  repetitions: number;
  lapses: number;
  due_on: string; // YYYY-MM-DD
  last_result: boolean | null;
};

const INITIAL: Omit<ReviewState, 'due_on' | 'last_result'> = {
  ease: 2.5,
  interval_days: 0,
  repetitions: 0,
  lapses: 0,
};

const addDays = (days: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function today() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/**
 * @param prev estado atual (ou null na primeira vez)
 * @param correct acertou?
 * @param confident marcou "sabia com certeza"? (só conta quando acertou)
 */
export function nextReview(
  prev: Partial<ReviewState> | null,
  correct: boolean,
  confident = true
): ReviewState {
  const s = { ...INITIAL, ...(prev ?? {}) };

  if (!correct) {
    return {
      ease: Math.max(1.3, s.ease - 0.2),
      interval_days: 1,
      repetitions: 0,
      lapses: s.lapses + 1,
      due_on: addDays(1),
      last_result: false,
    };
  }

  const quality = confident ? 5 : 3;
  const ease = Math.max(1.3, s.ease + (0.1 - (5 - quality) * 0.08));
  const repetitions = s.repetitions + 1;

  let interval: number;
  if (repetitions === 1) interval = confident ? 3 : 1;
  else if (repetitions === 2) interval = confident ? 7 : 3;
  else interval = Math.min(180, Math.round(s.interval_days * ease));

  return {
    ease: Number(ease.toFixed(2)),
    interval_days: interval,
    repetitions,
    lapses: s.lapses,
    due_on: addDays(interval),
    last_result: true,
  };
}
