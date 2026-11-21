# GoodsMandi — Setup Guide

## Prerequisites
- Node.js 18+ installed
- A free Supabase account at [supabase.com](https://supabase.com)

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project
2. Choose a name (e.g., "goodsmandi") and set a database password
3. Select a region closest to your users (e.g., Mumbai for India)
4. Wait for the project to finish provisioning

---

## Step 2: Run Database Migrations

1. In your Supabase Dashboard, go to **SQL Editor**
2. Open `supabase/migrations/001_schema.sql` from this project
3. Paste the entire contents into the SQL Editor and click **Run**
4. Then open `supabase/migrations/002_storage.sql` and run it the same way
5. Run every remaining file in `supabase/migrations/` the same way, in filename order

This creates all tables, enums, triggers, RLS policies, and storage buckets.

**New Supabase project?** Photo links are only accepted from this project's storage. After running the migrations, point the check at your project (replace `<project-ref>`):

```sql
UPDATE public.app_config
SET value = 'https://<project-ref>.supabase.co/storage/v1/object/public/'
WHERE key = 'storage_public_url';
```

**Daily listing expiry:** listings with no new offers for 60 days are expired by a daily `pg_cron` job, which the migrations turn on and schedule. If your database doesn't offer pg_cron, the migration prints a notice instead; then call `SELECT public.expire_stale_listings();` once a day some other way.

---

## Local database and tests (optional)

With [Docker](https://docs.docker.com/get-docker/) and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) installed:

```bash
supabase db start   # local Postgres with every migration applied
supabase test db    # runs the pgTAP tests in supabase/tests
```

The same tests run on every pull request (`.github/workflows/check.yml`). When you change a database rule, add a test for it in `supabase/tests/database/`.

---

## Step 3: Configure Authentication

1. In Supabase Dashboard, go to **Authentication > Providers**
2. Ensure **Email** provider is enabled
3. Go to **Authentication > URL Configuration**:
   - Set **Site URL** to `http://localhost:3000` (for development)
   - Add `http://localhost:3000/auth/callback` to **Redirect URLs**

### Email Domain Restriction
Signups are restricted to `@stu.upes.ac.in` by a trigger on `auth.users`, created in `supabase/migrations/20261031170000_security_hardening.sql`. The app also checks this in the browser.

---

## Step 4: Configure Storage

The migrations already created two storage buckets:
- `listing-photos` (public read, authenticated write)
- `profile-photos` (public read, authenticated write)

Verify they exist by going to **Storage** in your Supabase Dashboard.

---

## Step 5: Get API Keys

1. Go to **Settings > API** in your Supabase Dashboard
2. Copy the **Project URL** and **anon public** key

---

## Step 6: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## Step 7: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Step 8: Create an Admin User

1. Sign up through the app with your `@stu.upes.ac.in` email
2. Go to Supabase Dashboard > **Table Editor > profiles**
3. Find your user row and set `is_admin` to `true`
4. You can now access the admin dashboard at `/admin`.

### What the admin panel covers (`/admin`)
- **Overview:** what needs attention (reports, flagged listings, overdue privacy requests), counts of students, listings, offers and messages, and a 14-day chart. The tab bar shows badges for pending items.
- **Users:** search everyone by name or college email, filter (new, warned, banned, admins), and open a person to see their listings, the reports against them and what admins did about them. From there you can ban or unban (a reason is required to ban), reset warnings, and make someone an admin or remove their admin rights. You can't change your own admin rights, and there is always at least one admin.
- **Listings:** every listing, including sold and removed ones. Remove a listing, clear a flag, or restore a listing a moderator removed.
- **Reports:** the queue of reports from students, and listings flagged for prohibited words.
- **Privacy & data:** requests and complaints from students, consent records and the data-incident log (see the privacy section below).
- **Activity:** a log of everything admins have done, with who, when and why.

The database refuses every admin action to anyone who isn't an admin, and non-admins are turned away from `/admin` before the page is sent.

---

## Privacy, consent and the Privacy & data admin panel

These support the Digital Personal Data Protection Act, 2023.

**Before launch, fill in `src/lib/legal.ts`:** the name of the person or entity running GoodsMandi (the "Data Fiduciary"), the Grievance Officer's name, and a support email on your own domain. Until you do, the Privacy Notice shows `[CONFIRM: ...]` in those places. Have a lawyer read the notice (`src/lib/privacyNotice.ts`, English and Hindi) and the Terms. When the notice changes in a way people must agree to again, raise `PRIVACY_NOTICE_VERSION`.

**What the site does:**
- Sign-up needs three tick-boxes (18 or older, Terms, Privacy Notice). The database refuses an account without them and keeps a record (notice version, time) in `consent_records`.
- Settings has **Download my data**, **Privacy request or complaint** and **Delete account**. Deleting an account also removes the person's photo files.
- Requests and complaints go to the admin panel at `/admin/privacy`, with a due date 15 days out. Admins reply there and the student is notified. The panel also shows consent records and has a log for data incidents.

**Deploying these changes (in this order):**
1. Deploy the Edge Function that deletes accounts and photos: `supabase functions deploy delete-account` (or from the Supabase dashboard under Edge Functions). It needs no secrets; Supabase provides the keys.
2. Merge and deploy the website.
3. Run the migration `20261121120000_privacy_compliance.sql` right after step 2. It makes sign-up refuse accounts without consent, and removes the old `delete_my_account()` that the previous website version called.

**Creating accounts by hand** (for example test accounts through the Supabase dashboard or the admin API): the database now refuses a new account unless its user metadata contains `adult_confirmed: true`, `terms_accepted: true` and `privacy_notice_version`. With the admin API, pass them as `user_metadata`.

**Accounts that existed before this change** have no consent record. They are listed under Consent in the admin panel so you can ask them to review the notice.

---

## Deployment to Vercel

1. Push this repo to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy!
5. Update your Supabase **Site URL** and **Redirect URLs** to your Vercel domain

`vercel.json` pins the server to **Mumbai (`bom1`)**, next to the Supabase project (`ap-south-1`). Keep the two in the same region: every signed-in page makes several database calls, and each one crosses the distance between them.

---

## Tech Stack
- **Frontend**: Next.js 16 (App Router, TypeScript) + Tailwind CSS v3
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime)
- **Hosting**: Vercel + Supabase Cloud
