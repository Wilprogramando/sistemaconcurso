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
