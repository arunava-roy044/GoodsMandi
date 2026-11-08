'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { REPORT_CATEGORIES } from '@/lib/constants';
import { errorMessage } from '@/lib/utils';

type ReportModalProps = {
  reportedUserId: string;
  reportedListingId?: string;
  /** What is being reported, for the heading */
  subject?: 'user' | 'listing';
  isOpen: boolean;
  onClose: () => void;
};

const DESCRIPTION_MAX = 1000;

export default function ReportModal({ reportedUserId, reportedListingId, subject = 'user', isOpen, onClose }: ReportModalProps) {
  const [category, setCategory] = useState<string>(REPORT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Escape closes, and the page behind doesn't scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const close = () => {
    onClose();
    // Reset for the next time it opens
    setSuccess(false);
    setError(null);
    setDescription('');
    setCategory(REPORT_CATEGORIES[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Tell us briefly what happened.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Log in to send a report.');
      if (user.id === reportedUserId) throw new Error("You can't report yourself.");

      const { error: dbError } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        // The column is reported_listing_id; the old code wrote listing_id, so every report failed
        reported_listing_id: reportedListingId || null,
        category,
        description: description.trim(),
      });

      if (dbError) throw dbError;
      setSuccess(true);
    } catch (err) {
      setError(errorMessage(err, "Couldn't send the report. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="absolute inset-0 bg-black/70" onClick={() => !isSubmitting && close()} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {success ? (
          <div className="text-center py-4">
            <h3 id="report-title" className="text-lg font-semibold text-white mb-2">Report sent</h3>
            <p className="text-slate-400 mb-1">An admin will look at it soon.</p>
            <p className="text-xs text-slate-500 mb-6">False reports can lead to warnings on your own account.</p>
            <button type="button" onClick={close} className="btn-secondary w-full">Close</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 id="report-title" className="text-lg font-semibold text-white">
                Report this {subject}
              </h3>
              <button type="button" onClick={close} className="rounded p-1 text-slate-400 hover:text-white" aria-label="Close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset disabled={isSubmitting} className="space-y-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-slate-200">What&apos;s wrong?</span>
                  <div className="grid grid-cols-2 gap-2">
                    {REPORT_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        aria-pressed={category === cat}
                        className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                          category === cat
                            ? 'border-red-500/60 bg-red-500/10 text-white'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="report-details" className="text-sm font-medium text-slate-200">Details</label>
                  <textarea
                    id="report-details"
                    value={description}
                    maxLength={DESCRIPTION_MAX}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What happened, and when?"
                    className="input-field h-28 resize-none"
                  />
                </div>
              </fieldset>

              {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={close} className="btn-ghost flex-1" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-danger flex-1">
                  {isSubmitting ? 'Sending...' : 'Send report'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
