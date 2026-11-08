'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { MIN_BID_PERCENTAGE } from '@/lib/constants';
import { errorMessage, formatPrice } from '@/lib/utils';

interface BidModalProps {
  listing: {
    id: string;
    title: string;
    asking_price: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

const MAX_BID_ATTEMPTS = 3;

type ExistingBid = { id: string; bid_amount: number; bid_attempts: number; status: string };

export default function BidModal({ listing, isOpen, onClose }: BidModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingBid, setExistingBid] = useState<ExistingBid | null>(null);
  const [checkingBid, setCheckingBid] = useState(true);

  const askingPrice = Number(listing.asking_price);
  // Round up: the database rejects anything below exactly 70%, so 699.3 must become 700, not 699
  const minBid = Math.ceil(askingPrice * MIN_BID_PERCENTAGE);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      setCheckingBid(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: bid } = await supabase
          .from('bids')
          .select('id, bid_amount, bid_attempts, status')
          .eq('listing_id', listing.id)
          .eq('bidder_id', userData.user.id)
          .maybeSingle();

        if (cancelled) return;
        setExistingBid(bid);
        setBidAmount(bid ? String(Math.round(Number(bid.bid_amount))) : '');
      } catch {
        // Not critical: worst case they see the "new offer" form
      } finally {
        if (!cancelled) setCheckingBid(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, listing.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, loading, onClose]);

  const attemptsUsed = existingBid?.bid_attempts ?? 0;
  const attemptsRemaining = MAX_BID_ATTEMPTS - attemptsUsed;
  const isMaxedOut = attemptsUsed >= MAX_BID_ATTEMPTS;
  const isLocked = !!existingBid && existingBid.status !== 'pending';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = Number(bidAmount);

    if (!Number.isInteger(amount) || amount < minBid) {
      setError(`The lowest offer you can make is ${formatPrice(minBid)} (70% of the price).`);
      return;
    }
    if (existingBid && amount === Number(existingBid.bid_amount)) {
      setError('That is the same as your current offer.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Log in to make an offer.');

      const { data: profile } = await supabase.from('profiles').select('banned').eq('id', userData.user.id).single();
      if (profile?.banned) throw new Error('Your account is restricted from making offers.');

      if (existingBid) {
        // The database counts the attempt; we only send the new amount
        const { error: bidError } = await supabase.from('bids').update({ bid_amount: amount }).eq('id', existingBid.id);
        if (bidError) throw bidError;
      } else {
        const { error: bidError } = await supabase.from('bids').insert({
          listing_id: listing.id,
          bidder_id: userData.user.id,
          bid_amount: amount,
        });
        if (bidError) {
          if (bidError.code === '23505') throw new Error('You already made an offer here. Close this and open it again to change it.');
          throw bidError;
        }
      }

      showToast(existingBid ? 'Offer updated' : 'Offer sent to the seller', 'success');
      onClose();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Couldn't send your offer. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="offer-title">
      <div className="absolute inset-0 bg-black/70" onClick={() => !loading && onClose()} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h2 id="offer-title" className="text-lg font-semibold text-white mb-1">
          {existingBid ? 'Change your offer' : 'Make an offer'}
        </h2>
        <p className="text-sm text-slate-400 mb-5 truncate">{listing.title}</p>

        {checkingBid ? (
          <div className="space-y-3" aria-busy="true">
            <div className="skeleton h-11 w-full" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        ) : isLocked || isMaxedOut ? (
          <div className="space-y-4">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {isLocked
                ? `The seller has already responded to your offer of ${formatPrice(Number(existingBid?.bid_amount))}.`
                : `You've changed your offer ${MAX_BID_ATTEMPTS} times, which is the limit. Your offer of ${formatPrice(Number(existingBid?.bid_amount))} stands.`}
            </div>
            <button type="button" onClick={onClose} className="btn-secondary w-full">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="offer-amount" className="block text-sm font-medium text-slate-200 mb-2">
                {existingBid ? 'New amount' : 'Your offer'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                <input
                  id="offer-amount"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value.replace(/\D/g, '').slice(0, 7))}
                  className="input-field pl-7 text-lg font-medium"
                  placeholder={String(minBid)}
                  disabled={loading}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-slate-400">Price {formatPrice(askingPrice)}</span>
                <span className="text-brand-400">Lowest offer {formatPrice(minBid)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              {existingBid
                ? `You can change your offer ${attemptsRemaining} more time${attemptsRemaining === 1 ? '' : 's'}.`
                : `You can change your offer up to ${MAX_BID_ATTEMPTS - 1} times after sending it.`}
            </p>

            {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={loading || !bidAmount}>
                {loading ? 'Sending...' : existingBid ? 'Update offer' : 'Send offer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
