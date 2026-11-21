// Shared by the admin panel screens.

export type DayCount = { day: string; n: number };

export type Dashboard = {
  users: { total: number; new_7d: number; banned: number; admins: number };
  listings: { active: number; sold: number; removed: number; flagged: number; new_7d: number };
  offers: { total: number; pending: number; new_7d: number };
  messages: { total: number; last_24h: number };
  reports: { pending: number };
  privacy: { open_requests: number; overdue_requests: number; open_incidents: number };
  signups_by_day: DayCount[];
  listings_by_day: DayCount[];
};

// What the admin log calls each action, in plain words
export const ACTION_LABELS: Record<string, string> = {
  ban: 'Banned a user',
  unban: 'Lifted a ban',
  reset_warnings: 'Reset warnings',
  remove_listing: 'Removed a listing',
  restore_listing: 'Restored a listing',
  clear_flag: 'Cleared a flag',
  grant_admin: 'Made someone an admin',
  revoke_admin: 'Removed admin rights',
  privacy_request_in_progress: 'Started a privacy request',
  privacy_request_resolved: 'Resolved a privacy request',
  privacy_request_rejected: 'Declined a privacy request',
  privacy_request_open: 'Reopened a privacy request',
  incident_logged: 'Logged a data incident',
  incident_updated: 'Updated a data incident',
};

export const actionLabel = (action: string) => ACTION_LABELS[action] ?? action.replaceAll('_', ' ');

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export const PAGE_SIZE = 25;
