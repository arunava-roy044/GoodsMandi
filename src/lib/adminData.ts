import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Dashboard } from '@/lib/admin';

// The overview numbers, fetched once per request even if the layout and the page both ask
export const getDashboard = cache(async (): Promise<Dashboard | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_dashboard');
  if (error) {
    console.error('admin_dashboard failed:', error.message);
    return null;
  }
  return data as Dashboard;
});

export type RecentAction = {
  id: string;
  action: string;
  created_at: string;
  target_user_id: string | null;
  admin: { name: string } | null;
  target: { name: string } | null;
};

// The latest few things admins did, for the overview. Empty if it can't be loaded.
export async function getRecentActions(limit = 5): Promise<RecentAction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_actions')
    .select('id, action, created_at, target_user_id, admin:profiles!admin_id(name), target:profiles!target_user_id(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('recent admin actions failed:', error.message);
    return [];
  }
  return (data as unknown as RecentAction[]) ?? [];
}

// The signed-in admin's first name, for the greeting
export async function getMyFirstName(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('name').eq('id', user.id).maybeSingle();
  const name = (data?.name as string | undefined)?.trim();
  return name ? name.split(/\s+/)[0] : null;
}
