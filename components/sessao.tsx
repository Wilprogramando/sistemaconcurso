'use client';

import { createContext, useContext, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

type Sessao = { userId: string; nome: string; supabase: SupabaseClient };

const Ctx = createContext<Sessao | null>(null);

/**
 * Guarda o id do usuário vindo do servidor e um único cliente Supabase.
 * Sem isso, cada clique disparava um auth.getUser() na rede antes de gravar,
 * e era isso que dava a sensação de travamento nos botões.
 */
export function ProvedorSessao({
  userId,
  nome,
  children,
}: {
  userId: string;
  nome: string;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const valor = useMemo(() => ({ userId, nome, supabase }), [userId, nome, supabase]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSessao() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSessao precisa estar dentro de ProvedorSessao');
  return ctx;
}
