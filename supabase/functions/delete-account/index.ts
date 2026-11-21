// delete-account: deletes the signed-in person's account AND their photo files.
//
// A database function can't remove files from storage, which is why this is an Edge
// Function. It runs inside Supabase with the service role key (never in the browser):
//   1. check who is calling from their login token
//   2. delete everything in their folder in the listing-photos and profile-photos buckets
//   3. delete their login; the database then deletes their profile, listings, offers,
//      messages, ratings, notifications and consent record (ON DELETE CASCADE)
// Photos go first: if step 2 fails nothing else is deleted and they can try again.
// Deploy with:  supabase functions deploy delete-account
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKETS = ['listing-photos', 'profile-photos'];
const PAGE = 100;
const MAX_PAGES = 50; // 5,000 files per bucket, far above the 5-photo, 20-listing limits

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// deno-lint-ignore no-explicit-any
async function removeFolder(admin: any, bucket: string, folder: string): Promise<void> {
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: PAGE });
    if (error) throw error;
    if (!data || data.length === 0) return;
    const { error: removeError } = await admin.storage
      .from(bucket)
      .remove(data.map((file: { name: string }) => `${folder}/${file.name}`));
    if (removeError) throw removeError;
    if (data.length < PAGE) return;
  }
  throw new Error(`Too many files in ${bucket}/${folder}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'The server is not set up correctly.' }, 500);

  // Who is asking? Only ever the person whose token this is.
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data, error } = await userClient.auth.getUser();
  const user = data?.user;
  if (error || !user) return json({ error: 'You need to be logged in.' }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    for (const bucket of BUCKETS) await removeFolder(admin, bucket, user.id);
  } catch (err) {
    console.error('delete-account: removing files failed', err);
    return json({ error: "Couldn't remove your photos, so nothing was deleted. Please try again." }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('delete-account: deleting the user failed', deleteError);
    return json({ error: "Couldn't delete your account. Please try again." }, 500);
  }

  return json({ ok: true });
});
