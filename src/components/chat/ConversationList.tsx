'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { errorMessage, formatPrice } from '@/lib/utils';
import { CHAT_READ_EVENT, chatTimeLabel, type Conversation } from '@/lib/chat';
import Avatar from './Avatar';

type Tab = 'all' | 'buying' | 'selling';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'buying', label: 'Buying' },
  { id: 'selling', label: 'Selling' },
];

export function Ticks({ seen, className = '' }: { seen: boolean; className?: string }) {
  return (
    <svg
      className={`inline-block h-4 w-4 shrink-0 ${seen ? 'text-sky-400' : 'text-slate-500'} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={seen ? 'Seen' : 'Sent'}
      role="img"
    >
      {seen ? (
        <>
          <path d="M2 13l4 4L16 7" />
          <path d="M10 15l2 2L22 7" />
        </>
      ) : (
        <path d="M5 13l4 4L19 7" />
      )}
    </svg>
  );
}

export default function ConversationList() {
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      // One row per conversation (listing + other person), newest first
      const { data, error } = await supabase.rpc('get_my_conversations');
      if (error) {
        console.error('Error fetching conversations:', error.message);
        setFetchError(error.message);
        return;
      }
      setFetchError(null);
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
  }, [supabase]);

  // Several events can arrive together (a message plus a read mark), so refresh once
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(fetchConversations, 300);
  }, [fetchConversations]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) {
        setLoading(false);
        return;
      }
      fetchConversations();

      // Live: new messages either way, and the other person reading your messages
      channel = supabase
        .channel(`chat-list:${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `recipient_id=eq.${user.id}` }, scheduleRefresh)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `sender_id=eq.${user.id}` }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reads', filter: `other_user_id=eq.${user.id}` }, scheduleRefresh)
        .subscribe();
    });

    window.addEventListener(CHAT_READ_EVENT, scheduleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(CHAT_READ_EVENT, scheduleRefresh);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, fetchConversations, scheduleRefresh]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((conv) => {
      if (tab === 'buying' && conv.i_am_seller !== false) return false;
      if (tab === 'selling' && conv.i_am_seller !== true) return false;
      if (!q) return true;
      return (
        conv.other_user_name.toLowerCase().includes(q) ||
        (conv.listing_title ?? '').toLowerCase().includes(q)
      );
    });
  }, [conversations, search, tab]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header, search and tabs */}
      <div className="border-b border-slate-800 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold text-white">Messages</h1>
          {totalUnread > 0 && (
            <span className="text-xs font-medium text-brand-400">{totalUnread} unread</span>
          )}
        </div>
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people or items"
            aria-label="Search chats"
            className="input-field pl-9 py-2 text-sm"
          />
        </div>
        <div className="flex gap-1.5" role="tablist" aria-label="Filter chats">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="divide-y divide-slate-800" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="skeleton h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="px-6 py-12 text-center">
            <h2 className="text-base font-medium text-white mb-2">Couldn&apos;t load your messages</h2>
            <p className="text-sm text-slate-400 mb-5">Something went wrong on our side.</p>
            <button type="button" onClick={() => { setLoading(true); fetchConversations(); }} className="btn-secondary">
              Try again
            </button>
            <p className="mt-4 text-xs text-slate-600">{fetchError}</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h8M8 14h5m-9 6l2.5-3H18a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z" />
              </svg>
            </div>
            <h2 className="text-base font-medium text-white mb-2">No messages yet</h2>
            <p className="text-sm text-slate-400 mb-5 max-w-xs mx-auto">
              When you make an offer or someone makes one on your item, you can chat with them here.
            </p>
            <Link href="/listings" className="btn-primary">
              Browse listings
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">
            {search.trim() ? `No chats match "${search.trim()}".` : tab === 'buying' ? "You haven't messaged any sellers yet." : 'No one has messaged you about your items yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/70">
            {visible.map((conv) => {
              const href = `/chat/${conv.listing_id}/${conv.other_user_id}`;
              const active = pathname === href;
              const unread = conv.unread_count > 0;
              return (
                <li key={`${conv.listing_id}_${conv.other_user_id}`}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      active ? 'bg-brand-500/10' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Person, with the item photo tucked in the corner */}
                    <div className="relative shrink-0">
                      <Avatar name={conv.other_user_name} photo={conv.other_user_photo} size="lg" />
                      {conv.listing_photo && (
                        <span className="absolute -bottom-1 -right-1 h-6 w-6 overflow-hidden rounded-md border-2 border-slate-900 bg-slate-700">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={conv.listing_photo} alt="" className="h-full w-full object-cover" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`truncate ${unread ? 'font-semibold text-white' : 'font-medium text-slate-100'}`}>
                          {conv.other_user_name}
                        </span>
                        <span className={`shrink-0 text-xs ${unread ? 'font-medium text-brand-400' : 'text-slate-500'}`}>
                          {chatTimeLabel(conv.last_message_time)}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="truncate">{conv.listing_title ?? 'Listing no longer available'}</span>
                        {conv.listing_price != null && (
                          <span className="shrink-0 text-slate-400">· {formatPrice(Number(conv.listing_price))}</span>
                        )}
                        {conv.listing_status === 'sold' && <span className="badge-neutral shrink-0 py-0 text-[10px]">Sold</span>}
                      </div>

                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className={`flex min-w-0 items-center gap-1 text-sm ${unread ? 'text-white' : 'text-slate-400'}`}>
                          {conv.last_message_mine && <Ticks seen={conv.last_message_seen} />}
                          <span className="truncate">{conv.last_message}</span>
                        </p>
                        {unread && (
                          <span
                            className="min-w-[20px] h-5 shrink-0 rounded-full bg-brand-500 px-1.5 text-[11px] font-semibold leading-5 text-white text-center"
                            aria-label={`${conv.unread_count} unread`}
                          >
                            {conv.unread_count > 99 ? '99+' : conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
