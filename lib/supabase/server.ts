import { cache } from 'react';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cliente do Supabase para esta requisição.
 *
 * Vem embrulhado em `cache()`: o layout e a página montavam um cliente cada
 * um, e cada chamada de `getUser` custava uma ida à rede. Agora é uma só por
 * requisição.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de um Server Component: o middleware cuida da renovacao do cookie
          }
        },
      },
    }
  );
});

/** Usuário logado ou null — uma verificação por requisição, não uma por tela. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Id de quem está logado, lido do próprio cookie — sem falar com o Supabase.
 *
 * O middleware já valida a sessão de verdade (`auth.getUser`) antes de a
 * página renderizar, numa ida à rede. Repetir a validação aqui custava outra,
 * em fila, em toda troca de tela. Aqui o token é apenas decodificado para
 * pegar o `sub` e conferir o prazo; se algo não bater, cai na verificação
 * completa.
 */
export const getUserId = cache(async (): Promise<string | null> => {
  try {
    const cookieStore = await cookies();

    // o supabase-ssr grava em `sb-<ref>-auth-token`, às vezes partido em
    // `.0`, `.1` … quando o valor passa do limite de tamanho do cookie
    const pedacos = cookieStore
      .getAll()
      .filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!pedacos.length) return (await getUser())?.id ?? null;

    let bruto = pedacos.map((c) => c.value).join('');
    if (bruto.startsWith('base64-')) {
      bruto = Buffer.from(bruto.slice('base64-'.length), 'base64').toString('utf8');
    }

    const sessao = JSON.parse(bruto) as { access_token?: string };
    const token = sessao.access_token;
    if (!token) return (await getUser())?.id ?? null;

    const corpo = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { sub?: string; exp?: number };

    // token vencido: deixa a verificação completa decidir (ela também renova)
    if (!corpo.sub || !corpo.exp || corpo.exp * 1000 < Date.now()) {
      return (await getUser())?.id ?? null;
    }

    return corpo.sub;
  } catch {
    return (await getUser())?.id ?? null;
  }
});
