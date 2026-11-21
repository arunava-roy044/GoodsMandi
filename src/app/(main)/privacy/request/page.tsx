'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { errorMessage, timeAgo } from '@/lib/utils';
import {
  PRIVACY_REQUEST_KINDS,
  PRIVACY_REQUEST_STATUS_LABEL,
  REQUEST_RESPONSE_DAYS,
  SUPPORT_EMAIL,
  type PrivacyRequestKind,
  type PrivacyRequestStatus,
} from '@/lib/legal';

type MyRequest = {
  id: string;
  kind: PrivacyRequestKind;
  message: string;
  status: PrivacyRequestStatus;
  admin_note: string | null;
  created_at: string;
  due_at: string;
  resolved_at: string | null;
};

const MESSAGE_MAX = 2000;

const STATUS_BADGE: Record<PrivacyRequestStatus, string> = {
  open: 'badge-warning',
  in_progress: 'badge-info',
  resolved: 'badge-success',
  rejected: 'badge-neutral',
};

export default function PrivacyRequestPage() {
  const { showToast } = useToast();
  const [supabase] = useState(() => createClient());
  const [kind, setKind] = useState<PrivacyRequestKind>('access');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('privacy_requests')
      .select('id, kind, message, status, admin_note, created_at, due_at, resolved_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      showToast(errorMessage(error, "Couldn't load your requests."), 'error');
    } else {
      setRequests((data as MyRequest[]) ?? []);
    }
    setLoading(false);
  }, [supabase, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is only set after the query resolves
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) {
      showToast('Write a few words about what you need', 'error');
      return;
    }
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Your session has expired. Log in again.');
      const { error } = await supabase
        .from('privacy_requests')
        .insert({ user_id: userData.user.id, kind, message: text });
      if (error) throw error;
      setMessage('');
      showToast(`Sent. We will reply within ${REQUEST_RESPONSE_DAYS} days.`, 'success');
      await load();
    } catch (err) {
      showToast(errorMessage(err, "Couldn't send your request. Please try again."), 'error');
    } finally {
      setSending(false);
    }
  };

  const kindLabel = (value: PrivacyRequestKind) =>
    PRIVACY_REQUEST_KINDS.find((k) => k.value === value)?.label ?? value;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/profile/settings" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Settings
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1">Privacy request or complaint</h1>
        <p className="text-sm text-slate-400">
          Ask to see, correct or delete your data, or tell us about a problem. We reply within {REQUEST_RESPONSE_DAYS} days.
          Read how we handle your data in the <Link href="/privacy" className="text-emerald-400 hover:text-emerald-300">Privacy Notice</Link>.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Quick options: &quot;Download my data&quot; and &quot;Delete account&quot; are in Settings and work straight away.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card space-y-4 p-5">
        <div>
          <label htmlFor="kind" className="mb-1 block text-sm font-medium text-slate-200">What do you need?</label>
          <select
            id="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as PrivacyRequestKind)}
            className="input-field w-full"
            disabled={sending}
          >
            {PRIVACY_REQUEST_KINDS.map((k) => (
              <option key={k.value} value={k.value} className="bg-slate-900 text-slate-200">{k.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-200">Details</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MESSAGE_MAX}
            rows={5}
            className="input-field w-full"
            placeholder="Tell us what you need. For a correction, say what is wrong and what it should be."
            disabled={sending}
          />
          <p className="mt-1 text-right text-xs text-slate-500">{message.length}/{MESSAGE_MAX}</p>
        </div>
        <button type="submit" className="btn-primary" disabled={sending || !message.trim()}>
          {sending ? 'Sending...' : 'Send request'}
        </button>
      </form>

      <section aria-labelledby="mine-heading">
        <h2 id="mine-heading" className="mb-3 text-lg font-semibold text-white">Your requests</h2>
        {loading ? (
          <div className="glass-card skeleton h-24" aria-busy="true" />
        ) : requests.length === 0 ? (
          <p className="glass-card p-5 text-sm text-slate-400">
            You haven&apos;t sent any requests. You can also email {SUPPORT_EMAIL} from your college email.
          </p>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="glass-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-100">{kindLabel(r.kind)}</span>
                  <span className={STATUS_BADGE[r.status]}>{PRIVACY_REQUEST_STATUS_LABEL[r.status]}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{r.message}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Sent {timeAgo(r.created_at)}
                  {r.resolved_at ? '' : ` · we reply by ${new Date(r.due_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                </p>
                {r.admin_note && (
                  <div className="mt-3 rounded-md border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-200">
                    <span className="mb-1 block text-xs font-medium text-slate-400">Our reply</span>
                    <span className="whitespace-pre-wrap">{r.admin_note}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
