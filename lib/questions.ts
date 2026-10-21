import type { SupabaseClient } from '@supabase/supabase-js';
import type { Question } from './types';

export const COLUNAS =
  'id, ext_id, source, discipline_id, topic_id, number, kind, options, statement, answer, explanation, origin, origin_label, year, banca, source_url, passage_id';

/** Anexa o texto de apoio (interpretação de texto) às questões que o citam. */
export async function comTextosDeApoio(
  supabase: SupabaseClient,
  questoes: Question[]
): Promise<Question[]> {
  const ids = [...new Set(questoes.map((q) => q.passage_id).filter(Boolean))] as string[];
  if (!ids.length) return questoes;

  const { data: passages } = await supabase.from('passages').select('*').in('id', ids);
  const mapa = new Map((passages ?? []).map((p) => [p.id as string, p]));

  return questoes.map((q) => {
    const p = q.passage_id ? mapa.get(q.passage_id) : null;
    return p ? { ...q, passage_label: p.label as string, passage_body: p.body as string } : q;
  });
}

/** Embaralha sem viés (Fisher-Yates). */
export function embaralhar<T>(lista: T[]): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
