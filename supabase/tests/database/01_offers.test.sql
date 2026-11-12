-- Offer flow: make, accept, backup, switch, relist, withdraw, rate.
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

SELECT plan(32);

-- Listing with three offers: buyers c and d, plus admin a
INSERT INTO public.listings (id, seller_id, title, category, asking_price, product_age)
VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Desk lamp', 'Appliances', 100, '1-2 years');

SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$INSERT INTO bids (listing_id, bidder_id, bid_amount) VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 90)$$),
    'ok', 'buyer can make an offer');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000d',
    $$INSERT INTO bids (listing_id, bidder_id, bid_amount) VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 80)$$),
    'ok', 'second buyer can make an offer');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000a',
    $$INSERT INTO bids (listing_id, bidder_id, bid_amount) VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 75)$$),
    'ok', 'third buyer can make an offer');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$INSERT INTO bids (listing_id, bidder_id, bid_amount) VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 90)$$),
    'row-level security|own listing', 'cannot make an offer in someone else''s name');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$INSERT INTO bids (listing_id, bidder_id, bid_amount) VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 90)$$),
    'own listing', 'seller cannot offer on their own listing');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$UPDATE bids SET bid_amount = 50 WHERE bidder_id = '00000000-0000-0000-0000-00000000000c'$$),
    'at least 70%', 'offers under 70% of the price are refused');
SELECT is((SELECT count(*)::int FROM notifications WHERE user_id = '00000000-0000-0000-0000-00000000000b' AND kind = 'new_offer'),
    3, 'seller is notified of each new offer');

-- Sellers can no longer set sale fields directly
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$UPDATE bids SET status = 'selected' WHERE bidder_id = '00000000-0000-0000-0000-00000000000c'$$),
    'Accept and Make backup', 'seller cannot change an offer''s status directly');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$UPDATE listings SET status = 'sold', selected_bidder_id = '00000000-0000-0000-0000-00000000000c' WHERE id = '10000000-0000-0000-0000-000000000001'$$),
    'Accept and Make backup', 'seller cannot mark the listing sold directly');

-- Accept
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$SELECT accept_offer((SELECT id FROM bids WHERE bidder_id = '00000000-0000-0000-0000-00000000000c'))$$),
    'Listing not found', 'a buyer cannot accept an offer');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$SELECT accept_offer((SELECT id FROM bids WHERE bidder_id = '00000000-0000-0000-0000-00000000000c'))$$),
    'ok', 'seller accepts an offer');
SELECT results_eq(
    $$SELECT status::text, selected_bidder_id FROM listings WHERE id = '10000000-0000-0000-0000-000000000001'$$,
    $$VALUES ('sold', '00000000-0000-0000-0000-00000000000c'::uuid)$$,
    'listing is sold to the accepted buyer');
SELECT results_eq(
    $$SELECT bidder_id, status::text FROM bids WHERE listing_id = '10000000-0000-0000-0000-000000000001' ORDER BY bid_amount DESC$$,
    $$VALUES ('00000000-0000-0000-0000-00000000000c'::uuid, 'selected'), ('00000000-0000-0000-0000-00000000000d'::uuid, 'rejected'), ('00000000-0000-0000-0000-00000000000a'::uuid, 'rejected')$$,
    'accepted offer is selected and the others declined');
SELECT ok(EXISTS (SELECT 1 FROM notifications WHERE user_id = '00000000-0000-0000-0000-00000000000c' AND kind = 'offer_accepted' AND listing_id = '10000000-0000-0000-0000-000000000001'),
    'buyer is told their offer was accepted');
SELECT ok(EXISTS (SELECT 1 FROM notifications WHERE user_id = '00000000-0000-0000-0000-00000000000d' AND kind = 'listing_sold' AND listing_id = '10000000-0000-0000-0000-000000000001'),
    'other buyers are told it sold');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$SELECT accept_offer((SELECT id FROM bids WHERE bidder_id = '00000000-0000-0000-0000-00000000000d'))$$),
    'no longer active', 'a sold listing cannot accept another offer');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$SELECT withdraw_offer('10000000-0000-0000-0000-000000000001')$$),
    'already responded', 'an accepted offer cannot be withdrawn');

-- Backup, then switch to the backup
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$SELECT set_backup_buyer((SELECT id FROM bids WHERE bidder_id = '00000000-0000-0000-0000-00000000000d'))$$),
    'ok', 'seller picks a backup buyer');
SELECT is((SELECT backup_bidder_id FROM listings WHERE id = '10000000-0000-0000-0000-000000000001'),
    '00000000-0000-0000-0000-00000000000d'::uuid, 'backup buyer is recorded');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$SELECT promote_backup_buyer('10000000-0000-0000-0000-000000000001')$$),
    'ok', 'seller switches to the backup buyer');
SELECT results_eq(
    $$SELECT selected_bidder_id, backup_bidder_id FROM listings WHERE id = '10000000-0000-0000-0000-000000000001'$$,
    $$VALUES ('00000000-0000-0000-0000-00000000000d'::uuid, NULL::uuid)$$,
    'backup is now the buyer');
SELECT ok(EXISTS (SELECT 1 FROM notifications WHERE user_id = '00000000-0000-0000-0000-00000000000c' AND kind = 'deal_cancelled' AND listing_id = '10000000-0000-0000-0000-000000000001'),
    'the first buyer is told the deal is off');

-- Relist: the buyer who fell through is declined, others can be accepted again
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$SELECT relist_listing('10000000-0000-0000-0000-000000000001')$$),
    'ok', 'seller relists after the sale falls through');
SELECT results_eq(
    $$SELECT status::text, selected_bidder_id FROM listings WHERE id = '10000000-0000-0000-0000-000000000001'$$,
    $$VALUES ('active', NULL::uuid)$$,
    'listing is active again');
SELECT results_eq(
    $$SELECT bidder_id, status::text FROM bids WHERE listing_id = '10000000-0000-0000-0000-000000000001' ORDER BY bid_amount DESC$$,
    $$VALUES ('00000000-0000-0000-0000-00000000000c'::uuid, 'pending'), ('00000000-0000-0000-0000-00000000000d'::uuid, 'rejected'), ('00000000-0000-0000-0000-00000000000a'::uuid, 'pending')$$,
    'the no-show is declined; the other offers are open again');

-- Withdraw
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000a',
    $$SELECT withdraw_offer('10000000-0000-0000-0000-000000000001')$$),
    'ok', 'buyer withdraws a waiting offer');
SELECT is((SELECT count(*)::int FROM bids WHERE bidder_id = '00000000-0000-0000-0000-00000000000a'),
    0, 'withdrawn offer is gone');

-- Accept again, then ratings lock the buyer
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$SELECT accept_offer((SELECT id FROM bids WHERE bidder_id = '00000000-0000-0000-0000-00000000000c'))$$),
    'ok', 'a relisted item can be sold again');
SELECT is(tests.run_as('00000000-0000-0000-0000-00000000000c',
    $$INSERT INTO ratings (listing_id, rater_id, rated_user_id, rating_value) VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b', 5)$$),
    'ok', 'buyer rates the seller');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000d',
    $$INSERT INTO ratings (listing_id, rater_id, rated_user_id, rating_value) VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000b', 1)$$),
    'row-level security', 'someone who didn''t buy cannot rate');
SELECT matches(tests.run_as('00000000-0000-0000-0000-00000000000b',
    $$SELECT relist_listing('10000000-0000-0000-0000-000000000001')$$),
    'already been rated', 'a rated sale cannot be relisted');
SELECT is((SELECT rating_avg FROM profiles WHERE id = '00000000-0000-0000-0000-00000000000b'),
    5.00::numeric, 'seller rating average is updated');

SELECT * FROM finish();
ROLLBACK;
