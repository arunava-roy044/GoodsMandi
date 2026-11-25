'use client';

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { errorMessage, formatPrice } from '@/lib/utils';
import { CHAT_READ_EVENT, QUICK_REPLIES, dayLabel, isSameDay, messageTime } from '@/lib/chat';
import ReportModal from '@/components/reports/ReportModal';
import Avatar from '@/components/chat/Avatar';
import { Ticks } from '@/components/chat/ConversationList';

type Message = {
  id: string;
  message_text: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  state?: 'pending' | 'failed';
};

type ListingInfo = {
  title: string;
  photos: string[] | null;
  asking_price: number;
  status: 'active' | 'sold' | 'removed';
  seller_id: string;
};

type ReadRow = { user_id: string; listing_id: string; other_user_id: string; last_read_at: string };

const MESSAGE_MAX = 1000;
const GROUP_GAP_MS = 5 * 60 * 1000;
const SAFETY_KEY = 'gm.chat.safetyTipDismissed';
const MESSAGE_COLUMNS = 'id, message_text, sender_id, recipient_id, created_at';

// Add a message unless we already have it (our own sends arrive twice: insert result + realtime)
function withMessage(list: Message[], msg: Message): Message[] {
  if (list.some((m) => m.id === msg.id)) return list;
  return [...list, msg];
}

// Messages from the same person a few minutes apart are drawn as one group
function sameGroup(a: Message | undefined, b: Message | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.sender_id === b.sender_id &&
    isSameDay(a.created_at, b.created_at) &&
    Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < GROUP_GAP_MS
  );
}

function readSafetyDismissed(): boolean {
  try {
    return window.localStorage.getItem(SAFETY_KEY) === '1';
  } catch {
    return false;
  }
}

const noSubscribe = () => () => {};

// Timestamps come back in slightly different formats from queries and live updates
const ts = (iso: string) => new Date(iso).getTime();

export default function ChatThreadPage() {
  const params = useParams();
  const listingId = params.listingId as string;
  const recipientId = params.recipientId as string;

  const [supabase] = useState(() => createClient());
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<{ name: string | null; profile_photo_url: string | null } | null>(null);
  const [listing, setListing] = useState<ListingInfo | null>(null);
  const [theirLastRead, setTheirLastRead] = useState<string | null>(null);
  // Where you had read up to before opening this chat, for the "New messages" line
  const [myPreviousRead, setMyPreviousRead] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Hidden on the server, and on the client if it was dismissed before
  const safetyDismissedStored = useSyncExternalStore(noSubscribe, readSafetyDismissed, () => true);
  const [safetyDismissedNow, setSafetyDismissedNow] = useState(false);
  const showSafety = !safetyDismissedStored && !safetyDismissedNow;

  const scrollRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const didInitialScroll = useRef(false);

  const markRead = useCallback(async () => {
    const { error } = await supabase.rpc('mark_chat_read', { p_listing_id: listingId, p_other_user_id: recipientId });
    if (error) {
      console.error('Error marking chat read:', error.message);
      return;
    }
    // Refresh the chat list, the Chat badge and the notifications bell
    window.dispatchEvent(new Event(CHAT_READ_EVENT));
    window.dispatchEvent(new Event('notifications-read'));
  }, [supabase, listingId, recipientId]);

  // First open: jump to the "New messages" line if there is one, else the bottom.
  // After that: follow new messages if you're near the bottom, or if you sent it.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || loading) return;
    if (!didInitialScroll.current) {
      didInitialScroll.current = true;
      el.scrollTop = dividerRef.current ? Math.max(0, dividerRef.current.offsetTop - 80) : el.scrollHeight;
      return;
    }
    const last = messages[messages.length - 1];
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom || last?.sender_id === currentUserId) el.scrollTop = el.scrollHeight;
  }, [messages, loading, currentUserId]);

  // Grow the text box with its content, up to about five lines
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [newMessage]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        setCurrentUserId(user.id);

        if (user.id === recipientId) {
          setLoadError("You can't message yourself.");
          return;
        }

        const [recipientRes, listingRes, messagesRes, readsRes] = await Promise.all([
          supabase.from('profiles').select('name, profile_photo_url').eq('id', recipientId).maybeSingle(),
          supabase.from('listings').select('title, photos, asking_price, status, seller_id').eq('id', listingId).maybeSingle(),
          supabase
            .from('chat_messages')
            .select(MESSAGE_COLUMNS)
            .eq('listing_id', listingId)
            .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
            .order('created_at', { ascending: true }),
          supabase
            .from('chat_reads')
            .select('user_id, last_read_at')
            .eq('listing_id', listingId)
            .or(`and(user_id.eq.${user.id},other_user_id.eq.${recipientId}),and(user_id.eq.${recipientId},other_user_id.eq.${user.id})`),
        ]);
        if (cancelled) return;
        if (messagesRes.error) throw messagesRes.error;

        const reads = (readsRes.data ?? []) as Pick<ReadRow, 'user_id' | 'last_read_at'>[];
        const loaded = messagesRes.data ?? [];
        setRecipient(recipientRes.data ?? null);
        setListing((listingRes.data as ListingInfo | null) ?? null);
        setMessages(loaded);
        setMyPreviousRead(reads.find((r) => r.user_id === user.id)?.last_read_at ?? null);
        setTheirLastRead(reads.find((r) => r.user_id === recipientId)?.last_read_at ?? null);

        if (loaded.length > 0) markRead();

        channel = supabase
          .channel(`chat:${listingId}:${[user.id, recipientId].sort().join(':')}`)
          // New messages in this conversation, from either side
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `listing_id=eq.${listingId}` },
            (payload) => {
              const msg = payload.new as Message;
              const fromThem = msg.sender_id === recipientId && msg.recipient_id === user.id;
              const fromMe = msg.sender_id === user.id && msg.recipient_id === recipientId;
              if (!fromThem && !fromMe) return;
              setMessages((prev) => withMessage(prev, msg));
              if (fromThem && document.visibilityState === 'visible') markRead();
            }
          )
          // The other person opening this chat, for "Seen"
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'chat_reads', filter: `user_id=eq.${recipientId}` },
            (payload) => {
              const row = payload.new as Partial<ReadRow>;
              if (row.listing_id === listingId && row.other_user_id === user.id && row.last_read_at) {
                setTheirLastRead(row.last_read_at);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Error fetching chat thread:', errorMessage(err));
        if (!cancelled) setLoadError(errorMessage(err, "Couldn't load this chat."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [listingId, recipientId, supabase, markRead]);

  // Coming back to the tab counts as reading what arrived meanwhile
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && messages.some((m) => m.sender_id === recipientId)) markRead();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [markRead, messages, recipientId]);

  const deliver = async (text: string, tempId: string) => {
    if (!currentUserId) return;
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ listing_id: listingId, sender_id: currentUserId, recipient_id: recipientId, message_text: text })
      .select(MESSAGE_COLUMNS)
      .single();

    if (error || !data) {
      console.error('Error sending message:', errorMessage(error));
      // Keep it on screen, marked as not sent, so it can be retried
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, state: 'failed' } : m)));
      setSendError(
        error?.code === '42501'
          ? "You can't send messages in this chat. The listing may be gone, or this person hasn't made an offer or written to you yet."
          : "Message didn't send. Check your connection, then tap Retry."
      );
      return;
    }

    setMessages((prev) => withMessage(prev.filter((m) => m.id !== tempId), data));
  };

  const send = async () => {
    const text = newMessage.trim().slice(0, MESSAGE_MAX);
    if (!text || !currentUserId) return;

    // Show the message straight away; swap in the saved row when the insert returns
    const tempId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        message_text: text,
        sender_id: currentUserId,
        recipient_id: recipientId,
        created_at: new Date().toISOString(),
        state: 'pending',
      },
    ]);
    setNewMessage('');
    setSendError(null);
    inputRef.current?.focus();
    await deliver(text, tempId);
  };

  const retry = async (msg: Message) => {
    setSendError(null);
    setMessages((prev) => [
      ...prev.filter((m) => m.id !== msg.id),
      { ...msg, created_at: new Date().toISOString(), state: 'pending' },
    ]);
    await deliver(msg.message_text, msg.id);
  };

  const discard = (msg: Message) => {
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setSendError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter adds a new line
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const dismissSafety = () => {
    setSafetyDismissedNow(true);
    try {
      window.localStorage.setItem(SAFETY_KEY, '1');
    } catch {
      // Private browsing: the tip just shows again next time
    }
  };

  const displayName = recipient?.name || 'Student';
  const recipientPhoto = recipient?.profile_photo_url ?? null;
  const iAmSeller = !!listing && listing.seller_id === currentUserId;
  const listingPhoto = listing?.photos?.[0] ?? null;

  // First message from them that arrived after you last looked
  const firstUnreadIndex = myPreviousRead
    ? messages.findIndex((m) => m.sender_id === recipientId && !m.state && ts(m.created_at) > ts(myPreviousRead))
    : -1;

  const lastMessage = messages[messages.length - 1];
  const quickReplies = iAmSeller
    ? QUICK_REPLIES.seller.filter((reply) => listing?.status === 'sold' || !reply.includes('sold'))
    : QUICK_REPLIES.buyer;
  const showQuickReplies =
    !loading && !loadError && !newMessage && (!lastMessage || lastMessage.sender_id !== currentUserId);

  return (
    <div className="flex h-full flex-col overflow-hidden glass-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-3 py-2.5 sm:px-4">
        <Link href="/chat" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden" aria-label="Back to messages">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        {loading ? (
          <div className="flex flex-1 items-center gap-3">
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="skeleton h-4 w-32" />
          </div>
        ) : (
          <Link href={`/profile/${recipientId}`} className="group flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={displayName} photo={recipientPhoto} />
            <span className="min-w-0">
              <span className="block truncate font-medium text-white group-hover:underline">{displayName}</span>
              <span className="block truncate text-xs text-slate-500">
                {listing ? (iAmSeller ? 'Interested in your item' : 'Seller') : 'View profile'}
              </span>
            </span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="rounded-md px-2.5 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400"
        >
          Report
        </button>
      </div>

      {/* The item being discussed */}
      {!loading && !loadError && (
        listing ? (
          <Link
            href={`/listings/${listingId}`}
            className="flex items-center gap-3 border-b border-slate-800 bg-slate-950/40 px-3 py-2 transition-colors hover:bg-slate-800/40 sm:px-4"
          >
            <span className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-slate-700 bg-slate-800">
              {listingPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listingPhoto} alt="" className="h-full w-full object-cover" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-100">{listing.title}</span>
              <span className="block text-sm text-brand-400">{formatPrice(Number(listing.asking_price))}</span>
            </span>
            {listing.status === 'active' ? (
              <span className="badge-success shrink-0">Available</span>
            ) : listing.status === 'sold' ? (
              <span className="badge-neutral shrink-0">Sold</span>
            ) : (
              <span className="badge-danger shrink-0">Removed</span>
            )}
            <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <div className="border-b border-slate-800 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-500">
            This listing is no longer available.
          </div>
        )
      )}

      {/* Messages */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto bg-slate-950/40 px-3 py-4 sm:px-4">
        {showSafety && !loading && !loadError && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-200/90">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8 4v5c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V7l8-4z" />
            </svg>
            <p className="flex-1">Meet in a public spot on campus and check the item before you pay. Never pay in advance.</p>
            <button type="button" onClick={dismissSafety} className="shrink-0 rounded p-0.5 text-amber-300/70 hover:text-amber-200" aria-label="Dismiss safety tip">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-9 w-1/2" />
            <div className="skeleton h-9 w-2/5 ml-auto" />
            <div className="skeleton h-9 w-1/3" />
          </div>
        ) : loadError ? (
          <div className="h-full flex items-center justify-center text-center text-slate-400 px-6">{loadError}</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <Avatar name={displayName} photo={recipientPhoto} size="lg" />
            <p className="mt-3 text-slate-200">Say hi to {displayName}</p>
            <p className="mt-1 text-sm text-slate-500">Agree on a price, then a time and a place on campus to meet.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUserId;
            const previous = messages[index - 1];
            const next = messages[index + 1];
            const newDay = !previous || !isSameDay(previous.created_at, msg.created_at);
            const showDivider = index === firstUnreadIndex && index > 0;
            const startsGroup = newDay || showDivider || !sameGroup(previous, msg);
            const endsGroup = !sameGroup(msg, next) || index + 1 === firstUnreadIndex;
            const seen = isMe && !msg.state && !!theirLastRead && ts(theirLastRead) >= ts(msg.created_at);

            // Squared-off corners join a group's bubbles; the last one gets the little tail
            const corners = isMe
              ? `rounded-2xl ${startsGroup ? '' : 'rounded-tr-md'} ${endsGroup ? 'rounded-br-sm' : 'rounded-br-md'}`
              : `rounded-2xl ${startsGroup ? '' : 'rounded-tl-md'} ${endsGroup ? 'rounded-bl-sm' : 'rounded-bl-md'}`;

            return (
              <Fragment key={msg.id}>
                {newDay && (
                  <div className="flex justify-center py-2">
                    <span className="rounded-full bg-slate-800 px-3 py-0.5 text-xs text-slate-400">{dayLabel(msg.created_at)}</span>
                  </div>
                )}
                {showDivider && (
                  <div ref={dividerRef} className="my-3 flex items-center gap-3" role="separator">
                    <span className="h-px flex-1 bg-brand-500/30" />
                    <span className="text-xs font-medium text-brand-400">New messages</span>
                    <span className="h-px flex-1 bg-brand-500/30" />
                  </div>
                )}
                <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} ${startsGroup ? 'mt-3' : 'mt-0.5'}`}>
                  {!isMe && (
                    <span className="w-7 shrink-0">
                      {endsGroup && <Avatar name={displayName} photo={recipientPhoto} size="sm" />}
                    </span>
                  )}
                  <div className={`flex max-w-[80%] flex-col sm:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`${corners} px-3.5 py-2 shadow-sm ${
                        isMe
                          ? msg.state === 'failed'
                            ? 'border border-red-500/40 bg-red-900/40 text-red-100'
                            : 'bg-brand-700 text-white'
                          : 'bg-slate-800 text-slate-100'
                      } ${msg.state === 'pending' ? 'opacity-70' : ''}`}
                    >
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{msg.message_text}</p>
                      <p className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] ${isMe ? 'text-brand-100/70' : 'text-slate-400'}`}>
                        {msg.state === 'pending' ? (
                          'Sending...'
                        ) : msg.state === 'failed' ? (
                          <span className="text-red-300">Not sent</span>
                        ) : (
                          <>
                            {messageTime(msg.created_at)}
                            {isMe && <Ticks seen={seen} className={seen ? '' : '!text-brand-100/60'} />}
                          </>
                        )}
                      </p>
                    </div>
                    {msg.state === 'failed' && (
                      <div className="mt-1 flex gap-3 text-xs">
                        <button type="button" onClick={() => retry(msg)} className="font-medium text-brand-400 hover:text-brand-300">
                          Retry
                        </button>
                        <button type="button" onClick={() => discard(msg)} className="text-slate-500 hover:text-slate-300">
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Fragment>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-800 px-3 py-3 sm:px-4">
        {sendError && <p className="mb-2 text-sm text-red-400" role="alert">{sendError}</p>}
        {showQuickReplies && (
          <div className="no-scrollbar -mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-0.5" aria-label="Quick replies">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => {
                  setNewMessage(reply);
                  inputRef.current?.focus();
                }}
                className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-brand-500/60 hover:text-white"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={newMessage}
            maxLength={MESSAGE_MAX}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={loadError ? '' : 'Write a message'}
            aria-label="Message"
            disabled={loading || !!loadError}
            className="input-field flex-1 resize-none rounded-2xl leading-snug"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || loading || !!loadError}
            className="btn-primary flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full p-0"
            aria-label="Send message"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
        {newMessage.length > MESSAGE_MAX - 200 && (
          <p className="mt-1 text-right text-xs text-slate-500">{newMessage.length}/{MESSAGE_MAX}</p>
        )}
      </div>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportedUserId={recipientId}
        reportedListingId={listingId}
      />
    </div>
  );
}
