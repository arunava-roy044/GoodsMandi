'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/utils';
import { chatTimeLabel } from '@/lib/chat';

type Conversation = {
  listing_id: string;
  other_user_id: string;
  listing_title: string | null;
  other_user_name: string;
  other_user_photo: string | null;
  last_message: string;
  last_message_mine: boolean;
  last_message_time: string;
};

export default function ChatListPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchConversations() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // One row per conversation (listing + other person), newest first.
        // listing_title is null when the listing was sold to someone else or removed.
        const { data, error } = await supabase.rpc('get_my_conversations');

        if (error) {
          console.error('Error fetching conversations:', error.message);
          setFetchError(error.message);
          return;
        }

        setConversations(
          ((data as Conversation[] | null) ?? []).map((conv) => ({
            ...conv,
            other_user_name: conv.other_user_name || 'Student',
          }))
        );
      } catch (err) {
        console.error('Error fetching conversations:', errorMessage(err));
        setFetchError(errorMessage(err, 'An unexpected error occurred'));
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1">Messages</h1>
        <p className="text-sm text-slate-400">Your chats with buyers and sellers.</p>
      </div>

      {loading ? (
        <div className="glass-card divide-y divide-slate-800" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="skeleton h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div className="glass-card px-6 py-12 text-center">
          <h2 className="text-lg font-medium text-white mb-2">Couldn&apos;t load your messages</h2>
          <p className="text-slate-400 mb-5">Something went wrong on our side.</p>
          <button type="button" onClick={() => window.location.reload()} className="btn-secondary">
            Refresh
          </button>
          <p className="mt-4 text-xs text-slate-600">{fetchError}</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="glass-card px-6 py-12 text-center">
          <h2 className="text-lg font-medium text-white mb-2">No messages yet</h2>
          <p className="text-slate-400 mb-5 max-w-sm mx-auto">
            When you make an offer or someone makes one on your item, you can chat with them here.
          </p>
          <Link href="/listings" className="btn-primary">
            Browse listings
          </Link>
        </div>
      ) : (
        <ul className="glass-card divide-y divide-slate-800 overflow-hidden">
          {conversations.map((conv) => (
            <li key={`${conv.listing_id}_${conv.other_user_id}`}>
              <Link
                href={`/chat/${conv.listing_id}/${conv.other_user_id}`}
                className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors"
              >
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center">
                  {conv.other_user_photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={conv.other_user_photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-base font-medium text-slate-300">{conv.other_user_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium text-white">{conv.other_user_name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{chatTimeLabel(conv.last_message_time)}</span>
                  </div>
                  <p className="truncate text-xs text-slate-500 mt-0.5">
                    {conv.listing_title ?? 'Listing no longer available'}
                  </p>
                  <p className="truncate text-sm text-slate-300 mt-0.5">
                    {conv.last_message_mine && <span className="text-slate-500">You: </span>}
                    {conv.last_message}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
