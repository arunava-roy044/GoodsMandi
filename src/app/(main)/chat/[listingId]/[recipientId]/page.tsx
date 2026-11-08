'use client';

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/utils';
import { dayLabel, isSameDay, messageTime } from '@/lib/chat';
import ReportModal from '@/components/reports/ReportModal';

type Message = {
  id: string;
  message_text: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  pending?: boolean;
};

const MESSAGE_MAX = 1000;

// Add a message unless we already have it (our own sends arrive twice: insert result + realtime)
function withMessage(list: Message[], msg: Message): Message[] {
  if (list.some((m) => m.id === msg.id)) return list;
  return [...list, msg];
}

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
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest message in view. Scrolls only the message pane, not the whole page.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

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

        const [recipientRes, listingRes, messagesRes] = await Promise.all([
          supabase.from('profiles').select('name').eq('id', recipientId).maybeSingle(),
          supabase.from('listings').select('title').eq('id', listingId).maybeSingle(),
          supabase
            .from('chat_messages')
            .select('id, message_text, sender_id, recipient_id, created_at')
            .eq('listing_id', listingId)
            .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
            .order('created_at', { ascending: true }),
        ]);
        if (cancelled) return;
        if (messagesRes.error) throw messagesRes.error;

        setRecipientName(recipientRes.data?.name ?? null);
        setListingTitle(listingRes.data?.title ?? null);
        setMessages(messagesRes.data ?? []);

        // New messages in this conversation, from either side
        channel = supabase
          .channel(`chat:${listingId}:${[user.id, recipientId].sort().join(':')}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `listing_id=eq.${listingId}` },
            (payload) => {
              const msg = payload.new as Message;
              const inThisChat =
                (msg.sender_id === user.id && msg.recipient_id === recipientId) ||
                (msg.sender_id === recipientId && msg.recipient_id === user.id);
              if (inThisChat) setMessages((prev) => withMessage(prev, msg));
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
  }, [listingId, recipientId, supabase]);

  const send = async () => {
    const text = newMessage.trim();
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
        pending: true,
      },
    ]);
    setNewMessage('');
    setSendError(null);
    inputRef.current?.focus();

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ listing_id: listingId, sender_id: currentUserId, recipient_id: recipientId, message_text: text })
      .select('id, message_text, sender_id, recipient_id, created_at')
      .single();

    if (error || !data) {
      console.error('Error sending message:', errorMessage(error));
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      // Give the text back so nothing typed is lost
      setNewMessage((current) => current || text);
      setSendError(
        error?.code === '42501'
          ? "You can't send messages in this chat. The listing may be gone, or this person hasn't made an offer or written to you yet."
          : "Message didn't send. Check your connection and try again."
      );
      return;
    }

    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== tempId);
      return withMessage(withoutTemp, data);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter adds a new line
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const displayName = recipientName ?? 'Student';

  return (
    // Fill the screen below the navbar (4rem) minus the page padding (4rem)
    <div className="max-w-3xl mx-auto h-[calc(100dvh-8rem)] min-h-[420px] flex flex-col glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-3 py-3 sm:px-4">
        <Link href="/chat" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Back to messages">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${recipientId}`} className="block truncate font-medium text-white hover:underline">
            {loading ? ' ' : displayName}
          </Link>
          {listingTitle ? (
            <Link href={`/listings/${listingId}`} className="block truncate text-xs text-brand-400 hover:text-brand-300">
              {listingTitle}
            </Link>
          ) : (
            !loading && <span className="block truncate text-xs text-slate-500">Listing no longer available</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="rounded-md px-2.5 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400"
        >
          Report
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 space-y-1.5 bg-slate-950/40">
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-9 w-1/2" />
            <div className="skeleton h-9 w-2/5 ml-auto" />
            <div className="skeleton h-9 w-1/3" />
          </div>
        ) : loadError ? (
          <div className="h-full flex items-center justify-center text-center text-slate-400 px-6">{loadError}</div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <p className="text-slate-300 mb-1">Say hi to {displayName}</p>
            <p className="text-sm text-slate-500">Agree on a time and a place on campus to meet.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUserId;
            const previous = messages[index - 1];
            const newDay = !previous || !isSameDay(previous.created_at, msg.created_at);
            const sameSenderAsPrevious = !newDay && previous?.sender_id === msg.sender_id;
            return (
              <Fragment key={msg.id}>
                {newDay && (
                  <div className="flex justify-center py-2">
                    <span className="rounded-full bg-slate-800 px-3 py-0.5 text-xs text-slate-400">{dayLabel(msg.created_at)}</span>
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${sameSenderAsPrevious ? '' : 'pt-1.5'}`}>
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 ${
                      isMe ? 'bg-brand-700 text-white rounded-br-md' : 'bg-slate-800 text-slate-100 rounded-bl-md'
                    } ${msg.pending ? 'opacity-70' : ''}`}
                  >
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{msg.message_text}</p>
                    <p className={`mt-0.5 text-right text-[11px] ${isMe ? 'text-brand-100/70' : 'text-slate-400'}`}>
                      {msg.pending ? 'Sending...' : messageTime(msg.created_at)}
                    </p>
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
            className="input-field flex-1 resize-none leading-snug"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || loading || !!loadError}
            className="btn-primary h-[42px] px-4"
            aria-label="Send message"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
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
