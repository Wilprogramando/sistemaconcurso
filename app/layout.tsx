import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Estudo PM SC 2026 — Soldado QPPM',
  description:
    'Sistema de estudo para o concurso de Soldado da PMSC (Edital 002/CCP/2026): teoria, questões comentadas, simulados e revisão espaçada.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#143659',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
