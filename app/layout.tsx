import type { Metadata, Viewport } from 'next';
import { scriptTema } from '@/components/tema';
import './globals.css';

export const metadata: Metadata = {
  title: 'Estudo PM SC 2026 — Soldado QPPM',
  description:
    'Sistema de estudo para o concurso de Soldado da PMSC (Edital 002/CCP/2026): teoria, questões comentadas, simulados e revisão espaçada.',
  appleWebApp: { capable: true, title: 'PM SC 2026', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#064e3b' },
    { media: '(prefers-color-scheme: dark)', color: '#022c22' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-screen font-sans text-slate-900 antialiased dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
