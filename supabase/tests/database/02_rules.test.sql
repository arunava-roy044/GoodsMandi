-- Signup, profiles, listings, Browse search, chat, notifications, reports,
-- bans, expiry, photo locks and account deletion.
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
INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-00000000000a', 'admin@stu.upes.ac.in'),
    ('00000000-0000-0000-0000-00000000000b', 'seller@stu.upes.ac.in'),
    ('00000000-0000-0000-0000-00000000000c', 'buyer@stu.upes.ac.in'),
    ('00000000-0000-0000-0000-00000000000d', 'buyer2@stu.upes.ac.in');
UPDATE public.profiles SET is_admin = true WHERE id = '00000000-0000-0000-0000-00000000000a';

SELECT plan(61);

-- Signup and profiles
SELECT throws_like($$INSERT INTO auth.users (email) VALUES ('someone@gmail.com')$$,
    '%Only @stu.upes.ac.in%', 'only college emails can sign up');
SELECT is((SELECT year_of_study FROM profiles WHERE id = '00000000-0000-0000-0000-00000000000b'), NULL, 'profile is created on signup');
SELECT matches(tests.value_as('00000000-0000-0000-0000-00000000000b', $$SELECT is_admin FROM profiles LIMIT 1$$),
    'permission denied', 'other users cannot read is_admin');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT is_admin()::text$$), 'true', 'is_admin() is true for an admin');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000b', $$SELECT is_admin()::text$$), 'false', 'is_admin() is false for others');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$UPDATE profiles SET is_admin = true WHERE id = '00000000-0000-0000-0000-00000000000b'$$),
    'only change your name', 'users cannot make themselves admin');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$UPDATE profiles SET name = 'Seller Two' WHERE id = '00000000-0000-0000-0000-00000000000b'$$),
    'ok', 'users can change their name');

-- Listings
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    format($$INSERT INTO listings (id, seller_id, title, category, asking_price, product_age, photos) VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Casio calculator fx-991', 'Electronics & Gadgets', 600, '6 months', ARRAY[%L])$$,
      (SELECT value FROM app_config WHERE key = 'storage_public_url') || 'listing-photos/00000000-0000-0000-0000-00000000000b/calc.jpg')),
    'ok', 'seller posts a listing with their own photo');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$INSERT INTO listings (seller_id, title, category, asking_price, product_age, photos) VALUES ('00000000-0000-0000-0000-00000000000b', 'Lamp', 'Appliances', 100, 'new', ARRAY['https://example.com/listing-photos/00000000-0000-0000-0000-00000000000b/a.jpg'])$$),
    'uploaded through GoodsMandi', 'photos from other websites are refused');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$INSERT INTO listings (id, seller_id, title, description, category, asking_price, product_age) VALUES ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'Beer mugs, set of 2', 'Glass mugs', 'Hostel stuff', 200, 'new')$$),
    'ok', 'a listing with a prohibited word is still posted');
SELECT ok((SELECT flagged FROM listings WHERE id = '20000000-0000-0000-0000-000000000002'), 'and it is flagged for admins');
SELECT ok(NOT (SELECT flagged FROM listings WHERE id = '20000000-0000-0000-0000-000000000001'), 'a normal listing is not flagged');
SELECT is(cardinality(prohibited_words_in('Drum kit, begun')), 0, 'whole words only: drum and begun are fine');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$UPDATE listings SET flagged = false WHERE id = '20000000-0000-0000-0000-000000000002'$$),
    'managed by GoodsMandi', 'sellers cannot clear the flag');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000a',
    $$SELECT admin_clear_flag('20000000-0000-0000-0000-000000000002')$$),
    'ok', 'admin clears the flag');
SELECT ok(NOT (SELECT flagged FROM listings WHERE id = '20000000-0000-0000-0000-000000000002'), 'flag is cleared');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$DELETE FROM listings WHERE id = '20000000-0000-0000-0000-000000000002'$$),
    'ok', 'a hard delete runs but is not allowed to touch anything');
SELECT ok(EXISTS (SELECT 1 FROM listings WHERE id = '20000000-0000-0000-0000-000000000002'), 'listing is not hard-deleted');
DO $$
BEGIN
    FOR i IN 1..8 LOOP
        PERFORM tests.run_as('00000000-0000-0000-0000-00000000000b',
            format($q$INSERT INTO listings (seller_id, title, category, asking_price, product_age) VALUES ('00000000-0000-0000-0000-00000000000b', 'Item %s', 'Appliances', 50, 'new')$q$, i));
    END LOOP;
END $$;
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$INSERT INTO listings (seller_id, title, category, asking_price, product_age) VALUES ('00000000-0000-0000-0000-00000000000b', 'Item 11', 'Appliances', 50, 'new')$$),
    '10 listings a day', 'at most 10 new listings a day');

-- Browse
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT count(*)::text FROM search_listings('casio calc')$$),
    '1', 'search matches every word, including part of a word');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT count(*)::text FROM search_listings('casio lamp')$$),
    '0', 'search needs every word to match');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT title FROM search_listings('', 'Others')$$),
    'Beer mugs, set of 2', 'Others shows seller-typed categories');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT title FROM search_listings('', NULL, 'price_high')$$),
    'Casio calculator fx-991', 'sorting by price works');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT max(total_count)::text FROM search_listings('', NULL, 'newest', 2, 0)$$),
    '10', 'total count covers all pages');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT count(*)::text FROM search_listings('', NULL, 'newest', 4, 8)$$),
    '2', 'paging returns the rest');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT listings::text FROM listing_category_counts() WHERE category = 'Appliances'$$),
    '8', 'category counts');

-- Chat
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$INSERT INTO chat_messages (listing_id, sender_id, recipient_id, message_text) VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b', 'Is it available?')$$),
    'ok', 'buyer messages the seller');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$INSERT INTO chat_messages (listing_id, sender_id, recipient_id, message_text) VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', 'Yes')$$),
    'ok', 'seller replies (this used to fail with infinite recursion)');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$INSERT INTO chat_messages (listing_id, sender_id, recipient_id, message_text) VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d', 'Want it?')$$),
    'row-level security', 'seller cannot message someone who never wrote or offered');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT count(*)::text FROM get_my_conversations()$$),
    '1', 'chat list has one row per conversation');
SELECT is((SELECT count(*)::int FROM notifications WHERE user_id = '00000000-0000-0000-0000-00000000000c' AND kind = 'new_message'),
    1, 'buyer is notified of the reply');
DO $$
BEGIN
    FOR i IN 1..29 LOOP
        PERFORM tests.run_as('00000000-0000-0000-0000-00000000000c',
            format($q$INSERT INTO chat_messages (listing_id, sender_id, recipient_id, message_text) VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b', 'msg %s')$q$, i));
    END LOOP;
END $$;
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$INSERT INTO chat_messages (listing_id, sender_id, recipient_id, message_text) VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b', 'spam')$$),
    'too fast', 'at most 30 messages a minute');
SELECT is((SELECT count(*)::int FROM notifications WHERE user_id = '00000000-0000-0000-0000-00000000000b' AND kind = 'new_message'),
    1, 'many messages make one unread notification, not 30');

-- Notifications are private
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000d', $$SELECT count(*)::text FROM notifications$$),
    '0', 'users only see their own notifications');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b', $$SELECT mark_notifications_read()$$), 'ok', 'mark all read');
SELECT is((SELECT count(*)::int FROM notifications WHERE user_id = '00000000-0000-0000-0000-00000000000b' AND read_at IS NULL),
    0, 'no unread notifications left');

-- Reports
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000d',
    $$INSERT INTO reports (reporter_id, reported_user_id, reported_listing_id, category) VALUES ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 'Scam')$$),
    'nothing to do with', 'a report cannot point at an unrelated listing');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$INSERT INTO reports (reporter_id, reported_user_id, reported_listing_id, category) VALUES ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 'Harassment')$$),
    'ok', 'a seller can report someone from their chat');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$INSERT INTO reports (reporter_id, reported_user_id, reported_listing_id, category) VALUES ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001', 'Harassment')$$),
    'already reported', 'no duplicate pending reports');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT count(*)::text FROM reports$$),
    '0', 'the reported user cannot see the report');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM reports$$),
    '1', 'admins see reports');

-- Bans
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$SELECT admin_set_ban('00000000-0000-0000-0000-00000000000c', true)$$),
    'Only admins', 'non-admins cannot ban');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000a',
    $$SELECT admin_set_ban('00000000-0000-0000-0000-00000000000b', true, 'test')$$),
    'ok', 'admin bans the seller');
SELECT is((SELECT count(*)::int FROM listings WHERE seller_id = '00000000-0000-0000-0000-00000000000b' AND status = 'active'),
    0, 'a ban takes the seller''s listings down');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$INSERT INTO chat_messages (listing_id, sender_id, recipient_id, message_text) VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', 'hi')$$),
    'row-level security', 'a banned user cannot chat');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000a',
    $$SELECT admin_set_ban('00000000-0000-0000-0000-00000000000b', false)$$),
    'ok', 'admin unbans the seller');
SELECT is((SELECT count(*)::int FROM listings WHERE seller_id = '00000000-0000-0000-0000-00000000000b' AND status = 'active'),
    10, 'an unban puts the listings back up');
SELECT is((SELECT array_agg(action ORDER BY action) FROM admin_actions), ARRAY['ban', 'clear_flag', 'unban'], 'admin actions are logged');

-- Removing, expiry, renewal
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$UPDATE listings SET status = 'removed' WHERE id = '20000000-0000-0000-0000-000000000002'$$),
    'ok', 'seller removes a listing');
SELECT is((SELECT removed_reason FROM listings WHERE id = '20000000-0000-0000-0000-000000000002'), 'seller', 'removal reason is recorded');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$UPDATE listings SET status = 'active' WHERE id = '20000000-0000-0000-0000-000000000002'$$),
    'Relist or Renew', 'a removed listing cannot simply be switched back on');
UPDATE listings SET active_since = now() - interval '61 days' WHERE id = '20000000-0000-0000-0000-000000000001';
SELECT is(expire_stale_listings(), 1, 'stale listings expire');
SELECT is((SELECT removed_reason FROM listings WHERE id = '20000000-0000-0000-0000-000000000001'), 'expired', 'marked as expired');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$SELECT renew_listing('20000000-0000-0000-0000-000000000001')$$),
    'ok', 'seller renews an expired listing');
SELECT is((SELECT status::text FROM listings WHERE id = '20000000-0000-0000-0000-000000000001'), 'active', 'renewed listing is active');

-- Photo files lock once a listing has offers
SELECT ok(NOT listing_photo_locked('00000000-0000-0000-0000-00000000000b/calc.jpg'), 'photos can be deleted while there are no offers');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$INSERT INTO bids (listing_id, bidder_id, bid_amount) VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 500)$$),
    'ok', 'buyer makes an offer');
SELECT ok(listing_photo_locked('00000000-0000-0000-0000-00000000000b/calc.jpg'), 'photos are locked once there is an offer');

-- Account deletion
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c', $$SELECT delete_my_account()$$), 'ok', 'user deletes their account');
SELECT ok(NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-00000000000c'), 'auth user is gone');
SELECT ok(NOT EXISTS (SELECT 1 FROM bids WHERE bidder_id = '00000000-0000-0000-0000-00000000000c'), 'their offers are gone');

SELECT * FROM finish();
ROLLBACK;
