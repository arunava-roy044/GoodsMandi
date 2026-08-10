'use client';

import { useState } from 'react';

interface BidModalProps {
  listing: {
    id: string;
    title: string;
    asking_price: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function BidModal({ listing, isOpen, onClose }: BidModalProps) {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minBid = Math.floor(listing.asking_price * 0.7);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = Number(bidAmount);

    if (isNaN(amount) || amount < minBid) {
      setError(`Minimum bid must be ₹${minBid} (70% of asking price)`);
      return;
    }

    setLoading(true);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        throw new Error('You must be logged in to place a bid');
      }

      // Check if user is banned
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', userData.user.id)
        .single();
        
      if (profile?.is_banned) {
        throw new Error('Your account is restricted from placing bids.');
      }

      const { error: bidError } = await supabase
        .from('bids')
        .insert({
          listing_id: listing.id,
          bidder_id: userData.user.id,
          bid_amount: amount,
          status: 'pending'
        });

      if (bidError) {
        if (bidError.code === '23505') {
          throw new Error('You have already placed a bid on this item.');
        }
        throw bidError;
      }

      // Success
      alert('Bid placed successfully!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to place bid');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-1">Place a Bid</h2>
          <p className="text-slate-400 text-sm mb-6">For: {listing.title}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Bid Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                <input
                  type="number"
                  required
                  min={minBid}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="input-field w-full pl-8 text-lg font-medium"
                  placeholder={minBid.toString()}
                  disabled={loading}
                />
              </div>
              <div className="flex justify-between items-center mt-2 text-xs">
                <span className="text-slate-500">Asking price: ₹{listing.asking_price}</span>
                <span className="text-emerald-400">Minimum bid: ₹{minBid}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading || !bidAmount}
              >
                {loading ? 'Placing Bid...' : 'Confirm Bid'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
