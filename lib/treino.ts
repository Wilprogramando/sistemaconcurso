import type { SupabaseClient } from '@supabase/supabase-js';
import { embaralhar } from './questions';

export const META_DIARIA_PADRAO = 20;

/** Dia de hoje no fuso de Santa Catarina, no formato YYYY-MM-DD. */
export function hojeLocal() {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export class MigracaoPendente extends Error {
  constructor() {
    super('A tabela daily_sets ainda nao existe');
    this.name = 'MigracaoPendente';
  }
}

export type TreinoDoDia = {
  day: string;
  questionIds: number[];
  goal: number;
  answered: number;
  correct: number;
  finishedAt: string | null;
  novo: boolean;
};

/**
 * Monta (ou recupera) o treino do dia.
 *
 * A seleção não é um sorteio puro: ela respeita a ordem de prioridade do
 * estudo — primeiro o que a revisão espaçada marcou para hoje, depois o que
 * você já errou, e só então questões novas, distribuídas pelo peso de cada
 * disciplina na prova. O conjunto fica gravado, então é o mesmo ao longo do
 * dia, mesmo que você feche o app no meio.
 */
export async function treinoDoDia(
  supabase: SupabaseClient,
  userId: string,
  meta = META_DIARIA_PADRAO
): Promise<TreinoDoDia> {
  const day = hojeLocal();

  const { data: existente, error } = await supabase
    .from('daily_sets')
    .select('*')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle();

  // a tabela vem da migracao 0004; sem ela, a tela avisa em vez de quebrar
  if (error && /daily_sets|schema cache|does not exist/i.test(error.message)) {
    throw new MigracaoPendente();
  }

  if (existente) {
    return {
      day,
      questionIds: existente.question_ids as number[],
      goal: existente.goal,
      answered: existente.answered,
      correct: existente.correct,
      finishedAt: existente.finished_at,
      novo: false,
    };
  }

  const escolhidas = await selecionar(supabase, userId, meta);

  await supabase.from('daily_sets').upsert(
    {
      user_id: userId,
      day,
      question_ids: escolhidas,
      goal: meta,
      answered: 0,
      correct: 0,
    },
    { onConflict: 'user_id,day', defaultToNull: false }
  );

  return {
    day,
    questionIds: escolhidas,
    goal: meta,
    answered: 0,
    correct: 0,
    finishedAt: null,
    novo: true,
  };
}

async function selecionar(supabase: SupabaseClient, userId: string, meta: number) {
  const hoje = hojeLocal();

  const [{ data: vencidas }, { data: tentativas }, { data: disciplinas }, { data: banco }] =
    await Promise.all([
      supabase
        .from('reviews')
        .select('question_id')
        .eq('user_id', userId)
        .lte('due_on', hoje)
        .order('due_on')
        .limit(40),
      supabase.from('attempts').select('question_id, correct').eq('user_id', userId),
      supabase.from('disciplines').select('id, question_count').gt('question_count', 0),
      supabase.from('questions').select('id, discipline_id').neq('source', 'simulado'),
    ]);

  const escolhidas: number[] = [];
  const usada = new Set<number>();
  const pegar = (ids: number[], quantos: number) => {
    for (const id of ids) {
      if (escolhidas.length >= meta) return;
      if (usada.has(id) || quantos <= 0) continue;
      escolhidas.push(id);
      usada.add(id);
      quantos -= 1;
    }
  };

  // 1. revisão vencida — no máximo metade do treino, para sobrar espaço para o novo
  pegar(
    (vencidas ?? []).map((r) => r.question_id as number),
    Math.floor(meta / 2)
  );

  // 2. questões que você errou e ainda não acertou depois
  const acertos = new Set<number>();
  const erros = new Set<number>();
  for (const a of tentativas ?? []) {
    if (a.correct) acertos.add(a.question_id as number);
    else erros.add(a.question_id as number);
  }
  const errosPendentes = embaralhar([...erros].filter((id) => !acertos.has(id)));
  pegar(errosPendentes, Math.ceil(meta * 0.25));

  // 3. o resto: questões ainda não respondidas, distribuídas pelo peso da prova
  const respondidas = new Set([...acertos, ...erros]);
  const porDisciplina = new Map<number, number[]>();
  for (const q of banco ?? []) {
    if (!q.discipline_id || usada.has(q.id) || respondidas.has(q.id)) continue;
    const arr = porDisciplina.get(q.discipline_id) ?? [];
    arr.push(q.id);
    porDisciplina.set(q.discipline_id, arr);
  }

  const pesoTotal = (disciplinas ?? []).reduce((a, d) => a + d.question_count, 0) || 1;
  const faltam = meta - escolhidas.length;

  for (const d of disciplinas ?? []) {
    const cota = Math.round((d.question_count / pesoTotal) * faltam);
    pegar(embaralhar(porDisciplina.get(d.id) ?? []), cota);
  }

  // 4. se ainda faltar (banco pequeno ou tudo já respondido), completa com qualquer uma
  if (escolhidas.length < meta) {
    const resto = embaralhar((banco ?? []).map((q) => q.id).filter((id) => !usada.has(id)));
    pegar(resto, meta - escolhidas.length);
  }

  return embaralhar(escolhidas);
}
