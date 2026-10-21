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

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const email = paraEmail(usuario);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name || usuario.trim() } },
      });
      if (error) {
        setError(traduz(error.message));
        setBusy(false);
        return;
      }
      if (!data.session) {
        setInfo('Cadastro criado. Confirme o e-mail que enviamos e depois entre.');
        setMode('login');
        setBusy(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(traduz(error.message));
        setBusy(false);
        return;
      }
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
        {(['login', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 transition ${
              mode === m ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            {m === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>

      {mode === 'signup' && (
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Como quer ser chamado"
          />
        </label>
      )}

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Usuário</span>
        <input
          type="text"
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="username"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          placeholder="adm"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <span className="mt-1 block text-xs text-slate-400">
          Pode ser um usuário simples ou um e-mail completo.
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Senha</span>
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
      {info && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-100">
          {info}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
      </button>
    </form>
  );
}

function traduz(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Usuário ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('already registered')) return 'Esse usuário já existe. Use "Entrar".';
  if (m.includes('password should be')) return 'A senha precisa de pelo menos 6 caracteres.';
  return msg;
}
