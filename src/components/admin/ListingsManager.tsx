'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { errorMessage, formatPrice } from '@/lib/utils';
import { PAGE_SIZE, formatDate } from '@/lib/admin';
import { FilterChips, Pager } from '@/components/admin/ui';

type Filter = 'all' | 'active' | 'flagged' | 'sold' | 'removed' | 'expired';

type ListingRow = {
  id: string;
  title: string;
  seller_id: string;
  seller_name: string | null;
  asking_price: number | string;
  category: string;
  status: 'active' | 'sold' | 'removed';
  removed_reason: 'seller' | 'admin' | 'banned' | 'expired' | null;
  flagged: boolean;
  created_at: string;
  offers: number;
  total_count: number;
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'sold', label: 'Sold' },
  { value: 'removed', label: 'Removed' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_BADGE = { active: 'badge-success', sold: 'badge-info', removed: 'badge-danger' } as const;
const REASON_LABEL = { seller: 'by seller', admin: 'by a moderator', banned: 'seller banned', expired: 'expired' } as const;

export default function ListingsManager({ initialFilter, initialQuery }: { initialFilter: Filter; initialQuery: string }) {
  const { showToast } = useToast();
  const [supabase] = useState(() => createClient());
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc('admin_list_listings', {
        p_search: query.trim(),
        p_filter: filter,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (id !== requestId.current) return;
      if (rpcError) {
        setError(errorMessage(rpcError, "Couldn't load listings."));
      } else {
        const list = (data as ListingRow[] | null) ?? [];
        setRows(list);
        setTotal(list.length > 0 ? Number(list[0].total_count) : 0);
        setError(null);
      }
      setLoading(false);
    }, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [supabase, query, filter, page, reloadKey]);

  const act = useCallback(
    async (row: ListingRow, kind: 'remove' | 'restore' | 'clear') => {
      let reason: string | null = null;
      if (kind === 'remove') {
        reason = window.prompt(`Why are you taking down "${row.title}"? This is saved in the activity log.`);
        if (reason === null) return;
        if (!reason.trim()) {
          showToast('A reason is needed to remove a listing', 'error');
          return;
        }
      } else if (kind === 'restore') {
        if (!window.confirm(`Put "${row.title}" back up? The seller will be told.`)) return;
        reason = window.prompt('Reason (optional, saved in the activity log)') ?? '';
      } else if (!window.confirm('Mark this listing as fine and clear its flag?')) {
        return;
      }

      setBusy(row.id);
      try {
        const { error: rpcError } =
          kind === 'remove'
            ? await supabase.rpc('admin_remove_listing', { target_listing: row.id, reason })
            : kind === 'restore'
              ? await supabase.rpc('admin_restore_listing', { p_listing: row.id, p_reason: reason?.trim() || null })
              : await supabase.rpc('admin_clear_flag', { target_listing: row.id });
        if (rpcError) throw rpcError;
        showToast(kind === 'remove' ? 'Listing removed' : kind === 'restore' ? 'Listing restored' : 'Flag cleared', 'success');
        setReloadKey((k) => k + 1);
      } catch (err) {
        showToast(errorMessage(err, "That didn't work. Please try again."), 'error');
      } finally {
        setBusy(null);
      }
    },
    [supabase, showToast]
  );

  return (
    <section aria-label="Listings">
      <div className="mb-5 flex flex-col gap-4">
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          placeholder="Search by title or seller"
          aria-label="Search listings"
          className="input-field w-full sm:max-w-md"
        />
        <FilterChips options={FILTERS} value={filter} onChange={(f) => { setFilter(f); setPage(0); }} />
      </div>

      {error ? (
        <p className="glass-card p-8 text-center text-red-300" role="alert">{error}</p>
      ) : (
        <div className={`glass-card overflow-x-auto rounded-lg ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Seller</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Offers</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Posted</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.length === 0 && !loading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No listings match.</td></tr>
              )}
              {rows.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    {l.status === 'active' ? (
                      <Link href={`/listings/${l.id}`} className="font-medium text-slate-100 hover:underline">{l.title}</Link>
                    ) : (
                      <span className="font-medium text-slate-300">{l.title}</span>
                    )}
                    <div className="text-xs text-slate-500">{l.category}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${l.seller_id}`} className="text-slate-300 hover:underline">{l.seller_name ?? 'Deleted account'}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{formatPrice(Number(l.asking_price))}</td>
                  <td className="px-4 py-3 text-slate-400">{l.offers}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={STATUS_BADGE[l.status]}>{l.status}</span>
                      {l.removed_reason && <span className="text-xs text-slate-500">{REASON_LABEL[l.removed_reason]}</span>}
                      {l.flagged && l.status === 'active' && <span className="badge-warning">flagged</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(l.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {l.status === 'active' && l.flagged && (
                        <button type="button" disabled={busy !== null} onClick={() => act(l, 'clear')} className="btn-ghost border border-slate-700 px-2.5 py-1 text-xs hover:bg-slate-700">It&apos;s fine</button>
                      )}
                      {l.status === 'active' && (
                        <button type="button" disabled={busy !== null} onClick={() => act(l, 'remove')} className="btn-danger px-2.5 py-1 text-xs">Remove</button>
                      )}
                      {l.status === 'removed' && l.removed_reason === 'admin' && (
                        <button type="button" disabled={busy !== null} onClick={() => act(l, 'restore')} className="btn-secondary px-2.5 py-1 text-xs">Restore</button>
                      )}
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
