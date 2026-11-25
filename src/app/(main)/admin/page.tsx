import Link from 'next/link';
import { getDashboard, getMyFirstName, getRecentActions } from '@/lib/adminData';
import { actionLabel, timeAgo } from '@/lib/admin';
import { MiniBars, Stat } from '@/components/admin/ui';
import { AutoRefresh } from '@/components/admin/live';
import {
  IconActivity, IconAlert, IconArrowRight, IconBan, IconChat, IconCheckCircle, IconClock, IconFlag,
  IconHandCoins, IconLock, IconSearch, IconShield, IconSparkles, IconTag, IconTrash, IconTrendUp,
  IconUserPlus, IconUsers,
} from '@/components/admin/icons';

// Always fetch fresh numbers, so the auto-refresh shows what's happening now
export const dynamic = 'force-dynamic';

// The time of day on campus (India), for "Good morning" and today's date
function campusClock() {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(now));
  const greeting = hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const date = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });
  return { now: now.getTime(), iso: now.toISOString(), greeting, date };
}

type Attention = { label: string; count: number; href: string; urgent: boolean; pulse?: boolean; icon: React.ReactNode };

export default async function AdminOverviewPage() {
  const [d, firstName, recent] = await Promise.all([getDashboard(), getMyFirstName(), getRecentActions(5)]);
  const clock = campusClock();

  if (!d) {
    return (
      <div className="glass-card p-8 text-center text-slate-400">
        Couldn&apos;t load the overview. Refresh the page, and check the database migrations have been applied.
      </div>
    );
  }

  // Things that need someone to do something, most urgent first
  const attention: Attention[] = [
    { label: 'Privacy requests overdue', count: d.privacy.overdue_requests, href: '/admin/privacy', urgent: true, pulse: true, icon: <IconClock /> },
    { label: 'Data incidents open', count: d.privacy.open_incidents, href: '/admin/privacy?tab=incidents', urgent: true, icon: <IconAlert /> },
    { label: 'Reports waiting for a decision', count: d.reports.pending, href: '/admin/reports', urgent: false, icon: <IconFlag /> },
    { label: 'Listings flagged for prohibited words', count: d.listings.flagged, href: '/admin/listings?filter=flagged', urgent: false, icon: <IconTag /> },
    { label: 'Privacy requests open', count: d.privacy.open_requests - d.privacy.overdue_requests, href: '/admin/privacy', urgent: false, icon: <IconLock /> },
  ].filter((item) => item.count > 0);

  const waiting = attention.reduce((sum, item) => sum + item.count, 0);
  const summary =
    waiting === 0
      ? 'All clear today. Nothing is waiting for you.'
      : `${waiting} ${waiting === 1 ? 'thing needs' : 'things need'} you${attention.some((a) => a.urgent) ? ', some of them urgent' : ''}.`;

  const trend = (now: number, prev: number | undefined) => (prev === undefined ? undefined : { now, prev });

  return (
    <div className="space-y-8 motion-safe:animate-fade-in">
      {/* Greeting */}
      <section className="glass-card relative overflow-hidden rounded-2xl p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">{clock.date}</p>
            <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              {clock.greeting}{firstName ? `, ${firstName}` : ''} <span aria-hidden="true">👋</span>
            </h2>
            <p className={`mt-1 ${waiting === 0 ? 'text-emerald-300' : attention.some((a) => a.urgent) ? 'text-rose-300' : 'text-amber-300'}`}>
              {summary}
            </p>
          </div>
          <AutoRefresh renderedAt={clock.iso} />
        </div>

        {/* Quick actions */}
        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          <Link href="/admin/reports" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 transition-colors hover:border-amber-400/60 hover:text-white">
            <IconFlag className="h-4 w-4 text-amber-300" /> Review reports
            {d.reports.pending > 0 && <span className="rounded-full bg-amber-500/20 px-1.5 text-xs font-semibold text-amber-300">{d.reports.pending}</span>}
          </Link>
          <Link href="/admin/listings?filter=flagged" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 transition-colors hover:border-rose-400/60 hover:text-white">
            <IconTag className="h-4 w-4 text-rose-300" /> Check flagged listings
            {d.listings.flagged > 0 && <span className="rounded-full bg-rose-500/20 px-1.5 text-xs font-semibold text-rose-300">{d.listings.flagged}</span>}
          </Link>
          <form action="/admin/users" method="get" role="search" className="flex min-w-0 flex-1 basis-56 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 focus-within:border-emerald-400/60">
            <IconSearch className="h-4 w-4 shrink-0 text-emerald-300" />
            <label htmlFor="admin-find-user" className="sr-only">Find a user by name or email</label>
            <input
              id="admin-find-user"
              name="q"
              type="search"
              placeholder="Find a user by name or email"
              className="min-w-0 flex-1 bg-transparent py-0.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </form>
        </div>
      </section>

      {/* Needs attention */}
      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="mb-3 text-lg font-semibold text-white">Needs attention</h2>
        {attention.length === 0 ? (
          <div className="glass-card flex items-center gap-4 rounded-xl border-l-4 border-l-emerald-400 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
              <IconCheckCircle className="h-6 w-6" />
            </span>
            <div>
              <p className="font-semibold text-emerald-200">All clear <span aria-hidden="true">🎉</span></p>
              <p className="text-sm text-slate-400">No reports, flags or privacy requests are waiting. Nice work.</p>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {attention.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`glass-card group flex items-center gap-3 rounded-xl border-l-4 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-600 motion-reduce:hover:translate-y-0 ${
                    item.urgent ? 'border-l-rose-500' : 'border-l-amber-400'
                  }`}
                >
                  <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.urgent ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>
                    {item.icon}
                    {item.pulse && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5" aria-hidden="true">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 motion-safe:animate-ping" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                      </span>
                    )}
                  </span>
                  <span className="flex-1 text-slate-200">{item.label}</span>
                  <span className={`text-2xl font-bold ${item.urgent ? 'text-rose-300' : 'text-amber-300'}`}>{item.count}</span>
                  <IconArrowRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="people-heading">
        <h2 id="people-heading" className="mb-3 text-lg font-semibold text-white">People</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Students" value={d.users.total} href="/admin/users" icon={<IconUsers />} accent="sky" />
          <Stat label="New this week" value={d.users.new_7d} href="/admin/users?filter=new" icon={<IconUserPlus />} accent="emerald" trend={trend(d.users.new_7d, d.users.new_prev_7d)} />
          <Stat label="Banned" value={d.users.banned} href="/admin/users?filter=banned" icon={<IconBan />} accent="rose" tone={d.users.banned > 0 ? 'text-rose-300' : 'text-white'} />
          <Stat label="Admins" value={d.users.admins} href="/admin/users?filter=admins" icon={<IconShield />} accent="violet" />
        </div>
      </section>

      <section aria-labelledby="market-heading">
        <h2 id="market-heading" className="mb-3 text-lg font-semibold text-white">Marketplace</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="Active listings" value={d.listings.active} href="/admin/listings?filter=active" icon={<IconTag />} accent="emerald" hint={`${d.listings.new_7d} posted this week`} trend={trend(d.listings.new_7d, d.listings.new_prev_7d)} />
          <Stat label="Sold" value={d.listings.sold} href="/admin/listings?filter=sold" icon={<IconCheckCircle />} accent="teal" />
          <Stat label="Removed" value={d.listings.removed} href="/admin/listings?filter=removed" icon={<IconTrash />} accent="slate" />
          <Stat label="Offers waiting" value={d.offers.pending} icon={<IconHandCoins />} accent="amber" hint={`${d.offers.total} offers in total`} />
          <Stat label="Messages today" value={d.messages.last_24h} icon={<IconChat />} accent="indigo" hint={`${d.messages.total} in total`} />
          <Stat label="Offers this week" value={d.offers.new_7d} icon={<IconTrendUp />} accent="sky" trend={trend(d.offers.new_7d, d.offers.new_prev_7d)} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section aria-labelledby="trend-heading" className="glass-card rounded-xl p-5 lg:col-span-3">
          <h2 id="trend-heading" className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <IconSparkles className="h-5 w-5 text-emerald-300" /> Last 14 days
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <MiniBars data={d.signups_by_day} label="New students per day" accent="sky" />
            <MiniBars data={d.listings_by_day} label="New listings per day" accent="emerald" />
          </div>
        </section>

        <section aria-labelledby="recent-heading" className="glass-card flex flex-col rounded-xl p-5 lg:col-span-2">
          <h2 id="recent-heading" className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <IconActivity className="h-5 w-5 text-violet-300" /> Recent activity
          </h2>
          {recent.length === 0 ? (
            <p className="flex-1 text-sm text-slate-400">No admin actions yet. Bans, removed listings and other decisions will show up here.</p>
          ) : (
            <ol className="relative flex-1 space-y-4 border-l border-slate-800 pl-5">
              {recent.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-violet-400" aria-hidden="true" />
                  <p className="text-slate-200">
                    <span className="font-medium text-white">{e.admin?.name ?? 'An admin'}</span>
                    <span className="text-slate-400"> · {actionLabel(e.action)}</span>
                    {e.target_user_id && (
                      <>
                        <span className="text-slate-400"> · </span>
                        <Link href={`/admin/users/${e.target_user_id}`} className="text-emerald-400 hover:underline">{e.target?.name ?? 'a student'}</Link>
                      </>
                    )}
                  </p>
                  <time dateTime={e.created_at} className="text-xs text-slate-500">{timeAgo(e.created_at, clock.now)}</time>
                </li>
              ))}
            </ol>
          )}
          <Link href="/admin/activity" className="mt-4 inline-flex items-center gap-1 self-start text-sm font-medium text-emerald-400 hover:text-emerald-300">
            See all activity <IconArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
