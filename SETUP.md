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

This creates all tables, enums, triggers, RLS policies, and storage buckets.

---

## Step 3: Configure Authentication

1. In Supabase Dashboard, go to **Authentication > Providers**
2. Ensure **Email** provider is enabled
3. Go to **Authentication > URL Configuration**:
   - Set **Site URL** to `http://localhost:3000` (for development)
   - Add `http://localhost:3000/auth/callback` to **Redirect URLs**

### Email Domain Restriction
To restrict signups to `@stu.upes.ac.in` only:
1. Go to **Authentication > Hooks** (or use the SQL Editor)
2. Run this SQL to create a hook that validates email domains:

```sql
CREATE OR REPLACE FUNCTION public.check_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email NOT LIKE '%@stu.upes.ac.in' THEN
    RAISE EXCEPTION 'Only @stu.upes.ac.in email addresses are allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This is also enforced in the application layer
```

The app also enforces this client-side and server-side, but the database trigger provides defense in depth.

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
4. You can now access the admin dashboard at `/admin`

---

## Deployment to Vercel

1. Push this repo to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy!
5. Update your Supabase **Site URL** and **Redirect URLs** to your Vercel domain

---

## Tech Stack
- **Frontend**: Next.js 16 (App Router, TypeScript) + Tailwind CSS v3
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime)
- **Hosting**: Vercel + Supabase Cloud
