-- Chat read marks: unread counts, "Seen", and who can see or write read marks.
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

SELECT plan(14);

-- b sells a lamp, c makes an offer and writes to b
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$INSERT INTO listings (id, seller_id, title, category, asking_price, product_age) VALUES ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Desk lamp', 'Appliances', 400, 'new')$$),
    'ok', 'seller posts a listing');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$INSERT INTO bids (listing_id, bidder_id, bid_amount) VALUES ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 350)$$),
    'ok', 'buyer makes an offer');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$INSERT INTO chat_messages (listing_id, sender_id, recipient_id, message_text) VALUES
        ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b', 'Is this still available?'),
        ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b', 'I can pick it up today')$$),
    'ok', 'buyer writes to the seller');

-- Unread counts before the seller opens the chat
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000b', $$SELECT get_unread_chat_count()::text$$), '2', 'seller has 2 unread messages');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000b',
    $$SELECT unread_count || ',' || i_am_seller || ',' || listing_title FROM get_my_conversations()$$),
    '2,true,Desk lamp', 'conversation list shows the unread count, role and item');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT get_unread_chat_count()::text$$), '0', 'buyer has nothing unread');

-- Seller opens the chat
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$SELECT mark_chat_read('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c')$$),
    'ok', 'seller marks the chat read');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000b', $$SELECT get_unread_chat_count()::text$$), '0', 'seller has nothing unread after opening it');
SELECT is((SELECT count(*)::int FROM notifications
           WHERE user_id = '00000000-0000-0000-0000-00000000000b' AND kind = 'new_message' AND read_at IS NULL),
    0, 'opening the chat clears its message notification');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c',
    $$SELECT last_message_seen::text FROM get_my_conversations()$$),
    'true', 'buyer sees their last message as Seen');

-- Who can see and write read marks
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000d', $$SELECT count(*)::text FROM chat_reads$$),
    '0', 'someone outside the chat cannot see its read marks');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000d',
    $$SELECT mark_chat_read('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b')$$), 'ok', 'marking a chat you are not in does nothing');
SELECT is((SELECT count(*)::int FROM chat_reads WHERE user_id = '00000000-0000-0000-0000-00000000000d'),
    0, 'no read mark is stored for someone outside the chat');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$INSERT INTO chat_reads (user_id, listing_id, other_user_id) VALUES ('00000000-0000-0000-0000-00000000000c', '60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b')$$),
    'permission denied', 'read marks cannot be written directly');

SELECT * FROM finish();
ROLLBACK;
