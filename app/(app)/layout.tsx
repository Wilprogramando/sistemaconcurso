import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createClient, getUser } from '@/lib/supabase/server';
import { MenuSecundario, NavInferior, NavTopo } from '@/components/navegacao';
import BotaoTema from '@/components/tema';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .maybeSingle();

  const nome = profile?.name ?? user.email?.split('@')[0] ?? 'candidato';

  async function sair() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <header className="bg-brand-900 text-white dark:bg-slate-950">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <ShieldCheck size={20} className="text-brand-300" />
            <span>
              PM SC 2026
              <span className="hidden font-normal text-brand-100 sm:inline"> · Soldado QPPM</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <BotaoTema />
            <span className="hidden text-brand-100 sm:inline">Olá, {nome}</span>
            <form action={sair}>
              <button className="rounded-lg bg-white/10 px-3 py-1.5 font-medium transition hover:bg-white/20">
                Sair
              </button>
            </form>
          </div>
        </div>

        <NavTopo />
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <MenuSecundario />
        {children}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-500 dark:text-slate-400">
        Conteúdo da Apostila PM SC 2026 (Edital nº 002/CCP/2026) e da prova oficial de Soldado
        aplicada pelo Cebraspe em 27/8/2023. Material de estudo pessoal.
      </footer>

      <NavInferior />
    </div>
  );
}
