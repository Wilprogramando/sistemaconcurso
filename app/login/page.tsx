import { Suspense } from 'react';
import LoginForm from './login-form';

export const metadata = { title: 'Entrar — Estudo PM SC 2026' };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand-100 uppercase">
            Concurso público 2026
          </p>
          <h1 className="mt-2 text-2xl font-bold">PM SC — Soldado QPPM</h1>
          <p className="mt-1 text-sm text-brand-100">
            Edital nº 002/CCP/2026 · 60 questões + redação
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <Suspense fallback={<p className="text-sm text-slate-500">Carregando…</p>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-brand-100">
          Conteúdo baseado na Apostila Completa PM SC 2026 — Soldado QPPM.
        </p>
      </div>
    </main>
  );
}
