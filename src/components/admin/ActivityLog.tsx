'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/utils';
import { actionLabel, formatDateTime } from '@/lib/admin';
import { FilterChips, Pager } from '@/components/admin/ui';

type Group = 'all' | 'people' | 'listings' | 'privacy' | 'admins';

type Entry = {
  id: string;
  action: string;
  reason: string | null;
  created_at: string;
  target_user_id: string | null;
  target_listing_id: string | null;
  admin: { name: string } | null;
  target: { name: string } | null;
};

const PAGE = 50;

const GROUPS: { value: Group; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'people', label: 'Bans and warnings' },
  { value: 'listings', label: 'Listings' },
  { value: 'privacy', label: 'Privacy and incidents' },
  { value: 'admins', label: 'Admin rights' },
];

const ACTIONS: Record<Exclude<Group, 'all'>, string[]> = {
  people: ['ban', 'unban', 'reset_warnings'],
  listings: ['remove_listing', 'restore_listing', 'clear_flag'],
  privacy: ['privacy_request_open', 'privacy_request_in_progress', 'privacy_request_resolved', 'privacy_request_rejected', 'incident_logged', 'incident_updated'],
  admins: ['grant_admin', 'revoke_admin'],
};

export default function ActivityLog() {
  const [supabase] = useState(() => createClient());
  const [group, setGroup] = useState<Group>('all');
  const [page, setPage] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      let q = supabase
        .from('admin_actions')
        .select('id, action, reason, created_at, target_user_id, target_listing_id, admin:profiles!admin_id(name), target:profiles!target_user_id(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (group !== 'all') q = q.in('action', ACTIONS[group]);
      const { data, count, error: queryError } = await q;
      if (cancelled) return;
      if (queryError) {
        setError(errorMessage(queryError, "Couldn't load the activity log."));
      } else {
        setEntries((data as unknown as Entry[]) ?? []);
        setTotal(count ?? 0);
        setError(null);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [supabase, group, page]);

  return (
    <section aria-label="Activity">
      <h2 className="mb-1 text-2xl font-semibold text-slate-100">Activity</h2>
      <p className="mb-5 text-slate-400">Everything admins have done, newest first. This can&apos;t be edited.</p>
      <div className="mb-5">
        <FilterChips options={GROUPS} value={group} onChange={(g) => { setGroup(g); setPage(0); }} />
      </div>

      {error ? (
        <p className="glass-card p-8 text-center text-red-300" role="alert">{error}</p>
      ) : (
        <ul className={`glass-card divide-y divide-slate-800 rounded-lg ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {entries.length === 0 && !loading && <li className="p-8 text-center text-slate-400">Nothing here yet.</li>}
          {entries.map((e) => (
            <li key={e.id} className="px-5 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  <span className="font-medium text-slate-100">{e.admin?.name ?? 'An admin'}</span>
                  <span className="text-slate-400"> · {actionLabel(e.action)}</span>
                  {e.target_user_id && (
                    <span className="text-slate-400"> · <Link href={`/admin/users/${e.target_user_id}`} className="text-emerald-400 hover:underline">{e.target?.name ?? 'a student'}</Link></span>
                  )}
                </span>
                <span className="text-xs text-slate-500">{formatDateTime(e.created_at)}</span>
              </div>
              {e.reason && <p className="mt-0.5 text-slate-400">{e.reason}</p>}
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pageSize={PAGE} total={total} onPage={setPage} disabled={loading} />
    </section>
  );
}
