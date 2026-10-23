import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { createClient, getUser } from '@/lib/supabase/server';
import { NavInferior } from '@/components/navegacao';
import NavLateral from '@/components/nav-lateral';
import { ProvedorSessao } from '@/components/sessao';
import BotaoTema from '@/components/tema';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  // o nome enfeita o rodapé da barra lateral; se o perfil ainda não tem
  // nome, o começo do e-mail serve
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

  /** Vai no pé da barra lateral, no desktop. */
  const rodapeLateral = (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-bold uppercase">
        {nome.slice(0, 2)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-brand-100">{nome}</span>
      <BotaoTema />
      <form action={sair}>
        <button
          aria-label="Sair"
          title="Sair"
          className="rounded-lg p-2 text-brand-100 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut size={17} />
        </button>
      </form>
    </div>
  );

  return (
    <ProvedorSessao userId={user.id} nome={nome}>
      <div className="min-h-screen md:pl-60">
        <NavLateral rodape={rodapeLateral} />

        {/* cabeçalho só no celular — no desktop tudo vive na barra lateral */}
        <header className="sticky top-0 z-30 bg-brand-900 text-white md:hidden dark:bg-slate-950">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold">
              <ShieldCheck size={20} className="text-brand-300" />
              PM SC 2026
            </Link>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <BotaoTema />
              <form action={sair}>
                <button className="rounded-lg bg-white/10 px-3 py-1.5 font-medium transition hover:bg-white/20">
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="pb-20 md:pb-0">
          <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">{children}</main>

          <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs leading-5 text-slate-500 sm:px-6 dark:text-slate-400">
            Conteúdo da Apostila PM SC 2026 (Edital nº 002/CCP/2026) e das provas oficiais de
            Soldado e de Oficial aplicadas pelo Cebraspe em 2023. Material de estudo pessoal.
          </footer>
        </div>

        <NavInferior />
      </div>
    </ProvedorSessao>
  );
}
