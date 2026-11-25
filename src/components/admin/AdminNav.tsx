'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconActivity, IconFlag, IconHome, IconLock, IconTag, IconUsers } from '@/components/admin/icons';

type Badges = { reports: number; privacy: number; flagged: number };

export default function AdminNav({ badges }: { badges: Badges }) {
  const pathname = usePathname();

  const tabs: { href: string; label: string; icon: React.ReactNode; exact?: boolean; badge?: number }[] = [
    { href: '/admin', label: 'Overview', icon: <IconHome className="h-4 w-4" />, exact: true },
    { href: '/admin/users', label: 'Users', icon: <IconUsers className="h-4 w-4" /> },
    { href: '/admin/listings', label: 'Listings', icon: <IconTag className="h-4 w-4" />, badge: badges.flagged },
    { href: '/admin/reports', label: 'Reports', icon: <IconFlag className="h-4 w-4" />, badge: badges.reports },
    { href: '/admin/privacy', label: 'Privacy & data', icon: <IconLock className="h-4 w-4" />, badge: badges.privacy },
    { href: '/admin/activity', label: 'Activity', icon: <IconActivity className="h-4 w-4" /> },
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
                className={`-mb-px inline-flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active ? 'border-emerald-400 bg-emerald-500/5 text-white' : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span className={active ? 'text-emerald-400' : 'text-slate-500'}>{tab.icon}</span>
                {tab.label}
                {!!tab.badge && tab.badge > 0 && (
                  <span className="min-w-[1.25rem] rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-xs font-bold leading-none text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                    {tab.badge}
                    <span className="sr-only"> waiting</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
