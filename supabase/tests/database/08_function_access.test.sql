-- Function access: has_messaged only answers for the people involved, and the
-- rls_auto_enable helper is not reachable through the API.
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

-- Users: b seller, c buyer who writes to the seller, d stranger
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    ('00000000-0000-0000-0000-00000000000b', 'seller@stu.upes.ac.in', '{"adult_confirmed":true,"terms_accepted":true,"privacy_notice_version":"test"}'::jsonb),
    ('00000000-0000-0000-0000-00000000000c', 'buyer@stu.upes.ac.in', '{"adult_confirmed":true,"terms_accepted":true,"privacy_notice_version":"test"}'::jsonb),
    ('00000000-0000-0000-0000-00000000000d', 'stranger@stu.upes.ac.in', '{"adult_confirmed":true,"terms_accepted":true,"privacy_notice_version":"test"}'::jsonb);

SELECT plan(9);

INSERT INTO public.listings (id, seller_id, title, category, asking_price, product_age) VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Desk lamp', 'Appliances', 500, '1-2 years');
-- c writes to the seller (trusted insert, no rules involved)
INSERT INTO public.chat_messages (listing_id, sender_id, recipient_id, message_text)
    VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b', 'Is it still available?');

-- has_messaged only answers for the two people involved
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c',
    $$SELECT public.has_messaged('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b')$$),
    'true', 'the sender can ask whether they messaged someone');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000b',
    $$SELECT public.has_messaged('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b')$$),
    'true', 'the recipient can ask whether they were messaged');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000d',
    $$SELECT public.has_messaged('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b')$$),
    'false', 'a stranger cannot find out who messaged whom');

-- The chat rule that uses it still works
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$INSERT INTO public.chat_messages (listing_id, sender_id, recipient_id, message_text) VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', 'Yes, come by 5pm')$$),
    'ok', 'the seller can still reply to someone who wrote first');
SELECT isnt(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$INSERT INTO public.chat_messages (listing_id, sender_id, recipient_id, message_text) VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d', 'Hello stranger')$$),
    'ok', 'the seller still cannot start a chat with someone who never wrote');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$INSERT INTO public.chat_messages (listing_id, sender_id, recipient_id, message_text) VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b', 'Can you do 450?')$$),
    'ok', 'a buyer can still message the seller');

-- The helper Supabase adds is closed to the public API (if this project has it)
SELECT ok(CASE WHEN to_regprocedure('public.rls_auto_enable()') IS NULL THEN true
          ELSE NOT has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE') END,
    'signed-out visitors cannot run rls_auto_enable');
SELECT ok(CASE WHEN to_regprocedure('public.rls_auto_enable()') IS NULL THEN true
          ELSE NOT has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE') END,
    'signed-in users cannot run rls_auto_enable');
-- ...and the two functions the rules need are still callable
SELECT ok(has_function_privilege('authenticated', 'public.has_messaged(uuid, uuid, uuid)', 'EXECUTE'),
    'has_messaged is still callable by the chat rule');

SELECT * FROM finish();
ROLLBACK;
