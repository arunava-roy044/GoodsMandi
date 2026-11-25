-- Admin overview: last week's counts for the "this week vs last week" arrows.
-- Run with: supabase test db
BEGIN;
-- Test helpers (repeated in each file, since every file runs on its own and is rolled back)
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS tests;

-- Runs a statement as a signed-in user (role authenticated + their JWT), then
-- switches back. Returns 'ok', or the error message if it failed.
CREATE OR REPLACE FUNCTION tests.run_as(uid uuid, q text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE q;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN 'ok';
EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN SQLERRM;
END;
$$;

-- Same, but returns the first column of the first row as text
CREATE OR REPLACE FUNCTION tests.value_as(uid uuid, q text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    result text;
BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE q INTO result;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;
-- Users: a admin (joined today), b joined 10 days ago, c joined 20 days ago
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    ('00000000-0000-0000-0000-00000000000a', 'admin@stu.upes.ac.in', '{"adult_confirmed":true,"terms_accepted":true,"privacy_notice_version":"test"}'::jsonb),
    ('00000000-0000-0000-0000-00000000000b', 'seller@stu.upes.ac.in', '{"adult_confirmed":true,"terms_accepted":true,"privacy_notice_version":"test"}'::jsonb),
    ('00000000-0000-0000-0000-00000000000c', 'buyer@stu.upes.ac.in', '{"adult_confirmed":true,"terms_accepted":true,"privacy_notice_version":"test"}'::jsonb);
UPDATE public.profiles SET is_admin = true WHERE id = '00000000-0000-0000-0000-00000000000a';
UPDATE public.profiles SET created_at = now() - interval '10 days' WHERE id = '00000000-0000-0000-0000-00000000000b';
UPDATE public.profiles SET created_at = now() - interval '20 days' WHERE id = '00000000-0000-0000-0000-00000000000c';

-- Listings: one this week, two last week, one older
INSERT INTO public.listings (id, seller_id, title, category, asking_price, product_age, status) VALUES
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Desk lamp', 'Appliances', 100, 'new', 'active'),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'Kettle', 'Appliances', 200, 'new', 'active'),
  ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000b', 'Chair', 'Appliances', 300, 'new', 'active'),
  ('70000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000b', 'Fan', 'Appliances', 400, 'new', 'active');
UPDATE public.listings SET created_at = now() - interval '9 days' WHERE id IN ('70000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000003');
UPDATE public.listings SET created_at = now() - interval '30 days' WHERE id = '70000000-0000-0000-0000-000000000004';

SELECT plan(4);

SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT (admin_dashboard()->'users'->>'new_7d') || '/' || (admin_dashboard()->'users'->>'new_prev_7d')$$), '1/1', 'students: 1 joined this week, 1 the week before');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT (admin_dashboard()->'listings'->>'new_7d') || '/' || (admin_dashboard()->'listings'->>'new_prev_7d')$$), '1/2', 'listings: 1 this week, 2 the week before');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT (admin_dashboard()->'offers'->>'new_prev_7d')$$), '0', 'offers: last week''s count is there');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b', $$SELECT admin_dashboard()$$), 'Only admins', 'the overview is still admin-only');

SELECT * FROM finish();
ROLLBACK;
