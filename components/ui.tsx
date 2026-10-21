import Link from 'next/link';

export function Card({
  title,
  subtitle,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl bg-white p-5 ring-1 ring-slate-200/70 ${className}`}>
      {title && (
        <header className="mb-3">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const tones = {
    default: 'text-slate-900',
    good: 'text-emerald-700',
    warn: 'text-amber-700',
    bad: 'text-red-700',
  } as const;

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200/70">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Bar({ percent, tone = 'brand' }: { percent: number; tone?: 'brand' | 'auto' }) {
  const p = Math.max(0, Math.min(100, percent));
  const color =
    tone === 'brand'
      ? 'bg-brand-500'
      : p >= 70
        ? 'bg-emerald-500'
        : p >= 50
          ? 'bg-amber-500'
          : 'bg-red-500';

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

export function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export function ActionLink({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost';
}) {
  const cls =
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'bg-white text-brand-700 ring-1 ring-slate-300 hover:bg-slate-50';
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${cls}`}
    >
      {children}
    </Link>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{children}</p>
  );
}
