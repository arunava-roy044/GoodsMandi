-- Admin panel functions: overview, users, listings, restoring, admin rights.
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

SELECT plan(55);

-- Seed: seller b has 6 listings in every state
INSERT INTO public.listings (id, seller_id, title, category, asking_price, product_age, status, removed_reason) VALUES
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Desk lamp', 'Appliances', 100, 'new', 'active', NULL),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'Beer mugs set', 'Appliances', 200, 'new', 'active', NULL),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000b', 'Sold calculator', 'Electronics & Gadgets', 600, 'new', 'sold', NULL),
  ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000b', 'Taken down by admin', 'Appliances', 50, 'new', 'removed', 'admin'),
  ('60000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000b', 'Removed by seller', 'Appliances', 50, 'new', 'removed', 'seller'),
  ('60000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-00000000000b', 'Expired item', 'Appliances', 50, 'new', 'removed', 'expired');
INSERT INTO public.bids (listing_id, bidder_id, bid_amount) VALUES ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 90);
INSERT INTO public.chat_messages (listing_id, sender_id, recipient_id, message_text) VALUES ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b', 'Is it available?');
INSERT INTO public.reports (reporter_id, reported_user_id, reported_listing_id, category, description) VALUES ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b', '60000000-0000-0000-0000-000000000001', 'Scam', 'Looks fake');

-- Only admins
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b', $$SELECT admin_dashboard()$$), 'Only admins', 'the overview is admin-only');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b', $$SELECT * FROM admin_list_users()$$), 'Only admins', 'the user list is admin-only');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b', $$SELECT admin_get_user('00000000-0000-0000-0000-00000000000c')$$), 'Only admins', 'user details are admin-only');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b', $$SELECT admin_set_admin('00000000-0000-0000-0000-00000000000c', true)$$), 'Only admins', 'granting admin is admin-only');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b', $$SELECT * FROM admin_list_listings()$$), 'Only admins', 'the listing list is admin-only');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b', $$SELECT admin_restore_listing('60000000-0000-0000-0000-000000000004')$$), 'Only admins', 'restoring a listing is admin-only');
SELECT ok(NOT has_function_privilege('anon', 'public.admin_dashboard()', 'EXECUTE'), 'signed-out visitors cannot call admin functions');

-- Overview
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT (admin_dashboard()->'users'->>'total') || '/' || (admin_dashboard()->'users'->>'admins') || '/' || (admin_dashboard()->'users'->>'banned')$$), '4/1/0', 'overview: users, admins, banned');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT (admin_dashboard()->'listings'->>'active') || '/' || (admin_dashboard()->'listings'->>'sold') || '/' || (admin_dashboard()->'listings'->>'removed') || '/' || (admin_dashboard()->'listings'->>'flagged')$$), '2/1/3/1', 'overview: listings by state, and flagged');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT (admin_dashboard()->'offers'->>'pending') || '/' || (admin_dashboard()->'messages'->>'total') || '/' || (admin_dashboard()->'reports'->>'pending')$$), '1/1/1', 'overview: pending offers, messages, pending reports');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT jsonb_array_length(admin_dashboard()->'signups_by_day')::text || '/' || (admin_dashboard()->'signups_by_day'->13->>'n')$$), '14/4', 'overview: 14 days of sign-ups, 4 today');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT (admin_dashboard()->'listings_by_day'->13->>'n')$$), '6', 'overview: listings per day');

-- Users
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT total_count::text FROM admin_list_users() LIMIT 1$$), '4', 'user list: total count');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT email FROM admin_list_users('seller')$$), 'seller@stu.upes.ac.in', 'search finds a user and shows their email');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM admin_list_users('BUYER2')$$), '1', 'search ignores capital letters');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM admin_list_users('%')$$), '0', 'a % in the search is not a wildcard');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT active_listings::text || '/' || items_sold::text || '/' || reports_against::text FROM admin_list_users('seller')$$), '2/1/1', 'user list: listing and report counts');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM admin_list_users('', 'admins')$$), '1', 'filter: admins');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM admin_list_users('', 'banned')$$), '0', 'filter: banned (none yet)');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM admin_list_users('', 'all', 2, 0)$$) || '/' || tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM admin_list_users('', 'all', 2, 3)$$), '2/1', 'paging');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT (admin_get_user('00000000-0000-0000-0000-00000000000b')->'profile'->>'email') || '/' || (admin_get_user('00000000-0000-0000-0000-00000000000b')->'counts'->>'removed_listings') || '/' || jsonb_array_length(admin_get_user('00000000-0000-0000-0000-00000000000b')->'listings')::text || '/' || jsonb_array_length(admin_get_user('00000000-0000-0000-0000-00000000000b')->'reports_against')::text$$),
    'seller@stu.upes.ac.in/3/6/1', 'user details: email, counts, listings and reports');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_get_user('00000000-0000-0000-0000-00000000000b')->'consent'->>'notice_version'$$), 'test', 'user details: consent record');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_get_user('99999999-9999-9999-9999-999999999999')$$), 'User not found', 'unknown users are reported');

-- Listings
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT total_count::text FROM admin_list_listings() LIMIT 1$$), '6', 'listing list: sees every listing');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM listings$$), '2', 'while normal access shows an admin only the 2 active ones');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM admin_list_listings('', 'removed')$$), '3', 'filter: removed');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM admin_list_listings('', 'sold')$$), '1', 'filter: sold');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM admin_list_listings('', 'flagged')$$), '1', 'filter: flagged');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM admin_list_listings('', 'expired')$$), '1', 'filter: expired');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM admin_list_listings('', 'active')$$), '2', 'filter: active');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT title FROM admin_list_listings('beer')$$), 'Beer mugs set', 'search by title');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM admin_list_listings('seller')$$), '6', 'search by seller name');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT seller_name || '/' || offers::text FROM admin_list_listings('lamp')$$), 'seller/1', 'listing rows show the seller and the number of offers');

-- Restoring a listing
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_restore_listing('60000000-0000-0000-0000-000000000005')$$), 'moderator removed', 'a listing the seller removed cannot be restored by an admin');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_restore_listing('60000000-0000-0000-0000-000000000006')$$), 'moderator removed', 'an expired listing cannot be restored by an admin');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_restore_listing('60000000-0000-0000-0000-000000000001')$$), 'moderator removed', 'an active listing has nothing to restore');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_restore_listing('99999999-9999-9999-9999-999999999999')$$), 'not found', 'unknown listings are reported');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_set_ban('00000000-0000-0000-0000-00000000000b', true, 'test')$$), 'ok', 'setup: ban the seller');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_restore_listing('60000000-0000-0000-0000-000000000004')$$), 'banned', 'a banned seller''s listing cannot be restored');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_set_ban('00000000-0000-0000-0000-00000000000b', false)$$), 'ok', 'setup: lift the ban');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_restore_listing('60000000-0000-0000-0000-000000000004', 'Removed by mistake')$$), 'ok', 'an admin restores a listing a moderator removed');
SELECT is((SELECT status::text || '/' || COALESCE(removed_reason, 'none') FROM listings WHERE id = '60000000-0000-0000-0000-000000000004'), 'active/none', 'it is active again');
SELECT ok(EXISTS (SELECT 1 FROM notifications WHERE user_id = '00000000-0000-0000-0000-00000000000b' AND kind = 'listing_restored' AND listing_id = '60000000-0000-0000-0000-000000000004'), 'the seller is told');
SELECT ok(EXISTS (SELECT 1 FROM admin_actions WHERE action = 'restore_listing' AND target_listing_id = '60000000-0000-0000-0000-000000000004' AND reason = 'Removed by mistake'), 'the restore is logged with its reason');

-- Admin rights
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_set_admin('00000000-0000-0000-0000-00000000000a', false)$$), 'own admin rights', 'you cannot change your own admin rights');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_set_admin('00000000-0000-0000-0000-00000000000c', true, 'Second admin')$$), 'ok', 'an admin can make another person an admin');
SELECT ok((SELECT is_admin FROM profiles WHERE id = '00000000-0000-0000-0000-00000000000c'), 'they are now an admin');
SELECT ok(EXISTS (SELECT 1 FROM admin_actions WHERE action = 'grant_admin' AND target_user_id = '00000000-0000-0000-0000-00000000000c'), 'granting is logged');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c', $$SELECT admin_set_admin('00000000-0000-0000-0000-00000000000a', false)$$), 'ok', 'the new admin can take admin rights from another');
SELECT ok(NOT (SELECT is_admin FROM profiles WHERE id = '00000000-0000-0000-0000-00000000000a'), 'the first admin is no longer an admin');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000c', $$SELECT admin_set_admin('00000000-0000-0000-0000-00000000000d', false)$$), 'at least one admin', 'there always stays at least one admin');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000c', $$SELECT admin_set_admin('99999999-9999-9999-9999-999999999999', true)$$), 'User not found', 'unknown users are reported');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_dashboard()$$), 'Only admins', 'someone who lost admin rights is locked out at once');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c', $$SELECT admin_set_admin('00000000-0000-0000-0000-00000000000a', true)$$), 'ok', 'and can get them back');
SELECT is((SELECT array_agg(action ORDER BY action) FROM admin_actions WHERE action IN ('grant_admin', 'revoke_admin')), ARRAY['grant_admin', 'grant_admin', 'revoke_admin'], 'all admin-rights changes are logged');

SELECT * FROM finish();
ROLLBACK;
