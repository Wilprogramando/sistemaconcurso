import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import NavLink from '@/components/nav-link';

const NAV = [
  ['/dashboard', 'Painel'],
  ['/materias', 'Matérias'],
  ['/questoes', 'Questões'],
  ['/revisao', 'Revisão'],
  ['/simulado', 'Simulado'],
  ['/erros', 'Caderno de erros'],
  ['/plano', 'Plano'],
  ['/estatisticas', 'Estatísticas'],
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, exam_date')
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
    <div className="min-h-screen">
      <header className="bg-brand-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="font-bold">
            PM SC 2026 <span className="font-normal text-brand-100">· Soldado QPPM</span>
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-brand-100">Olá, {nome}</span>
            <form action={sair}>
              <button className="rounded-md bg-white/10 px-3 py-1.5 font-medium transition hover:bg-white/20">
                Sair
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4">
          <ul className="flex gap-1 pb-1 text-sm whitespace-nowrap">
            {NAV.map(([href, label]) => (
              <li key={href}>
                <NavLink href={href}>{label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-slate-500">
        Conteúdo transcrito da Apostila Completa PM SC 2026 — Soldado QPPM, Edital nº 002/CCP/2026
        (Instituto AOCP). Material de estudo pessoal.
      </footer>
    </div>
  );
}
