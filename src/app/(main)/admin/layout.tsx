import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDashboard } from '@/lib/adminData';
import AdminNav from '@/components/admin/AdminNav';

export const metadata = { title: 'Admin | GoodsMandi' };

// Every admin page goes through this check on the server, before anything is sent.
// Signed-out visitors are asked to log in; signed-in students get a plain "not found", so
// nothing shows that an admin area exists. (The database separately refuses every admin
// action to non-admins.)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) notFound();

  const stats = await getDashboard();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100">Admin</h1>
        <p className="mt-1 text-slate-400">Run GoodsMandi: people, listings, reports and privacy requests.</p>
      </div>
      <AdminNav
        badges={{
          reports: stats?.reports.pending ?? 0,
          privacy: (stats?.privacy.open_requests ?? 0) + (stats?.privacy.open_incidents ?? 0),
          flagged: stats?.listings.flagged ?? 0,
        }}
      />
      {children}
    </div>
  );
}
