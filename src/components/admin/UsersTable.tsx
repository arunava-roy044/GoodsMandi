'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/utils';
import { PAGE_SIZE, formatDate } from '@/lib/admin';
import { FilterChips, Pager } from '@/components/admin/ui';

type Filter = 'all' | 'new' | 'warned' | 'banned' | 'admins';

type UserRow = {
  id: string;
  name: string;
  email: string;
  year_of_study: number | null;
  branch_course: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  warning_count: number;
  is_admin: boolean;
  rating_avg: number | string | null;
  active_listings: number;
  items_sold: number;
  offers_made: number;
  reports_against: number;
  total_count: number;
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'new', label: 'New this week' },
  { value: 'warned', label: 'Warned' },
  { value: 'banned', label: 'Banned' },
  { value: 'admins', label: 'Admins' },
];

export default function UsersTable({ initialFilter, initialQuery }: { initialFilter: Filter; initialQuery: string }) {
  const [supabase] = useState(() => createClient());
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    // Wait a moment while someone is still typing
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc('admin_list_users', {
        p_search: query.trim(),
        p_filter: filter,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (id !== requestId.current) return;
      if (rpcError) {
        setError(errorMessage(rpcError, "Couldn't load users."));
      } else {
        const list = (data as UserRow[] | null) ?? [];
        setRows(list);
        setTotal(list.length > 0 ? Number(list[0].total_count) : 0);
        setError(null);
      }
      setLoading(false);
    }, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [supabase, query, filter, page]);

  return (
    <section aria-label="Users">
      <div className="mb-5 flex flex-col gap-4">
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          placeholder="Search by name or college email"
          aria-label="Search users"
          className="input-field w-full sm:max-w-md"
        />
        <FilterChips options={FILTERS} value={filter} onChange={(f) => { setFilter(f); setPage(0); }} />
      </div>

      {error ? (
        <p className="glass-card p-8 text-center text-red-300" role="alert">{error}</p>
      ) : (
        <div className={`glass-card overflow-x-auto rounded-lg ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
                <th className="px-4 py-3 font-medium">Listings</th>
                <th className="px-4 py-3 font-medium">Offers</th>
                <th className="px-4 py-3 font-medium">Reports</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.length === 0 && !loading && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No one matches.</td></tr>
              )}
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-slate-100 hover:underline">{u.name}</Link>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{u.year_of_study ? `Year ${u.year_of_study}` : '—'}{u.branch_course ? `, ${u.branch_course}` : ''}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(u.last_sign_in_at)}</td>
                  <td className="px-4 py-3 text-slate-300">{u.active_listings} active, {u.items_sold} sold</td>
                  <td className="px-4 py-3 text-slate-300">{u.offers_made}</td>
                  <td className={`px-4 py-3 ${u.reports_against > 0 ? 'text-amber-300' : 'text-slate-400'}`}>{u.reports_against}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.is_admin && <span className="badge-info">Admin</span>}
                      {u.banned && <span className="badge-danger">Banned</span>}
                      {u.warning_count > 0 && <span className="badge-warning">{u.warning_count}/3 warnings</span>}
                      {!u.is_admin && !u.banned && u.warning_count === 0 && <span className="text-slate-600">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} disabled={loading} />
    </section>
  );
}
