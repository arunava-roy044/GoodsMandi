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
