import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export function Card({
  title,
  subtitle,
  icon: Icone,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-white p-5 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700/70 ${className}`}
    >
      {title && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {Icone && (
              <span className="mt-0.5 text-slate-400 dark:text-slate-500">
                <Icone size={18} />
              </span>
            )}
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
              {subtitle && (
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
              )}
            </div>
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const TONS = {
  default: { texto: 'text-slate-900 dark:text-slate-100', chip: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
  brand: { texto: 'text-slate-900 dark:text-slate-100', chip: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300' },
  good: { texto: 'text-emerald-700 dark:text-emerald-400', chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
  warn: { texto: 'text-amber-700 dark:text-amber-400', chip: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
  bad: { texto: 'text-red-700 dark:text-red-400', chip: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' },
} as const;

export function Stat({
  label,
  value,
  hint,
  icon: Icone,
  tone = 'default',
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: keyof typeof TONS;
  href?: string;
}) {
  const t = TONS[tone];
  const corpo = (
    <>
      <div className="flex items-start gap-3">
        {Icone && (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.chip}`}>
            <Icone size={18} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            {label}
          </p>
          <p className={`mt-0.5 text-2xl leading-tight font-bold tabular-nums ${t.texto}`}>{value}</p>
        </div>
      </div>
      {hint && <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{hint}</p>}
    </>
  );

  const classe =
    'block rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700/70';

  return href ? (
    <Link href={href} className={`${classe} transition hover:ring-brand-400`}>
      {corpo}
    </Link>
  ) : (
    <div className={classe}>{corpo}</div>
  );
}

export function Bar({ percent, tone = 'brand' }: { percent: number; tone?: 'brand' | 'auto' }) {
  const p = Math.max(0, Math.min(100, percent));
  const cor =
    tone === 'brand'
      ? 'bg-brand-500'
      : p >= 70
        ? 'bg-emerald-500'
        : p >= 50
          ? 'bg-amber-500'
          : 'bg-red-500';

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      role="progressbar"
      aria-valuenow={Math.round(p)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${p}%` }} />
    </div>
  );
}

export function Badge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export function ActionLink({
  href,
  children,
  icon: Icone,
  variant = 'primary',
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  variant?: 'primary' | 'ghost';
  className?: string;
}) {
  const cls =
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'bg-white text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600 dark:hover:bg-slate-700';

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${cls} ${className}`}
    >
      {Icone && <Icone size={16} />}
      {children}
    </Link>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
      {children}
    </p>
  );
}

export function Aviso({
  title,
  children,
  tone = 'warn',
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'warn' | 'bad' | 'info';
}) {
  const tons = {
    warn: 'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    bad: 'border-red-400 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200',
    info: 'border-brand-400 bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-200',
  } as const;

  return (
    <section className={`rounded-2xl border-l-4 p-4 ${tons[tone]}`}>
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-1 text-sm">{children}</div>
    </section>
  );
}
