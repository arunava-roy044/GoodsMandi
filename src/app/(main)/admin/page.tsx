import Link from 'next/link';
import { getDashboard } from '@/lib/adminData';
import { MiniBars, Stat } from '@/components/admin/ui';

export default async function AdminOverviewPage() {
  const d = await getDashboard();

  if (!d) {
    return (
      <div className="glass-card p-8 text-center text-slate-400">
        Couldn&apos;t load the overview. Refresh the page, and check the database migrations have been applied.
      </div>
    );
  }

  // Things that need someone to do something, most urgent first
  const attention: { label: string; count: number; href: string; tone: string }[] = [
    { label: 'Privacy requests overdue', count: d.privacy.overdue_requests, href: '/admin/privacy', tone: 'text-red-300' },
    { label: 'Data incidents open', count: d.privacy.open_incidents, href: '/admin/privacy?tab=incidents', tone: 'text-red-300' },
    { label: 'Reports waiting for a decision', count: d.reports.pending, href: '/admin/reports', tone: 'text-amber-300' },
    { label: 'Listings flagged for prohibited words', count: d.listings.flagged, href: '/admin/listings?filter=flagged', tone: 'text-amber-300' },
    { label: 'Privacy requests open', count: d.privacy.open_requests - d.privacy.overdue_requests, href: '/admin/privacy', tone: 'text-amber-300' },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-8">
      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="mb-3 text-lg font-semibold text-white">Needs attention</h2>
        {attention.length === 0 ? (
          <p className="glass-card rounded-lg p-5 text-slate-400">All clear. Nothing is waiting for you.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {attention.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="glass-card flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:border-slate-600">
                  <span className="text-slate-200">{item.label}</span>
                  <span className={`text-xl font-bold ${item.tone}`}>{item.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="people-heading">
        <h2 id="people-heading" className="mb-3 text-lg font-semibold text-white">People</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Students" value={d.users.total} hint={`${d.users.new_7d} joined this week`} href="/admin/users" />
          <Stat label="New this week" value={d.users.new_7d} href="/admin/users?filter=new" />
          <Stat label="Banned" value={d.users.banned} href="/admin/users?filter=banned" tone={d.users.banned > 0 ? 'text-red-300' : 'text-white'} />
          <Stat label="Admins" value={d.users.admins} href="/admin/users?filter=admins" />
        </div>
      </section>

      <section aria-labelledby="market-heading">
        <h2 id="market-heading" className="mb-3 text-lg font-semibold text-white">Marketplace</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Active listings" value={d.listings.active} hint={`${d.listings.new_7d} posted this week`} href="/admin/listings?filter=active" />
          <Stat label="Sold" value={d.listings.sold} href="/admin/listings?filter=sold" />
          <Stat label="Removed" value={d.listings.removed} href="/admin/listings?filter=removed" />
          <Stat label="Offers waiting" value={d.offers.pending} hint={`${d.offers.total} offers in total`} />
          <Stat label="Messages today" value={d.messages.last_24h} hint={`${d.messages.total} in total`} />
          <Stat label="Offers this week" value={d.offers.new_7d} />
        </div>
      </section>

      <section aria-labelledby="trend-heading" className="glass-card rounded-lg p-5">
        <h2 id="trend-heading" className="mb-4 text-lg font-semibold text-white">Last 14 days</h2>
        <div className="grid gap-8 md:grid-cols-2">
          <MiniBars data={d.signups_by_day} label="New students per day" />
          <MiniBars data={d.listings_by_day} label="New listings per day" />
        </div>
      </section>
    </div>
  );
}
