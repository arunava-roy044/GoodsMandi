'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { errorMessage, timeAgo } from '@/lib/utils';
import { notificationHref, notificationText, type AppNotification } from '@/lib/notifications';

const PAGE_SIZE = 50;

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, kind, listing_id, actor_id, read_at, created_at, actor:profiles!actor_id(name), listing:listings(title)')
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);
        if (error) throw error;
        setItems((data as unknown as AppNotification[]) ?? []);

        // Seen now: clear the badge. The list keeps showing which ones were new.
        if ((data ?? []).some((n) => !n.read_at)) {
          await supabase.rpc('mark_notifications_read');
          // Tell the navbar to clear its badge now
          window.dispatchEvent(new Event('notifications-read'));
        }
      } catch (err) {
        setFetchError(errorMessage(err, 'An unexpected error occurred'));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1">Notifications</h1>
        <p className="text-sm text-slate-400">Offers, sales, messages and account updates.</p>
      </div>

      {loading ? (
        <div className="glass-card divide-y divide-slate-800" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 p-4">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/4" />
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div className="glass-card px-6 py-12 text-center">
          <h2 className="text-lg font-medium text-white mb-2">Couldn&apos;t load your notifications</h2>
          <button type="button" onClick={() => window.location.reload()} className="btn-secondary mt-3">
            Refresh
          </button>
          <p className="mt-4 text-xs text-slate-600">{fetchError}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card px-6 py-12 text-center">
          <h2 className="text-lg font-medium text-white mb-2">Nothing yet</h2>
          <p className="text-slate-400 max-w-sm mx-auto">
            You&apos;ll see offers on your items, accepted offers and new messages here.
          </p>
        </div>
      ) : (
        <ul className="glass-card divide-y divide-slate-800 overflow-hidden">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={notificationHref(n)}
                className="flex items-start gap-3 p-4 hover:bg-slate-800/50 transition-colors"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-emerald-400'}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${n.read_at ? 'text-slate-300' : 'text-white font-medium'}`}>
                    {notificationText(n)}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {!n.read_at && <span className="sr-only">New. </span>}
                    {timeAgo(n.created_at)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
