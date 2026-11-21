-- Function privileges, search_path, foreign-key indexes, and that triggers
-- still fire after their EXECUTE grants were removed.
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

-- Users: a admin, b seller, c buyer, d second buyer
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    ('00000000-0000-0000-0000-00000000000a', 'admin@stu.upes.ac.in', '{"adult_confirmed":true,"terms_accepted":true,"privacy_notice_version":"test"}'::jsonb),
    ('00000000-0000-0000-0000-00000000000b', 'seller@stu.upes.ac.in', '{"adult_confirmed":true,"terms_accepted":true,"privacy_notice_version":"test"}'::jsonb),
    ('00000000-0000-0000-0000-00000000000c', 'buyer@stu.upes.ac.in', '{"adult_confirmed":true,"terms_accepted":true,"privacy_notice_version":"test"}'::jsonb),
    ('00000000-0000-0000-0000-00000000000d', 'buyer2@stu.upes.ac.in', '{"adult_confirmed":true,"terms_accepted":true,"privacy_notice_version":"test"}'::jsonb);
UPDATE public.profiles SET is_admin = true WHERE id = '00000000-0000-0000-0000-00000000000a';

SELECT plan(16);

-- Trigger functions are not callable through the API
SELECT is(
    (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
       AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))),
    0, 'no trigger function is callable by anon or signed-in users');
SELECT ok(NOT has_function_privilege('authenticated', 'public.is_own_storage_url(text, text, uuid)', 'EXECUTE'),
    'is_own_storage_url is internal only');

-- The functions the app and the row-level rules call are still callable
SELECT ok(has_function_privilege('authenticated', 'public.accept_offer(uuid)', 'EXECUTE'), 'accept_offer is callable');
SELECT ok(has_function_privilege('authenticated', 'public.search_listings(text, text, text, integer, integer)', 'EXECUTE'), 'search_listings is callable');
SELECT ok(has_function_privilege('authenticated', 'public.is_banned(uuid)', 'EXECUTE'), 'is_banned (used in rules) is callable');
SELECT ok(has_function_privilege('authenticated', 'public.has_messaged(uuid, uuid, uuid)', 'EXECUTE'), 'has_messaged (used in rules) is callable');
SELECT ok(has_function_privilege('authenticated', 'public.listing_photo_locked(text)', 'EXECUTE'), 'listing_photo_locked (used in storage rules) is callable');
SELECT ok(NOT has_function_privilege('anon', 'public.accept_offer(uuid)', 'EXECUTE'), 'signed-out visitors cannot call accept_offer');

-- Triggers still fire for a signed-in user
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$INSERT INTO listings (id, seller_id, title, category, asking_price, product_age) VALUES ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Beer fridge', 'Appliances', 3000, '1-2 years')$$),
    'ok', 'a signed-in user can still post a listing');
SELECT ok((SELECT flagged FROM listings WHERE id = '40000000-0000-0000-0000-000000000001'), 'the flag trigger still runs');
SELECT is((SELECT active_listings_count FROM profiles WHERE id = '00000000-0000-0000-0000-00000000000b'), 1, 'the counter trigger still runs');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$INSERT INTO bids (listing_id, bidder_id, bid_amount) VALUES ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 1000)$$),
    'at least 70%', 'the minimum-offer trigger still runs');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$INSERT INTO bids (listing_id, bidder_id, bid_amount) VALUES ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 2500)$$),
    'ok', 'a valid offer goes through');
SELECT is((SELECT count(*)::int FROM notifications WHERE user_id = '00000000-0000-0000-0000-00000000000b' AND kind = 'new_offer'),
    1, 'the notification trigger still runs');

-- Every function of ours has a fixed search_path
SELECT is(
    (SELECT string_agg(p.proname, ', ') FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prokind = 'f'
       AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')),
    NULL, 'every public function sets search_path');

-- Every foreign key has an index starting with its column
SELECT is(
    (SELECT string_agg(c.conrelid::regclass || '.' || a.attname, ', ')
     FROM pg_constraint c
     JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
       AND NOT EXISTS (
           SELECT 1 FROM pg_index i
           WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1]
       )),
    NULL, 'every foreign key is indexed');

SELECT * FROM finish();
ROLLBACK;
