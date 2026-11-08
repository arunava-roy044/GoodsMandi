-- 20261108190000_close_audit_gaps.sql
-- Closes gaps found in the 2026-11-08 audit:
--   1. a seller could name anyone as the buyer and mark the item sold (fake sales / ratings)
--   3. a seller could message any user on the site
--   4. banned users could still chat, report, rate, revise offers and edit listings
--   6. a seller could change the price, title or photos after offers came in
--   7. the database had no length limits on text
--   8. photo links could point to any website
--
-- "Trusted" callers (SQL editor, service role, SECURITY DEFINER triggers) have no
-- end-user JWT, so auth.uid() is NULL for them and they are not restricted.
-- New CHECK constraints are NOT VALID: they apply to new and changed rows only, so
-- this migration can't fail on old data. All limits are above what the site allows.

------------------------------------------------------------------------------
-- Helper: is this user banned?
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_banned(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE((SELECT banned FROM public.profiles WHERE id = uid), false);
$$;

REVOKE ALL ON FUNCTION public.is_banned(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO authenticated;

------------------------------------------------------------------------------
-- Photo links must be files in this project's storage, in the owner's folder
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_own_storage_url(url text, bucket text, owner uuid)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
    -- Project ref furntiuxjxzuevrqlpdw. If the Supabase project ever changes, update this.
    SELECT url IS NOT NULL
       AND starts_with(
            url,
            'https://furntiuxjxzuevrqlpdw.supabase.co/storage/v1/object/public/' || bucket || '/' || owner::text || '/'
       )
       AND url !~ '\.\.';
$$;

------------------------------------------------------------------------------
-- listings: one trigger for buyer rules, bans, locking after offers, photos
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    uid uuid := auth.uid();
    has_offers boolean;
    p text;
BEGIN
    IF uid IS NULL THEN
        RETURN NEW;
    END IF;

    -- Photos (8)
    IF TG_OP = 'INSERT' OR NEW.photos IS DISTINCT FROM OLD.photos THEN
        IF COALESCE(array_length(NEW.photos, 1), 0) > 5 THEN
            RAISE EXCEPTION 'A listing can have at most 5 photos.';
        END IF;
        FOREACH p IN ARRAY COALESCE(NEW.photos, '{}'::text[]) LOOP
            IF NOT public.is_own_storage_url(p, 'listing-photos', NEW.seller_id) THEN
                RAISE EXCEPTION 'Listing photos must be uploaded through GoodsMandi.';
            END IF;
        END LOOP;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- (1) New listings start active with no buyer
        IF NEW.status IS DISTINCT FROM 'active'
            OR NEW.selected_bidder_id IS NOT NULL
            OR NEW.backup_bidder_id IS NOT NULL
        THEN
            RAISE EXCEPTION 'New listings must start active, with no buyer chosen.';
        END IF;
        RETURN NEW;
    END IF;

    -- UPDATE
    IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
        RAISE EXCEPTION 'Listing ownership cannot be changed.';
    END IF;

    -- (4) A banned seller can only take their listing down
    IF public.is_banned(uid) THEN
        IF NEW.status = 'removed'
            AND (to_jsonb(NEW) - 'status') = (to_jsonb(OLD) - 'status')
        THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'Your account is restricted, so you can only remove your listings.';
    END IF;

    -- (1) Sold and removed are final
    IF OLD.status IN ('sold', 'removed') THEN
        IF NEW.status IS DISTINCT FROM OLD.status
            OR NEW.selected_bidder_id IS DISTINCT FROM OLD.selected_bidder_id
        THEN
            RAISE EXCEPTION 'This listing is closed and can''t be changed.';
        END IF;
    END IF;

    -- (1) The buyer must be someone who made an offer, and choosing one marks it sold
    IF NEW.selected_bidder_id IS DISTINCT FROM OLD.selected_bidder_id
        OR (NEW.status = 'sold' AND OLD.status IS DISTINCT FROM 'sold')
    THEN
        IF NEW.status IS DISTINCT FROM 'sold'
            OR NEW.selected_bidder_id IS NULL
            OR NOT EXISTS (
                SELECT 1 FROM bids b
                WHERE b.listing_id = NEW.id AND b.bidder_id = NEW.selected_bidder_id
            )
        THEN
            RAISE EXCEPTION 'You can only sell to someone who made an offer on this listing.';
        END IF;
    END IF;

    -- (1) Same for the backup buyer
    IF NEW.backup_bidder_id IS DISTINCT FROM OLD.backup_bidder_id AND NEW.backup_bidder_id IS NOT NULL THEN
        IF NEW.backup_bidder_id = NEW.selected_bidder_id
            OR NOT EXISTS (
                SELECT 1 FROM bids b
                WHERE b.listing_id = NEW.id AND b.bidder_id = NEW.backup_bidder_id
            )
        THEN
            RAISE EXCEPTION 'The backup buyer must be someone else who made an offer.';
        END IF;
    END IF;

    -- (6) Once offers exist, what buyers offered on can't change
    IF NEW.title IS DISTINCT FROM OLD.title
        OR NEW.description IS DISTINCT FROM OLD.description
        OR NEW.asking_price IS DISTINCT FROM OLD.asking_price
        OR NEW.category IS DISTINCT FROM OLD.category
        OR NEW.product_age IS DISTINCT FROM OLD.product_age
        OR NEW.photos IS DISTINCT FROM OLD.photos
    THEN
        SELECT EXISTS (SELECT 1 FROM bids WHERE listing_id = NEW.id) INTO has_offers;
        IF has_offers THEN
            RAISE EXCEPTION 'This listing already has offers, so its details can''t be changed.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_listing ON listings;
CREATE TRIGGER trg_protect_listing
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW EXECUTE PROCEDURE public.protect_listing();

------------------------------------------------------------------------------
-- bids: banned users can't revise offers either (4)
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_banned_bid_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Covers both sides: a banned bidder revising, or a banned seller accepting
    IF auth.uid() IS NOT NULL AND public.is_banned(auth.uid()) THEN
        RAISE EXCEPTION 'Your account is restricted, so you can''t change offers.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_banned_bid_update ON bids;
CREATE TRIGGER trg_block_banned_bid_update
    BEFORE UPDATE ON bids
    FOR EACH ROW EXECUTE PROCEDURE public.block_banned_bid_update();

------------------------------------------------------------------------------
-- profiles: profile photo must be the user's own upload (8)
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_profile_photo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL
        AND NEW.profile_photo_url IS DISTINCT FROM OLD.profile_photo_url
        AND NEW.profile_photo_url IS NOT NULL
        AND NOT public.is_own_storage_url(NEW.profile_photo_url, 'profile-photos', NEW.id)
    THEN
        RAISE EXCEPTION 'Profile photos must be uploaded through GoodsMandi.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_profile_photo ON profiles;
CREATE TRIGGER trg_check_profile_photo
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE public.check_profile_photo();

------------------------------------------------------------------------------
-- chat_messages: sellers may only message people who offered or wrote to them (3),
-- and banned users can't send messages (4)
------------------------------------------------------------------------------
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON chat_messages;
CREATE POLICY "chat_messages_insert_policy"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
    chat_messages.sender_id = (SELECT auth.uid())
    AND chat_messages.sender_id != chat_messages.recipient_id
    AND NOT public.is_banned((SELECT auth.uid()))
    AND EXISTS (
        SELECT 1 FROM listings l
        WHERE l.id = chat_messages.listing_id
          AND (
              -- a buyer writing to the seller (the listing must be visible to them)
              l.seller_id = chat_messages.recipient_id
              -- the seller writing to someone who made an offer or wrote first
              OR (
                  l.seller_id = chat_messages.sender_id
                  AND (
                      EXISTS (
                          SELECT 1 FROM bids b
                          WHERE b.listing_id = l.id AND b.bidder_id = chat_messages.recipient_id
                      )
                      OR EXISTS (
                          SELECT 1 FROM chat_messages m
                          WHERE m.listing_id = l.id
                            AND m.sender_id = chat_messages.recipient_id
                            AND m.recipient_id = chat_messages.sender_id
                      )
                  )
              )
          )
    )
);

------------------------------------------------------------------------------
-- reports and ratings: not from banned users (4); no reporting yourself
------------------------------------------------------------------------------
DROP POLICY IF EXISTS "reports_insert_policy" ON reports;
CREATE POLICY "reports_insert_policy"
ON reports FOR INSERT
TO authenticated
WITH CHECK (
    reporter_id = (SELECT auth.uid())
    AND reporter_id != reported_user_id
    AND NOT public.is_banned((SELECT auth.uid()))
);

DROP POLICY IF EXISTS "ratings_insert_policy" ON ratings;
CREATE POLICY "ratings_insert_policy"
ON ratings FOR INSERT
TO authenticated
WITH CHECK (
    rater_id = (SELECT auth.uid())
    AND NOT public.is_banned((SELECT auth.uid()))
    AND EXISTS (
        SELECT 1 FROM listings l
        WHERE l.id = listing_id
          AND l.status = 'sold'
          AND (
              (l.seller_id = (SELECT auth.uid()) AND rated_user_id = l.selected_bidder_id)
              OR (l.selected_bidder_id = (SELECT auth.uid()) AND rated_user_id = l.seller_id)
          )
    )
);

------------------------------------------------------------------------------
-- Length limits (7). The site's own limits are lower; these stop direct API abuse.
------------------------------------------------------------------------------
ALTER TABLE public.listings
    ADD CONSTRAINT listings_title_length CHECK (char_length(btrim(title)) BETWEEN 1 AND 150) NOT VALID,
    ADD CONSTRAINT listings_description_length CHECK (description IS NULL OR char_length(description) <= 2000) NOT VALID,
    ADD CONSTRAINT listings_availability_length CHECK (availability_window IS NULL OR char_length(availability_window) <= 300) NOT VALID,
    ADD CONSTRAINT listings_price_max CHECK (asking_price <= 1000000) NOT VALID;

ALTER TABLE public.bids
    ADD CONSTRAINT bids_amount_max CHECK (bid_amount <= 1000000) NOT VALID;

ALTER TABLE public.chat_messages
    ADD CONSTRAINT chat_messages_text_length CHECK (char_length(btrim(message_text)) BETWEEN 1 AND 2000) NOT VALID;

ALTER TABLE public.reports
    ADD CONSTRAINT reports_description_length CHECK (description IS NULL OR char_length(description) <= 2000) NOT VALID;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 100) NOT VALID,
    ADD CONSTRAINT profiles_branch_length CHECK (branch_course IS NULL OR char_length(branch_course) <= 100) NOT VALID,
    ADD CONSTRAINT profiles_year_range CHECK (year_of_study IS NULL OR year_of_study BETWEEN 1 AND 9) NOT VALID;
