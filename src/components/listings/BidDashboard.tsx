'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { MIN_BID_PERCENTAGE } from '@/lib/constants';
import { errorMessage, formatPrice, timeAgo } from '@/lib/utils';

interface BidDashboardProps {
  listingId: string;
  askingPrice: number;
}

type Bid = {
  id: string;
  bid_amount: number;
  bid_attempts: number;
  status: 'pending' | 'selected' | 'backup' | 'rejected';
  created_at: string;
  bidder_id: string;
  bidder: { id: string; name: string; profile_photo_url: string | null; rating_avg: number | string | null } | null;
};

const STATUS_BADGES: Record<Bid['status'], { label: string; className: string }> = {
  pending: { label: 'Waiting', className: 'badge-warning' },
  selected: { label: 'Accepted', className: 'badge-success' },
  backup: { label: 'Backup buyer', className: 'badge-info' },
  rejected: { label: 'Not accepted', className: 'badge-neutral' },
};

export default function BidDashboard({ listingId, askingPrice }: BidDashboardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [supabase] = useState(() => createClient());
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const minThreshold = Math.ceil(Number(askingPrice) * MIN_BID_PERCENTAGE);

  const loadBids = useCallback(async () => {
    const { data, error } = await supabase
      .from('bids')
      .select('id, bid_amount, bid_attempts, status, created_at, bidder_id, bidder:profiles!bidder_id(id, name, profile_photo_url, rating_avg)')
      .eq('listing_id', listingId)
      .order('bid_amount', { ascending: false });

    if (error) {
      console.error('Error loading offers:', error.message);
      setLoadError(true);
    } else {
      setLoadError(false);
      setBids((data as unknown as Bid[]) ?? []);
    }
    setLoading(false);
  }, [supabase, listingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is only set after the query resolves
    loadBids();
  }, [loadBids]);

  const hasWinner = bids.some((b) => b.status === 'selected');
  const hasBackup = bids.some((b) => b.status === 'backup');

  const handleAccept = async (bid: Bid) => {
    const name = bid.bidder?.name ?? 'this buyer';
    if (!confirm(`Accept ${name}'s offer of ${formatPrice(Number(bid.bid_amount))}? The listing will be marked as sold.`)) return;

    setActionLoading(`accept-${bid.id}`);
    try {
      // Bids first, so a failure part-way doesn't leave the listing sold with no accepted offer
      const { error: winnerErr } = await supabase.from('bids').update({ status: 'selected' }).eq('id', bid.id);
      if (winnerErr) throw winnerErr;

      const { error: rejectErr } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('listing_id', listingId)
        .eq('status', 'pending')
        .neq('id', bid.id);
      if (rejectErr) throw rejectErr;

      const { error: listingErr } = await supabase
        .from('listings')
        .update({ status: 'sold', selected_bidder_id: bid.bidder_id })
        .eq('id', listingId);
      if (listingErr) throw listingErr;

      showToast(`Offer accepted. Chat with ${name} to arrange the meet-up.`, 'success');
      await loadBids();
      // The rest of the page (Sold banner, chat and rating buttons) comes from the server
      router.refresh();
    } catch (err) {
      showToast(errorMessage(err, "Couldn't accept the offer. Please try again."), 'error');
      await loadBids();
    } finally {
      setActionLoading(null);
    }
  };

  const handleBackup = async (bid: Bid) => {
    setActionLoading(`backup-${bid.id}`);
    try {
      const { error } = await supabase.from('listings').update({ backup_bidder_id: bid.bidder_id }).eq('id', listingId);
      if (error) throw error;
      const { error: bidErr } = await supabase.from('bids').update({ status: 'backup' }).eq('id', bid.id);
      if (bidErr) throw bidErr;
      showToast(`${bid.bidder?.name ?? 'Buyer'} is your backup buyer`, 'success');
      await loadBids();
    } catch (err) {
      showToast(errorMessage(err, "Couldn't set the backup buyer."), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <section className="glass-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Offers</h2>
          <p className="text-sm text-slate-400">
            {hasWinner
              ? 'You accepted an offer. You can pick a backup buyer in case it falls through.'
              : 'Accept the offer you like. Chat with buyers first if you have questions.'}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <div className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-1.5">
            <span className="block text-xs text-slate-400">Your price</span>
            <span className="font-semibold text-white">{formatPrice(Number(askingPrice))}</span>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-1.5">
            <span className="block text-xs text-slate-400">Lowest allowed</span>
            <span className="font-semibold text-brand-400">{formatPrice(minThreshold)}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 p-5" aria-busy="true">
          <div className="skeleton h-14 w-full" />
          <div className="skeleton h-14 w-full" />
        </div>
      ) : loadError ? (
        <div className="p-8 text-center">
          <p className="text-slate-400 mb-4">Couldn&apos;t load the offers.</p>
          <button type="button" onClick={() => { setLoading(true); loadBids(); }} className="btn-secondary">
            Try again
          </button>
        </div>
      ) : bids.length === 0 ? (
        <div className="p-10 text-center text-slate-400">
          No offers yet. You&apos;ll see them here as buyers send them.
        </div>
      ) : (
        <ul className="divide-y divide-slate-800">
          {bids.map((bid) => {
            const name = bid.bidder?.name ?? 'Student';
            const rating = Number(bid.bidder?.rating_avg ?? 0);
            const badge = STATUS_BADGES[bid.status] ?? STATUS_BADGES.pending;
            const canBackup = hasWinner && !hasBackup && (bid.status === 'pending' || bid.status === 'rejected');
            return (
              <li key={bid.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <Link href={`/profile/${bid.bidder_id}`} className="flex min-w-0 items-center gap-3 group">
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-white">
                    {bid.bidder?.profile_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bid.bidder.profile_photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-100 group-hover:underline">{name}</span>
                    <span className="block text-xs text-slate-500">
                      {rating > 0 ? `★ ${rating.toFixed(1)} · ` : ''}
                      {timeAgo(bid.created_at)}
                      {bid.bid_attempts > 1 ? ` · changed ${bid.bid_attempts - 1}×` : ''}
                    </span>
                  </span>
                </Link>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="mr-1 text-lg font-semibold text-white">{formatPrice(Number(bid.bid_amount))}</span>
                  <span className={badge.className}>{badge.label}</span>
                  <Link href={`/chat/${listingId}/${bid.bidder_id}`} className="btn-secondary px-3 py-1.5 text-sm">
                    Chat
                  </Link>
                  {!hasWinner && bid.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleAccept(bid)}
                      disabled={actionLoading !== null}
                      className="btn-primary px-3 py-1.5 text-sm"
                    >
                      {actionLoading === `accept-${bid.id}` ? 'Accepting...' : 'Accept'}
                    </button>
                  )}
                  {canBackup && (
                    <button
                      type="button"
                      onClick={() => handleBackup(bid)}
                      disabled={actionLoading !== null}
                      className="btn-secondary px-3 py-1.5 text-sm"
                    >
                      {actionLoading === `backup-${bid.id}` ? 'Saving...' : 'Make backup'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
