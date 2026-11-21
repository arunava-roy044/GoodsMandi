'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Badges = { reports: number; privacy: number; flagged: number };

export default function AdminNav({ badges }: { badges: Badges }) {
  const pathname = usePathname();

  const tabs: { href: string; label: string; exact?: boolean; badge?: number }[] = [
    { href: '/admin', label: 'Overview', exact: true },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/listings', label: 'Listings', badge: badges.flagged },
    { href: '/admin/reports', label: 'Reports', badge: badges.reports },
    { href: '/admin/privacy', label: 'Privacy & data', badge: badges.privacy },
    { href: '/admin/activity', label: 'Activity' },
  ];

  return (
    <nav aria-label="Admin sections" className="mb-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-slate-800">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active ? 'border-emerald-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
                {!!tab.badge && tab.badge > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">{tab.badge}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
