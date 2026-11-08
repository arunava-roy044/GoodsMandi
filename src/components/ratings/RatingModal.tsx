'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/utils';

type RatingModalProps = {
  listingId: string;
  ratedUserId: string;
  ratedUserName: string;
  isOpen: boolean;
  onClose: () => void;
  onRated?: (value: number) => void;
};

const LABELS = ['', 'Bad', 'Poor', 'Okay', 'Good', 'Great'];

export default function RatingModal({ listingId, ratedUserId, ratedUserName, isOpen, onClose, onRated }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Pick a number of stars.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Log in to leave a rating.');

      const { error: dbError } = await supabase.from('ratings').insert({
        rater_id: user.id,
        rated_user_id: ratedUserId,
        listing_id: listingId,
        rating_value: rating,
      });

      if (dbError) {
        if (dbError.code === '23505') throw new Error('You already rated this trade.');
        throw dbError;
      }
      onRated?.(rating);
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Couldn't save your rating. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const shown = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="rating-title">
      <div className="absolute inset-0 bg-black/70" onClick={() => !isSubmitting && onClose()} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl text-center">
        <h3 id="rating-title" className="text-lg font-semibold text-white mb-1">Rate {ratedUserName}</h3>
        <p className="text-sm text-slate-400 mb-5">How was trading with them? Ratings can&apos;t be changed later.</p>

        <div className="flex justify-center gap-1 mb-2" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onClick={() => setRating(star)}
              className="p-1"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              aria-pressed={rating === star}
            >
              <svg
                className={`w-9 h-9 transition-colors ${shown >= star ? 'text-amber-400' : 'text-slate-600'}`}
                fill={shown >= star ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          ))}
        </div>
        <p className="h-5 text-sm text-slate-300 mb-4">{LABELS[shown]}</p>

        {error && <p className="mb-3 text-sm text-red-400" role="alert">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1" disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={rating === 0 || isSubmitting} className="btn-primary flex-1">
            {isSubmitting ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
