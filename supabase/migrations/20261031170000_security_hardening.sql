-- 20261031170000_security_hardening.sql
-- Closes RLS gaps found in the 2026-10-31 review:
--   * users could write protected profile columns (is_admin, banned, rating_avg, ...)
--   * rating / report / counter triggers ran under RLS and silently updated nothing
--   * ratings could be given to anyone for any listing
--   * bidders could not revise bids, and bid rules were only enforced in the browser
--   * the college email domain was only checked in the browser
--   * chat messages could be sent to anyone under any listing

-- 'backup' is used by the bid dashboard but was missing from the enum
ALTER TYPE bid_status ADD VALUE IF NOT EXISTS 'backup';

-- Not defined in any migration, but the admin page used to call it. If it exists
-- it lets any signed-in user add warnings to anyone; the report trigger does this now.
DROP FUNCTION IF EXISTS public.increment_warning_count(uuid);

------------------------------------------------------------------------------
-- profiles: only the user-editable columns may be changed by the user
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Trusted code (SECURITY DEFINER triggers, service role, dashboard) is not restricted
    IF current_user NOT IN ('authenticated', 'anon') THEN
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.college_email IS DISTINCT FROM OLD.college_email
        OR NEW.verified IS DISTINCT FROM OLD.verified
        OR NEW.rating_avg IS DISTINCT FROM OLD.rating_avg
        OR NEW.total_items_sold IS DISTINCT FROM OLD.total_items_sold
        OR NEW.active_listings_count IS DISTINCT FROM OLD.active_listings_count
        OR NEW.banned IS DISTINCT FROM OLD.banned
        OR NEW.warning_count IS DISTINCT FROM OLD.warning_count
        OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
        RAISE EXCEPTION 'You can only change your name, year, branch and profile photo.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON profiles;
CREATE TRIGGER trg_protect_profile_columns
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE protect_profile_columns();

------------------------------------------------------------------------------
-- Triggers that update other users' profiles must bypass RLS
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, college_email, name)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_report_confirmation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_warning_count INTEGER;
BEGIN
    IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
        UPDATE profiles
        SET warning_count = warning_count + 1
        WHERE id = NEW.reported_user_id
        RETURNING warning_count INTO current_warning_count;

        IF current_warning_count >= 3 THEN
            UPDATE profiles SET banned = true WHERE id = NEW.reported_user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recount_active_listings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE profiles SET active_listings_count = (
            SELECT COUNT(*) FROM listings WHERE seller_id = NEW.seller_id AND status = 'active'
        ) WHERE id = NEW.seller_id;

        IF TG_OP = 'UPDATE' AND OLD.seller_id != NEW.seller_id THEN
            UPDATE profiles SET active_listings_count = (
                SELECT COUNT(*) FROM listings WHERE seller_id = OLD.seller_id AND status = 'active'
            ) WHERE id = OLD.seller_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profiles SET active_listings_count = (
            SELECT COUNT(*) FROM listings WHERE seller_id = OLD.seller_id AND status = 'active'
        ) WHERE id = OLD.seller_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recount instead of +/- 1 so toggling sold/active can't inflate the number
CREATE OR REPLACE FUNCTION update_items_sold()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE profiles SET total_items_sold = (
            SELECT COUNT(*) FROM listings WHERE seller_id = NEW.seller_id AND status = 'sold'
        ) WHERE id = NEW.seller_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_rating_avg()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target UUID := COALESCE(NEW.rated_user_id, OLD.rated_user_id);
BEGIN
    UPDATE profiles
    SET rating_avg = (
        SELECT COALESCE(ROUND(AVG(rating_value)::NUMERIC, 2), 0)
        FROM ratings
        WHERE rated_user_id = target
    )
    WHERE id = target;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Bring the counters in line, since the old triggers silently did nothing
UPDATE profiles p SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating_value)::NUMERIC, 2) FROM ratings r WHERE r.rated_user_id = p.id), 0),
    total_items_sold = (SELECT COUNT(*) FROM listings l WHERE l.seller_id = p.id AND l.status = 'sold'),
    active_listings_count = (SELECT COUNT(*) FROM listings l WHERE l.seller_id = p.id AND l.status = 'active');

------------------------------------------------------------------------------
-- Only college emails can sign up (previously only checked in the browser)
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_email_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF lower(NEW.email) NOT LIKE '%@stu.upes.ac.in' THEN
        RAISE EXCEPTION 'Only @stu.upes.ac.in email addresses are allowed';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_email_domain_trigger ON auth.users;
CREATE TRIGGER check_email_domain_trigger
    BEFORE INSERT OR UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.check_email_domain();

------------------------------------------------------------------------------
-- listings: the chosen buyer and backup can see the listing after it's sold
------------------------------------------------------------------------------
DROP POLICY IF EXISTS "listings_select_policy" ON listings;
CREATE POLICY "listings_select_policy"
ON listings FOR SELECT
TO authenticated
USING (
    status = 'active'
    OR seller_id = (SELECT auth.uid())
    OR selected_bidder_id = (SELECT auth.uid())
    OR backup_bidder_id = (SELECT auth.uid())
);

------------------------------------------------------------------------------
-- bids: bidders can revise their own bid; rules enforced in the database
------------------------------------------------------------------------------
DROP POLICY IF EXISTS "bids_update_policy" ON bids;
CREATE POLICY "bids_update_policy"
ON bids FOR UPDATE
TO authenticated
USING (
    bidder_id = (SELECT auth.uid())
    OR listing_id IN (SELECT id FROM listings WHERE seller_id = (SELECT auth.uid()))
)
WITH CHECK (
    bidder_id = (SELECT auth.uid())
    OR listing_id IN (SELECT id FROM listings WHERE seller_id = (SELECT auth.uid()))
);

CREATE OR REPLACE FUNCTION validate_bid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    l RECORD;
    uid UUID := auth.uid();
BEGIN
    SELECT seller_id, status, asking_price INTO l FROM listings WHERE id = NEW.listing_id;

    -- Trusted callers (no end-user JWT) are not restricted
    IF uid IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF l.seller_id = NEW.bidder_id THEN
            RAISE EXCEPTION 'You cannot bid on your own listing.';
        END IF;
        IF l.status != 'active' THEN
            RAISE EXCEPTION 'This listing is no longer accepting bids.';
        END IF;
        NEW.status := 'pending';
        NEW.bid_attempts := 1;
        RETURN NEW;
    END IF;

    -- UPDATE
    IF NEW.listing_id IS DISTINCT FROM OLD.listing_id
        OR NEW.bidder_id IS DISTINCT FROM OLD.bidder_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
        RAISE EXCEPTION 'Bid ownership cannot be changed.';
    END IF;

    IF uid = l.seller_id THEN
        -- Seller may only change the status
        IF NEW.bid_amount IS DISTINCT FROM OLD.bid_amount
            OR NEW.bid_attempts IS DISTINCT FROM OLD.bid_attempts
        THEN
            RAISE EXCEPTION 'Sellers can only change a bid''s status.';
        END IF;
        RETURN NEW;
    END IF;

    -- Bidder revising their own bid
    IF l.status != 'active' OR OLD.status != 'pending' THEN
        RAISE EXCEPTION 'This bid can no longer be changed.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'You cannot change the status of your bid.';
    END IF;
    IF OLD.bid_attempts >= 3 THEN
        RAISE EXCEPTION 'You have reached the maximum of 3 bid attempts on this listing.';
    END IF;
    NEW.bid_attempts := OLD.bid_attempts + 1;
    IF NEW.bid_amount < ROUND(l.asking_price * 0.70, 2) THEN
        RAISE EXCEPTION 'Bid amount must be at least 70%% of asking price (minimum: %)', ROUND(l.asking_price * 0.70, 2);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_bid ON bids;
CREATE TRIGGER trg_validate_bid
    BEFORE INSERT OR UPDATE ON bids
    FOR EACH ROW EXECUTE PROCEDURE validate_bid();

------------------------------------------------------------------------------
-- ratings: only the seller and the chosen buyer of a sold listing rate each other
------------------------------------------------------------------------------
DROP POLICY IF EXISTS "ratings_insert_policy" ON ratings;
CREATE POLICY "ratings_insert_policy"
ON ratings FOR INSERT
TO authenticated
WITH CHECK (
    rater_id = (SELECT auth.uid())
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
-- chat_messages: one side of the conversation must be the listing's seller
------------------------------------------------------------------------------
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON chat_messages;
CREATE POLICY "chat_messages_insert_policy"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND sender_id != recipient_id
    AND EXISTS (
        SELECT 1 FROM listings l
        WHERE l.id = listing_id
          AND (l.seller_id = sender_id OR l.seller_id = recipient_id)
    )
);

------------------------------------------------------------------------------
-- Storage: cap uploads at 5 MB and images only
------------------------------------------------------------------------------
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id IN ('listing-photos', 'profile-photos');
