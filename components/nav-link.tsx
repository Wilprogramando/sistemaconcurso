'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = path === href || path.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`block rounded-t-md px-3 py-2 transition ${
        active ? 'bg-[#f6f7f9] font-semibold text-brand-700' : 'text-brand-100 hover:bg-white/10'
      }`}
    >
      {children}
    </Link>
  );
}
