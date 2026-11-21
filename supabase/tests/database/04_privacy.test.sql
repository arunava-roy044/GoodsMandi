-- Consent at sign-up, privacy requests, incident log, admin overview, data export.
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

SELECT plan(48);

-- Sign-up needs the three confirmations
SELECT throws_like($$INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'new1@stu.upes.ac.in')$$,
    '%18 or older%', 'sign-up without the consent details is refused');
SELECT throws_like($$INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (gen_random_uuid(), 'new2@stu.upes.ac.in', '{"adult_confirmed":false,"terms_accepted":true,"privacy_notice_version":"x"}')$$,
    '%18 or older%', 'sign-up without confirming 18+ is refused');
SELECT throws_like($$INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (gen_random_uuid(), 'new3@stu.upes.ac.in', '{"adult_confirmed":true,"terms_accepted":false,"privacy_notice_version":"x"}')$$,
    '%Terms%', 'sign-up without accepting the Terms is refused');
SELECT throws_like($$INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (gen_random_uuid(), 'new4@stu.upes.ac.in', '{"adult_confirmed":true,"terms_accepted":true}')$$,
    '%Privacy Notice%', 'sign-up without a notice version is refused');
SELECT is((SELECT count(*)::int FROM profiles WHERE college_email LIKE 'new%'), 0, 'refused sign-ups leave no profile behind');

-- Consent records
SELECT is((SELECT count(*)::int FROM consent_records WHERE notice_version = 'test' AND adult_confirmed AND terms_accepted), 4,
    'every valid sign-up has a consent record');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000b', $$SELECT count(*)::text FROM consent_records$$), '1', 'a user sees only their own consent record');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM consent_records$$), '4', 'admins see all consent records');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b', $$INSERT INTO consent_records (user_id, notice_version, adult_confirmed, terms_accepted) VALUES ('00000000-0000-0000-0000-00000000000b', 'fake', true, true)$$),
    'permission denied', 'users cannot write consent records');

-- Privacy requests
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c', $$INSERT INTO privacy_requests (user_id, kind, message, status, admin_note) VALUES ('00000000-0000-0000-0000-00000000000c', 'access', 'Please send me my data', 'resolved', 'self-approved')$$),
    'ok', 'a user can send a request');
SELECT is((SELECT status || '/' || COALESCE(admin_note, 'none') FROM privacy_requests WHERE user_id = '00000000-0000-0000-0000-00000000000c'), 'open/none',
    'a request always starts open, whatever the user sends');
SELECT ok((SELECT due_at > now() + interval '14 days' AND due_at < now() + interval '16 days' FROM privacy_requests WHERE user_id = '00000000-0000-0000-0000-00000000000c'),
    'a request is due in 15 days');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000d', $$SELECT count(*)::text FROM privacy_requests$$), '0', 'other students cannot see it');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT count(*)::text FROM privacy_requests$$), '1', 'the sender can see it');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT count(*)::text FROM privacy_requests$$), '1', 'admins can see it');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000c', $$UPDATE privacy_requests SET status = 'resolved'$$), 'permission denied', 'users cannot change a request''s status');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000c', $$INSERT INTO privacy_requests (user_id, kind, message) VALUES ('00000000-0000-0000-0000-00000000000b', 'access', 'in someone else''s name')$$),
    'row-level security', 'users cannot send a request in someone else''s name');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c', $$INSERT INTO privacy_requests (user_id, kind, message) VALUES ('00000000-0000-0000-0000-00000000000c', 'bogus', 'x')$$) ~ 'violates check constraint', true, 'unknown request kinds are refused');
DO $$ BEGIN FOR i IN 1..4 LOOP PERFORM tests.run_as('00000000-0000-0000-0000-00000000000c', format($q$INSERT INTO privacy_requests (user_id, kind, message) VALUES ('00000000-0000-0000-0000-00000000000c', 'other', 'request %s')$q$, i)); END LOOP; END $$;
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000c', $$INSERT INTO privacy_requests (user_id, kind, message) VALUES ('00000000-0000-0000-0000-00000000000c', 'other', 'one too many')$$),
    'at most 5 requests', 'at most 5 requests a day');

-- Handling requests
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b', $$SELECT admin_update_privacy_request((SELECT id FROM privacy_requests WHERE message = 'Please send me my data'), 'resolved')$$),
    'Only admins', 'only admins can handle a request');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_update_privacy_request((SELECT id FROM privacy_requests WHERE message = 'Please send me my data'), 'in_progress', 'Looking into it')$$),
    'ok', 'an admin can start handling a request');
SELECT is((SELECT status || '/' || admin_note || '/' || (resolved_at IS NULL)::text FROM privacy_requests WHERE message = 'Please send me my data'),
    'in_progress/Looking into it/true', 'status and note are saved; not resolved yet');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_update_privacy_request((SELECT id FROM privacy_requests WHERE message = 'Please send me my data'), 'resolved', 'Sent by email')$$),
    'ok', 'an admin can resolve it');
SELECT ok((SELECT resolved_at IS NOT NULL AND handled_by = '00000000-0000-0000-0000-00000000000a' FROM privacy_requests WHERE message = 'Please send me my data'),
    'resolving records when and by whom');
SELECT ok(EXISTS (SELECT 1 FROM notifications WHERE user_id = '00000000-0000-0000-0000-00000000000c' AND kind = 'privacy_request_update'), 'the person is notified');
SELECT ok(EXISTS (SELECT 1 FROM admin_actions WHERE action = 'privacy_request_resolved' AND target_user_id = '00000000-0000-0000-0000-00000000000c'), 'the admin action is logged');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000a', $$SELECT admin_update_privacy_request((SELECT id FROM privacy_requests LIMIT 1), 'bogus')$$),
    'Unknown status', 'unknown statuses are refused');

-- Overview and consent follow-up
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b', $$SELECT admin_privacy_overview()$$), 'Only admins', 'only admins see the overview');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT (admin_privacy_overview()->>'accounts') || '/' || (admin_privacy_overview()->>'without_consent') || '/' || (admin_privacy_overview()->'by_notice_version'->>'test')$$),
    '4/0/4', 'the overview counts accounts and consent');
DELETE FROM consent_records WHERE user_id = '00000000-0000-0000-0000-00000000000d';
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000a', $$SELECT string_agg(name, ',') FROM admin_users_without_consent()$$), (SELECT name FROM profiles WHERE id = '00000000-0000-0000-0000-00000000000d'),
    'accounts with no consent record are listed for follow-up');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b', $$SELECT * FROM admin_users_without_consent()$$), 'Only admins', 'only admins can list them');

-- Incident log
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000b', $$SELECT count(*)::text FROM breach_incidents$$), '0', 'non-admins see no incidents');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b', $$INSERT INTO breach_incidents (summary) VALUES ('sneaky')$$), 'row-level security', 'non-admins cannot log an incident');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000a', $$INSERT INTO breach_incidents (summary, people_affected, created_by) VALUES ('Test incident', 3, '00000000-0000-0000-0000-00000000000b')$$),
    'ok', 'an admin can log an incident');
SELECT is((SELECT created_by FROM breach_incidents WHERE summary = 'Test incident'), '00000000-0000-0000-0000-00000000000a'::uuid, 'the author is the signed-in admin, not what was sent');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000a', $$UPDATE breach_incidents SET status = 'closed', board_notified_at = now() WHERE summary = 'Test incident'$$),
    'ok', 'an admin can update it');
SELECT is((SELECT string_agg(action, ',' ORDER BY created_at, action) FROM admin_actions WHERE action LIKE 'incident_%'), 'incident_logged,incident_updated',
    'logging and updating are both recorded, once each');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000a', $$INSERT INTO breach_incidents (summary, status) VALUES ('x', 'weird')$$), 'violates check constraint', 'unknown incident statuses are refused');

-- Download my data
INSERT INTO public.listings (id, seller_id, title, category, asking_price, product_age) VALUES ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Desk lamp', 'Appliances', 100, 'new');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c', $$INSERT INTO bids (listing_id, bidder_id, bid_amount) VALUES ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 90)$$), 'ok', 'setup: an offer');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c', $$INSERT INTO chat_messages (listing_id, sender_id, recipient_id, message_text) VALUES ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b', 'Is it available?')$$), 'ok', 'setup: a message');
INSERT INTO public.reports (reporter_id, reported_user_id, category, description) VALUES ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', 'Scam', 'secret complaint text');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT export_my_data()->'account'->>'email'$$), 'buyer@stu.upes.ac.in', 'the export has the caller''s email');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT jsonb_array_length(export_my_data()->'offers_made')::text || '/' || jsonb_array_length(export_my_data()->'messages')::text$$), '1/1', 'the export has the caller''s offers and messages');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT jsonb_array_length(export_my_data()->'listings')::text$$), '0', 'it does not include other people''s listings');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT (position('secret complaint text' in export_my_data()::text) > 0)::text$$), 'false', 'it leaves out reports about the caller');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000c', $$SELECT jsonb_array_length(export_my_data()->'consent_records')::text$$), '1', 'it includes the caller''s consent record');
SELECT is(tests.value_as('00000000-0000-0000-0000-00000000000b', $$SELECT jsonb_array_length(export_my_data()->'listings')::text$$), '1', 'a seller''s export has their listing');
SELECT ok(NOT has_function_privilege('anon', 'public.export_my_data()', 'EXECUTE'), 'signed-out visitors cannot export');
SELECT hasnt_function('public', 'delete_my_account', 'the old delete function is gone');

SELECT * FROM finish();
ROLLBACK;
