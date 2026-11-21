'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { errorMessage, formatPrice } from '@/lib/utils';
import { actionLabel, formatDate, formatDateTime } from '@/lib/admin';

type Detail = {
  profile: {
    id: string; name: string; email: string; year_of_study: number | null; branch_course: string | null;
    profile_photo_url: string | null; created_at: string; last_sign_in_at: string | null;
    banned: boolean; warning_count: number; is_admin: boolean; rating_avg: number | string | null; total_items_sold: number;
  };
  counts: {
    active_listings: number; sold_listings: number; removed_listings: number; offers_made: number;
    messages_sent: number; reports_against: number; reports_made: number;
  };
  consent: { notice_version: string; accepted_at: string } | null;
  listings: { id: string; title: string; status: string; removed_reason: string | null; flagged: boolean; asking_price: number; created_at: string }[];
  reports_against: { id: string; category: string; status: string; description: string; created_at: string; reporter_name: string | null }[];
  admin_history: { id: string; action: string; reason: string | null; created_at: string; admin_name: string | null }[];
};

const LISTING_BADGE: Record<string, string> = { active: 'badge-success', sold: 'badge-info', removed: 'badge-danger' };
const REPORT_BADGE: Record<string, string> = { pending: 'badge-warning', confirmed: 'badge-danger', dismissed: 'badge-neutral' };

export default function UserDetail({ id }: { id: string }) {
  const { showToast } = useToast();
  const [supabase] = useState(() => createClient());
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('admin_get_user', { p_id: id });
    if (rpcError) setError(errorMessage(rpcError, "Couldn't load this user."));
    else setDetail(data as Detail);
  }, [supabase, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is only set after the query resolves
    load();
  }, [load]);

  const run = async (
    fn: 'admin_set_ban' | 'admin_reset_warnings' | 'admin_set_admin',
    args: Record<string, unknown>,
    confirmText: string,
    done: string,
    needsReason = false
  ) => {
    if (needsReason && !reason.trim()) {
      showToast('Write a reason first: it is saved in the activity log', 'error');
      return;
    }
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc(fn, { ...args, reason: reason.trim() || null });
      if (rpcError) throw rpcError;
      showToast(done, 'success');
      setReason('');
      await load();
    } catch (err) {
      showToast(errorMessage(err, "That didn't work. Please try again."), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="mb-4 text-red-300" role="alert">{error}</p>
        <Link href="/admin/users" className="btn-secondary">Back to users</Link>
      </div>
    );
  }
  if (!detail) {
    return <div className="glass-card skeleton h-64" aria-busy="true" />;
  }

  const { profile: p, counts: c } = detail;

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        All users
      </Link>

      <section className="glass-card rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-xl font-semibold text-white">
              {p.profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.profile_photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                p.name.charAt(0).toUpperCase()
              )}
            </span>
            <div>
              <h2 className="text-2xl font-semibold text-white">{p.name}</h2>
              <p className="text-sm text-slate-400">{p.email}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {p.year_of_study ? `Year ${p.year_of_study}` : 'Year not set'}{p.branch_course ? `, ${p.branch_course}` : ''} · joined {formatDate(p.created_at)} · last seen {formatDate(p.last_sign_in_at)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.is_admin && <span className="badge-info">Admin</span>}
            {p.banned && <span className="badge-danger">Banned</span>}
            {p.warning_count > 0 && <span className="badge-warning">{p.warning_count}/3 warnings</span>}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            ['Active listings', c.active_listings], ['Sold', c.sold_listings], ['Removed', c.removed_listings],
            ['Offers made', c.offers_made], ['Messages sent', c.messages_sent], ['Reports against', c.reports_against],
            ['Reports made', c.reports_made], ['Rating', Number(p.rating_avg ?? 0) > 0 ? Number(p.rating_avg).toFixed(1) : '—'],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-lg font-semibold text-slate-100">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          {detail.consent ? `Agreed to Privacy Notice ${detail.consent.notice_version} on ${formatDate(detail.consent.accepted_at)}.` : 'No consent record: this account was created before consent was recorded.'}
          {' '}<Link href={`/profile/${p.id}`} className="text-emerald-400 hover:underline">View public profile</Link>
        </p>
      </section>

      <section className="glass-card rounded-lg p-5" aria-labelledby="actions-heading">
        <h3 id="actions-heading" className="mb-3 text-lg font-semibold text-white">Actions</h3>
        <label htmlFor="reason" className="mb-1 block text-sm text-slate-400">Reason (saved in the activity log; needed to ban)</label>
        <input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className="input-field mb-4 w-full" placeholder="For example: confirmed no-show on three deals" disabled={busy} />
        <div className="flex flex-wrap gap-2">
          {p.banned ? (
            <button type="button" disabled={busy} className="btn-secondary" onClick={() => run('admin_set_ban', { target: p.id, ban: false }, `Lift the ban on ${p.name}? Their listings come back.`, 'Ban lifted')}>Lift ban</button>
          ) : (
            <button type="button" disabled={busy} className="btn-danger" onClick={() => run('admin_set_ban', { target: p.id, ban: true }, `Ban ${p.name}? Their listings are taken down and they can't list, offer, chat, rate or report.`, 'User banned', true)}>Ban user</button>
          )}
          {p.warning_count > 0 && (
            <button type="button" disabled={busy} className="btn-secondary" onClick={() => run('admin_reset_warnings', { target: p.id }, `Reset ${p.name}'s warnings to 0?`, 'Warnings reset')}>Reset warnings</button>
          )}
          {p.is_admin ? (
            <button type="button" disabled={busy} className="btn-ghost border border-slate-700" onClick={() => run('admin_set_admin', { target: p.id, make_admin: false }, `Take admin rights away from ${p.name}?`, 'Admin rights removed')}>Remove admin rights</button>
          ) : (
            <button type="button" disabled={busy} className="btn-ghost border border-slate-700" onClick={() => run('admin_set_admin', { target: p.id, make_admin: true }, `Make ${p.name} an admin? They will be able to see every student's email and moderate the whole site.`, `${p.name} is now an admin`)}>Make admin</button>
          )}
        </div>
      </section>

      <section className="glass-card overflow-x-auto rounded-lg" aria-labelledby="listings-heading">
        <h3 id="listings-heading" className="px-5 pt-5 text-lg font-semibold text-white">Listings</h3>
        {detail.listings.length === 0 ? (
          <p className="p-5 text-sm text-slate-400">No listings.</p>
        ) : (
          <table className="mt-3 w-full min-w-[560px] text-left text-sm">
            <tbody className="divide-y divide-slate-800">
              {detail.listings.map((l) => (
                <tr key={l.id}>
                  <td className="px-5 py-2.5 text-slate-200">
                    {l.status === 'active' ? <Link href={`/listings/${l.id}`} className="hover:underline">{l.title}</Link> : l.title}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">{formatPrice(Number(l.asking_price))}</td>
                  <td className="px-3 py-2.5">
                    <span className={LISTING_BADGE[l.status] ?? 'badge-neutral'}>{l.status}</span>
                    {l.removed_reason && <span className="ml-2 text-xs text-slate-500">({l.removed_reason})</span>}
                    {l.flagged && <span className="badge-warning ml-2">flagged</span>}
                  </td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{formatDate(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-card rounded-lg p-5" aria-labelledby="reports-heading">
          <h3 id="reports-heading" className="mb-3 text-lg font-semibold text-white">Reports against this person</h3>
          {detail.reports_against.length === 0 ? (
            <p className="text-sm text-slate-400">None.</p>
          ) : (
            <ul className="space-y-3">
              {detail.reports_against.map((r) => (
                <li key={r.id} className="rounded-md border border-slate-800 bg-slate-950/40 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-200">{r.category}</span>
                    <span className={REPORT_BADGE[r.status] ?? 'badge-neutral'}>{r.status}</span>
                    <span className="text-xs text-slate-500">by {r.reporter_name ?? 'a deleted account'} · {formatDate(r.created_at)}</span>
                  </div>
                  {r.description && <p className="mt-1.5 whitespace-pre-wrap text-slate-400">{r.description}</p>}
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/reports" className="mt-3 inline-block text-sm text-emerald-400 hover:underline">Open the reports queue</Link>
        </section>

        <section className="glass-card rounded-lg p-5" aria-labelledby="history-heading">
          <h3 id="history-heading" className="mb-3 text-lg font-semibold text-white">What admins did about this person</h3>
          {detail.admin_history.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing yet.</p>
          ) : (
            <ul className="space-y-3">
              {detail.admin_history.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="font-medium text-slate-200">{actionLabel(a.action)}</span>
                  <span className="text-slate-500"> · {a.admin_name ?? 'an admin'} · {formatDateTime(a.created_at)}</span>
                  {a.reason && <p className="text-slate-400">{a.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
