'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { errorMessage, timeAgo } from '@/lib/utils';
import {
  PRIVACY_NOTICE_VERSION,
  PRIVACY_REQUEST_KINDS,
  PRIVACY_REQUEST_STATUS_LABEL,
  type PrivacyRequestKind,
  type PrivacyRequestStatus,
} from '@/lib/legal';

type Overview = {
  accounts: number;
  with_consent: number;
  without_consent: number;
  by_notice_version: Record<string, number>;
  open_requests: number;
  overdue_requests: number;
  open_incidents: number;
};

type AdminRequest = {
  id: string;
  kind: PrivacyRequestKind;
  message: string;
  status: PrivacyRequestStatus;
  admin_note: string | null;
  created_at: string;
  due_at: string;
  resolved_at: string | null;
  user: { name: string } | null;
};

type Incident = {
  id: string;
  discovered_at: string;
  occurred_at: string | null;
  summary: string;
  data_affected: string | null;
  people_affected: number | null;
  actions_taken: string | null;
  board_notified_at: string | null;
  people_notified_at: string | null;
  status: 'open' | 'contained' | 'closed';
};

type NoConsent = { id: string; name: string; created_at: string };

type Tab = 'requests' | 'incidents' | 'consent';

const STATUS_BADGE: Record<PrivacyRequestStatus, string> = {
  open: 'badge-warning',
  in_progress: 'badge-info',
  resolved: 'badge-success',
  rejected: 'badge-neutral',
};

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function Stat({ label, value, tone = 'text-white' }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="glass-card rounded-lg px-4 py-3 text-center">
      <div className={`text-xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-400">{label}</div>
    </div>
  );
}

export default function AdminPrivacyPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [supabase] = useState(() => createClient());

  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('requests');
  const [showClosed, setShowClosed] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [noConsent, setNoConsent] = useState<NoConsent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Incident form
  const [summary, setSummary] = useState('');
  const [dataAffected, setDataAffected] = useState('');
  const [peopleAffected, setPeopleAffected] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [occurredAt, setOccurredAt] = useState('');

  const load = useCallback(async () => {
    const [overviewRes, requestsRes, incidentsRes, noConsentRes] = await Promise.all([
      supabase.rpc('admin_privacy_overview'),
      supabase
        .from('privacy_requests')
        .select('id, kind, message, status, admin_note, created_at, due_at, resolved_at, user:profiles!user_id(name)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('breach_incidents').select('*').order('discovered_at', { ascending: false }).limit(100),
      supabase.rpc('admin_users_without_consent'),
    ]);
    const firstError = overviewRes.error ?? requestsRes.error ?? incidentsRes.error ?? noConsentRes.error;
    if (firstError) showToast(errorMessage(firstError, "Couldn't load some of the data."), 'error');
    setOverview((overviewRes.data as Overview | null) ?? null);
    setRequests((requestsRes.data as unknown as AdminRequest[]) ?? []);
    setIncidents((incidentsRes.data as Incident[]) ?? []);
    setNoConsent((noConsentRes.data as NoConsent[]) ?? []);
  }, [supabase, showToast]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?next=/admin/privacy');
        return;
      }
      const { data: isAdmin } = await supabase.rpc('is_admin');
      if (isAdmin !== true) {
        router.push('/listings');
        return;
      }
      await load();
      setReady(true);
    }
    init();
  }, [supabase, router, load]);

  const updateRequest = async (r: AdminRequest, status: PrivacyRequestStatus) => {
    const note = (notes[r.id] ?? '').trim();
    if (status === 'rejected' && !note) {
      showToast("Explain why in the reply box first: the student will read it", 'error');
      return;
    }
    if (status === 'resolved' && !note && !r.admin_note) {
      showToast('Write a short reply for the student before resolving', 'error');
      return;
    }
    setBusy(r.id);
    try {
      const { error } = await supabase.rpc('admin_update_privacy_request', { p_id: r.id, p_status: status, p_note: note || null });
      if (error) throw error;
      setNotes((prev) => ({ ...prev, [r.id]: '' }));
      showToast(status === 'in_progress' ? 'Marked as being handled' : status === 'resolved' ? 'Resolved' : 'Closed', 'success');
      await load();
    } catch (err) {
      showToast(errorMessage(err, "That didn't work. Please try again."), 'error');
    } finally {
      setBusy(null);
    }
  };

  const logIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      showToast('Describe what happened', 'error');
      return;
    }
    setBusy('new-incident');
    try {
      const { error } = await supabase.from('breach_incidents').insert({
        summary: summary.trim(),
        data_affected: dataAffected.trim() || null,
        people_affected: peopleAffected.trim() ? Math.max(0, parseInt(peopleAffected, 10) || 0) : null,
        actions_taken: actionsTaken.trim() || null,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
      });
      if (error) throw error;
      setSummary('');
      setDataAffected('');
      setPeopleAffected('');
      setActionsTaken('');
      setOccurredAt('');
      showToast('Incident logged', 'success');
      await load();
    } catch (err) {
      showToast(errorMessage(err, "Couldn't log the incident."), 'error');
    } finally {
      setBusy(null);
    }
  };

  const updateIncident = async (id: string, changes: Partial<Pick<Incident, 'status' | 'board_notified_at' | 'people_notified_at'>>) => {
    setBusy(id);
    try {
      const { error } = await supabase.from('breach_incidents').update(changes).eq('id', id);
      if (error) throw error;
      await load();
    } catch (err) {
      showToast(errorMessage(err, "Couldn't update the incident."), 'error');
    } finally {
      setBusy(null);
    }
  };

  const kindLabel = (value: PrivacyRequestKind) => PRIVACY_REQUEST_KINDS.find((k) => k.value === value)?.label ?? value;
  const isOpen = (r: AdminRequest) => r.status === 'open' || r.status === 'in_progress';
  const shownRequests = requests.filter((r) => (showClosed ? !isOpen(r) : isOpen(r)));

  if (!ready) {
    return (
      <div className="max-w-5xl mx-auto" aria-busy="true">
        <div className="skeleton mb-6 h-10 w-64" />
        <div className="glass-card skeleton h-40" />
      </div>
    );
  }

  const tabButton = (value: Tab, label: string, count?: number) => (
    <button
      key={value}
      type="button"
      onClick={() => setTab(value)}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        tab === value ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-2 rounded-full bg-slate-600 px-2 py-0.5 text-xs text-slate-100">{count}</span>
      )}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/admin" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Admin
      </Link>
      <h1 className="text-3xl font-bold text-slate-100">Privacy &amp; data</h1>
      <p className="mt-1 mb-6 text-slate-400">Requests and complaints from students, consent records, and data incidents.</p>

      {overview && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Accounts" value={overview.accounts} />
          <Stat label="With consent" value={overview.with_consent} tone="text-emerald-400" />
          <Stat label="No consent record" value={overview.without_consent} tone={overview.without_consent > 0 ? 'text-amber-400' : 'text-white'} />
          <Stat label="Open requests" value={overview.open_requests} tone={overview.open_requests > 0 ? 'text-amber-400' : 'text-white'} />
          <Stat label="Overdue" value={overview.overdue_requests} tone={overview.overdue_requests > 0 ? 'text-red-400' : 'text-white'} />
          <Stat label="Open incidents" value={overview.open_incidents} tone={overview.open_incidents > 0 ? 'text-red-400' : 'text-white'} />
        </div>
      )}

      <div className="mb-6 inline-flex space-x-1 rounded-lg bg-slate-800/50 p-1">
        {tabButton('requests', 'Requests', overview?.open_requests)}
        {tabButton('incidents', 'Incidents', overview?.open_incidents)}
        {tabButton('consent', 'Consent')}
      </div>

      {tab === 'requests' && (
        <section aria-label="Requests">
          <div className="mb-4 flex gap-4 text-sm">
            <button type="button" onClick={() => setShowClosed(false)} className={showClosed ? 'text-slate-400 hover:text-white' : 'font-medium text-white underline underline-offset-4'}>Open</button>
            <button type="button" onClick={() => setShowClosed(true)} className={showClosed ? 'font-medium text-white underline underline-offset-4' : 'text-slate-400 hover:text-white'}>Closed</button>
          </div>
          {shownRequests.length === 0 ? (
            <p className="glass-card p-8 text-center text-slate-400">{showClosed ? 'No closed requests yet.' : 'No open requests. Nothing to answer right now.'}</p>
          ) : (
            <ul className="space-y-4">
              {shownRequests.map((r) => {
                const overdue = isOpen(r) && new Date(r.due_at) < new Date();
                return (
                  <li key={r.id} className="glass-card rounded-lg p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium text-slate-100">{kindLabel(r.kind)}</span>
                      <span className={STATUS_BADGE[r.status]}>{PRIVACY_REQUEST_STATUS_LABEL[r.status]}</span>
                      {overdue && <span className="badge-danger">Overdue</span>}
                      <span className="text-sm text-slate-400">{r.user?.name ?? 'Deleted account'} · {timeAgo(r.created_at)}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-700/50 bg-slate-900/50 p-3 text-slate-300">{r.message}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {r.resolved_at ? `Closed ${dateTime(r.resolved_at)}` : `Reply due by ${dateTime(r.due_at)}`}
                    </p>
                    {r.admin_note && (
                      <p className="mt-2 text-sm text-slate-300"><span className="text-slate-500">Last reply: </span>{r.admin_note}</p>
                    )}
                    {isOpen(r) && (
                      <div className="mt-4 space-y-3">
                        <textarea
                          value={notes[r.id] ?? ''}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          rows={2}
                          maxLength={2000}
                          placeholder="Reply to the student. They will read this."
                          className="input-field w-full"
                          aria-label="Reply to the student"
                        />
                        <div className="flex flex-wrap gap-2">
                          {r.status === 'open' && (
                            <button type="button" disabled={busy !== null} onClick={() => updateRequest(r, 'in_progress')} className="btn-secondary px-3 py-1.5 text-sm">Start handling</button>
                          )}
                          <button type="button" disabled={busy !== null} onClick={() => updateRequest(r, 'resolved')} className="btn-primary px-3 py-1.5 text-sm">Resolve</button>
                          <button type="button" disabled={busy !== null} onClick={() => updateRequest(r, 'rejected')} className="btn-ghost border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-700">Can&apos;t do this</button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === 'incidents' && (
        <section aria-label="Incidents" className="space-y-6">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            If a data breach is likely to affect students, the Digital Personal Data Protection Act (section 8(6)) requires telling the Data Protection Board of India and each affected person. The form and the deadline are set in the DPDP Rules, so check them straight away and write down every step here. Don&apos;t put students&apos; personal data in these notes.
          </div>

          <form onSubmit={logIncident} className="glass-card space-y-3 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-white">Log an incident</h2>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} maxLength={2000} className="input-field w-full" placeholder="What happened?" aria-label="What happened" disabled={busy !== null} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={dataAffected} onChange={(e) => setDataAffected(e.target.value)} maxLength={1000} className="input-field" placeholder="What kind of data was involved?" aria-label="Kind of data involved" disabled={busy !== null} />
              <input value={peopleAffected} onChange={(e) => setPeopleAffected(e.target.value.replace(/\D/g, '').slice(0, 7))} inputMode="numeric" className="input-field" placeholder="How many people (if known)?" aria-label="How many people" disabled={busy !== null} />
              <label className="text-xs text-slate-400">
                When did it happen (if known)?
                <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className="input-field mt-1 w-full" disabled={busy !== null} />
              </label>
              <textarea value={actionsTaken} onChange={(e) => setActionsTaken(e.target.value)} rows={2} maxLength={2000} className="input-field" placeholder="What have you done about it?" aria-label="Actions taken" disabled={busy !== null} />
            </div>
            <button type="submit" className="btn-primary" disabled={busy !== null || !summary.trim()}>Log incident</button>
          </form>

          {incidents.length === 0 ? (
            <p className="glass-card p-8 text-center text-slate-400">No incidents logged.</p>
          ) : (
            <ul className="space-y-4">
              {incidents.map((i) => (
                <li key={i.id} className="glass-card rounded-lg p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={i.status === 'closed' ? 'badge-neutral' : i.status === 'contained' ? 'badge-info' : 'badge-danger'}>{i.status}</span>
                    <span className="text-sm text-slate-400">Found {dateTime(i.discovered_at)}{i.occurred_at ? ` · happened ${dateTime(i.occurred_at)}` : ''}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-slate-200">{i.summary}</p>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-slate-400 sm:grid-cols-2">
                    {i.data_affected && <div><dt className="inline text-slate-500">Data: </dt><dd className="inline">{i.data_affected}</dd></div>}
                    {i.people_affected !== null && <div><dt className="inline text-slate-500">People: </dt><dd className="inline">{i.people_affected}</dd></div>}
                    {i.actions_taken && <div className="sm:col-span-2"><dt className="inline text-slate-500">Done: </dt><dd className="inline">{i.actions_taken}</dd></div>}
                    <div><dt className="inline text-slate-500">Board told: </dt><dd className="inline">{i.board_notified_at ? dateTime(i.board_notified_at) : 'not yet'}</dd></div>
                    <div><dt className="inline text-slate-500">People told: </dt><dd className="inline">{i.people_notified_at ? dateTime(i.people_notified_at) : 'not yet'}</dd></div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!i.board_notified_at && (
                      <button type="button" disabled={busy !== null} onClick={() => updateIncident(i.id, { board_notified_at: new Date().toISOString() })} className="btn-secondary px-3 py-1.5 text-sm">Board was told now</button>
                    )}
                    {!i.people_notified_at && (
                      <button type="button" disabled={busy !== null} onClick={() => updateIncident(i.id, { people_notified_at: new Date().toISOString() })} className="btn-secondary px-3 py-1.5 text-sm">Affected people were told now</button>
                    )}
                    {i.status === 'open' && (
                      <button type="button" disabled={busy !== null} onClick={() => updateIncident(i.id, { status: 'contained' })} className="btn-ghost border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-700">Mark contained</button>
                    )}
                    {i.status !== 'closed' && (
                      <button type="button" disabled={busy !== null} onClick={() => updateIncident(i.id, { status: 'closed' })} className="btn-ghost border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-700">Close</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'consent' && overview && (
        <section aria-label="Consent" className="space-y-6">
          <div className="glass-card rounded-lg p-5">
            <h2 className="mb-1 text-lg font-semibold text-white">Privacy Notice versions people agreed to</h2>
            <p className="mb-4 text-sm text-slate-400">The current version is <span className="font-mono text-slate-200">{PRIVACY_NOTICE_VERSION}</span>. Everyone who signs up records which version they agreed to, and that they are 18 or older.</p>
            {Object.keys(overview.by_notice_version).length === 0 ? (
              <p className="text-sm text-slate-400">No consent records yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {Object.entries(overview.by_notice_version).map(([version, count]) => (
                  <li key={version} className="flex justify-between border-b border-slate-800 py-1.5">
                    <span className="font-mono text-slate-300">{version}{version === PRIVACY_NOTICE_VERSION ? ' (current)' : ''}</span>
                    <span className="text-slate-200">{count} {count === 1 ? 'person' : 'people'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-card rounded-lg p-5">
            <h2 className="mb-1 text-lg font-semibold text-white">Accounts with no consent record ({overview.without_consent})</h2>
            <p className="mb-4 text-sm text-slate-400">These accounts were created before consent was recorded. Ask them to review the Privacy Notice, and do the same for everyone whenever you raise the notice version.</p>
            {noConsent.length === 0 ? (
              <p className="text-sm text-slate-400">Everyone has a consent record.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {noConsent.map((u) => (
                  <li key={u.id} className="flex justify-between border-b border-slate-800 py-1.5">
                    <Link href={`/profile/${u.id}`} className="text-brand-400 hover:underline">{u.name}</Link>
                    <span className="text-slate-500">joined {timeAgo(u.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
