'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * O Supabase Auth exige e-mail. Para permitir login so com usuario ("adm"),
 * o que nao tiver "@" recebe este dominio interno, que nunca envia e-mail.
 */
const DOMINIO_INTERNO = 'pmsc.local';

export function paraEmail(valor: string) {
  const v = valor.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${DOMINIO_INTERNO}`;
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';

  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: paraEmail(usuario),
      password,
    });

    if (error) {
      setError(traduz(error.message));
      setBusy(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Usuário</span>
        <input
          type="text"
          required
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="username"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Senha</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}

function traduz(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Usuário ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Usuário ainda não confirmado.';
  return msg;
}
