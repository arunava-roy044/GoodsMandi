'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/utils';

export default function DeleteListingButton({ listingId }: { listingId: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Soft delete: keeps offers and chats for both sides
      const { error } = await createClient().from('listings').update({ status: 'removed' }).eq('id', listingId);
      if (error) throw error;
      showToast('Listing removed', 'success');
      router.push('/listings/my');
      router.refresh();
    } catch (err) {
      showToast(errorMessage(err, "Couldn't remove the listing. Please try again."), 'error');
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-300">Remove this listing?</span>
        <button type="button" onClick={handleDelete} disabled={loading} className="btn-danger px-3 py-1.5 text-sm">
          {loading ? 'Removing...' : 'Yes, remove'}
        </button>
        <button type="button" onClick={() => setShowConfirm(false)} disabled={loading} className="btn-secondary px-3 py-1.5 text-sm">
          Keep it
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-500/20"
    >
      Remove listing
    </button>
  );
}
