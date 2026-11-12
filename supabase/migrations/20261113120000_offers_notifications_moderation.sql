-- 20261113120000_offers_notifications_moderation.sql
--   1. Offers: accept / backup / switch to backup / relist / withdraw run as single
--      database functions, and sellers can no longer set offer or sale fields directly
--   2. In-app notifications
--   3. Listings with no activity for 60 days expire; sellers can renew them
--   4. Banning a user takes their listings down; unbanning puts them back
--   5. Listings with prohibited words are flagged for admins (still posted)
--   6. A report's listing must belong to the reported user, or they offered on it or chatted about it
--   7. Listing photos can't be deleted once the listing has offers or is sold
--   8. Browse search, filters, sorting and paging run in the database
--   9. Users can no longer hard-delete listings (the app only ever soft-deletes)
--
-- As before, auth.uid() IS NULL means trusted code (SQL editor, service role, cron,
-- or a function that checked the caller and called public.enter_trusted_mode()).
-- Re-running this file is safe.

------------------------------------------------------------------------------
-- New listing columns (system-managed; users can't set them)
------------------------------------------------------------------------------
ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS removed_reason text,
    ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS active_since timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_removed_reason_check;
ALTER TABLE public.listings
    ADD CONSTRAINT listings_removed_reason_check
    CHECK (removed_reason IS NULL OR removed_reason IN ('seller', 'admin', 'banned', 'expired'));

-- Existing listings count as active since they were posted
UPDATE public.listings SET active_since = created_at WHERE active_since > created_at;

------------------------------------------------------------------------------
-- 2. Notifications (created first: the functions below write to it)
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN (
        'new_offer', 'offer_changed', 'offer_accepted', 'listing_sold', 'backup_chosen',
        'deal_cancelled', 'listing_relisted', 'new_message', 'report_reviewed',
        'warning_received', 'account_banned', 'account_unbanned', 'listing_removed',
        'listing_expired'
    )),
    listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
       )
    THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- Internal: only called from SECURITY DEFINER code
CREATE OR REPLACE FUNCTION public.notify(p_user uuid, p_kind text, p_listing uuid DEFAULT NULL, p_actor uuid DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO notifications (user_id, kind, listing_id, actor_id)
    SELECT p_user, p_kind, p_listing, p_actor
    WHERE p_user IS NOT NULL AND p_user IS DISTINCT FROM p_actor;
$$;
REVOKE ALL ON FUNCTION public.notify(uuid, text, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Marks the caller's notifications read: the given ones, or all when p_ids is NULL
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids uuid[] DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE notifications SET read_at = now()
    WHERE user_id = auth.uid()
      AND read_at IS NULL
      AND (p_ids IS NULL OR id = ANY (p_ids));
$$;
REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;

-- New offers, changed offers
CREATE OR REPLACE FUNCTION public.notify_on_bid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    seller uuid;
BEGIN
    SELECT seller_id INTO seller FROM listings WHERE id = NEW.listing_id;
    IF TG_OP = 'INSERT' THEN
        PERFORM notify(seller, 'new_offer', NEW.listing_id, NEW.bidder_id);
    ELSIF NEW.bid_amount IS DISTINCT FROM OLD.bid_amount THEN
        PERFORM notify(seller, 'offer_changed', NEW.listing_id, NEW.bidder_id);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_bid ON bids;
CREATE TRIGGER trg_notify_on_bid
    AFTER INSERT OR UPDATE OF bid_amount ON bids
    FOR EACH ROW EXECUTE PROCEDURE public.notify_on_bid();

-- New messages: one unread notification per conversation, bumped on each message
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE notifications SET created_at = now()
    WHERE user_id = NEW.recipient_id
      AND kind = 'new_message'
      AND listing_id = NEW.listing_id
      AND actor_id = NEW.sender_id
      AND read_at IS NULL;
    IF NOT FOUND THEN
        PERFORM notify(NEW.recipient_id, 'new_message', NEW.listing_id, NEW.sender_id);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_message ON chat_messages;
CREATE TRIGGER trg_notify_on_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE PROCEDURE public.notify_on_message();

-- Report decisions
CREATE OR REPLACE FUNCTION public.notify_on_report_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status = 'pending' AND NEW.status IN ('confirmed', 'dismissed') THEN
        PERFORM notify(NEW.reporter_id, 'report_reviewed', NEW.reported_listing_id, NULL);
        IF NEW.status = 'confirmed' THEN
            PERFORM notify(NEW.reported_user_id, 'warning_received', NEW.reported_listing_id, NULL);
        END IF;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_report_review ON reports;
CREATE TRIGGER trg_notify_on_report_review
    AFTER UPDATE OF status ON reports
    FOR EACH ROW EXECUTE PROCEDURE public.notify_on_report_review();

------------------------------------------------------------------------------
-- 5. Prohibited words (server copy of PROHIBITED_KEYWORDS in src/lib/constants.ts)
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prohibited_words_in(p_text text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
    -- Whole-word match with an optional plural "s", like the sell form
    SELECT COALESCE(array_agg(w), '{}')
    FROM unnest(ARRAY[
        'alcohol', 'beer', 'wine', 'liquor', 'vodka', 'whiskey', 'rum',
        'tobacco', 'cigarette', 'vape', 'e-cigarette',
        'drug', 'marijuana', 'weed', 'cannabis', 'cocaine', 'heroin',
        'weapon', 'gun', 'knife', 'sword', 'firearm', 'ammunition',
        'stolen', 'counterfeit', 'fake id', 'forged',
        'exam paper', 'leaked exam', 'answer key', 'cheat sheet',
        'pharmaceutical', 'prescription', 'controlled substance'
    ]) AS w
    WHERE lower(COALESCE(p_text, '')) ~ ('(^|[^a-z0-9])' || regexp_replace(w, '([.*+?^${}()|\[\]\\-])', '\\\1', 'g') || 's?($|[^a-z0-9])');
$$;

-- Runs after trg_protect_listing (triggers fire in name order)
CREATE OR REPLACE FUNCTION public.flag_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL AND TG_OP = 'UPDATE' THEN
        RETURN NEW;   -- trusted code (e.g. an admin clearing the flag) decides
    END IF;
    IF TG_OP = 'INSERT'
        OR NEW.title IS DISTINCT FROM OLD.title
        OR NEW.description IS DISTINCT FROM OLD.description
    THEN
        NEW.flagged := cardinality(prohibited_words_in(NEW.title || ' ' || COALESCE(NEW.description, ''))) > 0;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_zz_flag_listing ON listings;
CREATE TRIGGER trg_zz_flag_listing
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW EXECUTE PROCEDURE public.flag_listing();

------------------------------------------------------------------------------
-- 1. Listings: sellers may edit details and remove; everything else goes
--    through the functions below
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

    -- Photos must be the seller's own uploads
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
        IF NEW.status IS DISTINCT FROM 'active'
            OR NEW.selected_bidder_id IS NOT NULL
            OR NEW.backup_bidder_id IS NOT NULL
        THEN
            RAISE EXCEPTION 'New listings must start active, with no buyer chosen.';
        END IF;
        NEW.removed_reason := NULL;
        NEW.active_since := now();
        RETURN NEW;
    END IF;

    -- UPDATE
    IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
        RAISE EXCEPTION 'Listing ownership cannot be changed.';
    END IF;

    IF NEW.removed_reason IS DISTINCT FROM OLD.removed_reason
        OR NEW.flagged IS DISTINCT FROM OLD.flagged
        OR NEW.active_since IS DISTINCT FROM OLD.active_since
    THEN
        RAISE EXCEPTION 'These listing fields are managed by GoodsMandi.';
    END IF;

    IF NEW.selected_bidder_id IS DISTINCT FROM OLD.selected_bidder_id
        OR NEW.backup_bidder_id IS DISTINCT FROM OLD.backup_bidder_id
    THEN
        RAISE EXCEPTION 'Choose buyers with the Accept and Make backup buttons.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- The only status change a seller makes directly: taking an active listing down
        IF OLD.status = 'active' AND NEW.status = 'removed' THEN
            IF public.is_banned(uid)
                AND (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status')
            THEN
                RAISE EXCEPTION 'Your account is restricted, so you can only remove your listings.';
            END IF;
            NEW.removed_reason := 'seller';
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'Use the Accept, Relist or Renew buttons to change a listing''s status.';
    END IF;

    -- Any other edit
    IF public.is_banned(uid) THEN
        RAISE EXCEPTION 'Your account is restricted, so you can only remove your listings.';
    END IF;
    IF OLD.status <> 'active' THEN
        RAISE EXCEPTION 'This listing is closed and can''t be changed.';
    END IF;
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

------------------------------------------------------------------------------
-- 1. Bids: bidders revise their own pending offer; sellers use the functions
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_bid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    l RECORD;
    uid uuid := auth.uid();
BEGIN
    IF uid IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT seller_id, status, asking_price INTO l FROM listings WHERE id = NEW.listing_id;

    IF TG_OP = 'INSERT' THEN
        IF l.seller_id = NEW.bidder_id THEN
            RAISE EXCEPTION 'You cannot bid on your own listing.';
        END IF;
        IF l.status IS DISTINCT FROM 'active' THEN
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

    IF uid IS DISTINCT FROM OLD.bidder_id THEN
        RAISE EXCEPTION 'Use the Accept and Make backup buttons to respond to offers.';
    END IF;

    IF l.status <> 'active' OR OLD.status <> 'pending' THEN
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

------------------------------------------------------------------------------
-- 1. Offer functions
------------------------------------------------------------------------------

-- Loads the caller's listing for a seller action, locked, or raises
CREATE OR REPLACE FUNCTION public.seller_listing_for_update(p_listing uuid)
RETURNS public.listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    l listings;
BEGIN
    SELECT * INTO l FROM listings WHERE id = p_listing FOR UPDATE;
    IF NOT FOUND OR l.seller_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Listing not found.';
    END IF;
    IF public.is_banned(auth.uid()) THEN
        RAISE EXCEPTION 'Your account is restricted, so you can only remove your listings.';
    END IF;
    RETURN l;
END;
$$;
REVOKE ALL ON FUNCTION public.seller_listing_for_update(uuid) FROM PUBLIC, anon, authenticated;

-- Accept one offer: it is selected, the other waiting offers are declined, the item is sold
CREATE OR REPLACE FUNCTION public.accept_offer(p_bid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    b bids;
    l listings;
    me uuid := auth.uid();
    other uuid;
BEGIN
    SELECT * INTO b FROM bids WHERE id = p_bid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer not found.';
    END IF;
    l := public.seller_listing_for_update(b.listing_id);
    IF l.status <> 'active' THEN
        RAISE EXCEPTION 'This listing is no longer active.';
    END IF;
    IF b.status <> 'pending' THEN
        RAISE EXCEPTION 'This offer can no longer be accepted.';
    END IF;
    IF public.is_banned(b.bidder_id) THEN
        RAISE EXCEPTION 'This buyer''s account is restricted. Choose another offer.';
    END IF;

    PERFORM public.enter_trusted_mode();

    UPDATE bids SET status = 'selected' WHERE id = b.id;
    FOR other IN
        UPDATE bids SET status = 'rejected'
        WHERE listing_id = l.id AND id <> b.id AND status = 'pending'
        RETURNING bidder_id
    LOOP
        PERFORM notify(other, 'listing_sold', l.id, me);
    END LOOP;
    UPDATE listings SET status = 'sold', selected_bidder_id = b.bidder_id WHERE id = l.id;

    PERFORM notify(b.bidder_id, 'offer_accepted', l.id, me);
END;
$$;

-- Pick a backup buyer for a sold listing (replaces any earlier backup)
CREATE OR REPLACE FUNCTION public.set_backup_buyer(p_bid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    b bids;
    l listings;
BEGIN
    SELECT * INTO b FROM bids WHERE id = p_bid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer not found.';
    END IF;
    l := public.seller_listing_for_update(b.listing_id);
    IF l.status <> 'sold' THEN
        RAISE EXCEPTION 'Accept an offer before choosing a backup buyer.';
    END IF;
    IF b.status NOT IN ('pending', 'rejected') OR b.bidder_id = l.selected_bidder_id THEN
        RAISE EXCEPTION 'This offer can''t be the backup.';
    END IF;
    IF public.is_banned(b.bidder_id) THEN
        RAISE EXCEPTION 'This buyer''s account is restricted. Choose another offer.';
    END IF;

    PERFORM public.enter_trusted_mode();

    UPDATE bids SET status = 'rejected' WHERE listing_id = l.id AND status = 'backup';
    UPDATE bids SET status = 'backup' WHERE id = b.id;
    UPDATE listings SET backup_bidder_id = b.bidder_id WHERE id = l.id;

    PERFORM notify(b.bidder_id, 'backup_chosen', l.id, l.seller_id);
END;
$$;

-- The buyer fell through: the backup becomes the buyer
CREATE OR REPLACE FUNCTION public.promote_backup_buyer(p_listing uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    l listings;
    old_buyer uuid;
BEGIN
    l := public.seller_listing_for_update(p_listing);
    IF l.status <> 'sold' OR l.backup_bidder_id IS NULL THEN
        RAISE EXCEPTION 'There is no backup buyer for this listing.';
    END IF;
    IF EXISTS (SELECT 1 FROM ratings WHERE listing_id = l.id) THEN
        RAISE EXCEPTION 'This sale has already been rated, so the buyer can''t be changed.';
    END IF;
    IF public.is_banned(l.backup_bidder_id) THEN
        RAISE EXCEPTION 'The backup buyer''s account is restricted. Relist the item instead.';
    END IF;
    old_buyer := l.selected_bidder_id;

    PERFORM public.enter_trusted_mode();

    UPDATE bids SET status = 'rejected' WHERE listing_id = l.id AND bidder_id = old_buyer;
    UPDATE bids SET status = 'selected' WHERE listing_id = l.id AND bidder_id = l.backup_bidder_id;
    UPDATE listings SET selected_bidder_id = l.backup_bidder_id, backup_bidder_id = NULL WHERE id = l.id;

    PERFORM notify(old_buyer, 'deal_cancelled', l.id, l.seller_id);
    PERFORM notify(l.backup_bidder_id, 'offer_accepted', l.id, l.seller_id);
END;
$$;

-- The sale fell through: put the listing back up. The buyer who fell through is
-- declined; everyone else's offer is open again.
CREATE OR REPLACE FUNCTION public.relist_listing(p_listing uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    l listings;
    other uuid;
BEGIN
    l := public.seller_listing_for_update(p_listing);
    IF l.status <> 'sold' THEN
        RAISE EXCEPTION 'Only sold listings can be relisted.';
    END IF;
    IF EXISTS (SELECT 1 FROM ratings WHERE listing_id = l.id) THEN
        RAISE EXCEPTION 'This sale has already been rated, so it can''t be relisted.';
    END IF;

    PERFORM public.enter_trusted_mode();

    UPDATE bids SET status = 'rejected' WHERE listing_id = l.id AND bidder_id = l.selected_bidder_id;
    FOR other IN
        UPDATE bids SET status = 'pending'
        WHERE listing_id = l.id AND bidder_id IS DISTINCT FROM l.selected_bidder_id
          AND status IN ('rejected', 'backup')
        RETURNING bidder_id
    LOOP
        PERFORM notify(other, 'listing_relisted', l.id, l.seller_id);
    END LOOP;
    UPDATE listings
    SET status = 'active', selected_bidder_id = NULL, backup_bidder_id = NULL,
        removed_reason = NULL, active_since = now()
    WHERE id = l.id;

    PERFORM notify(l.selected_bidder_id, 'deal_cancelled', l.id, l.seller_id);
END;
$$;

-- A buyer takes back an offer that is still waiting
CREATE OR REPLACE FUNCTION public.withdraw_offer(p_listing uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    b bids;
BEGIN
    SELECT * INTO b FROM bids WHERE listing_id = p_listing AND bidder_id = auth.uid() FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'You have no offer on this listing.';
    END IF;
    IF b.status <> 'pending' THEN
        RAISE EXCEPTION 'The seller has already responded to your offer, so it can''t be withdrawn.';
    END IF;
    DELETE FROM bids WHERE id = b.id;
END;
$$;

------------------------------------------------------------------------------
-- 3. Expiry and renewal
------------------------------------------------------------------------------

-- Listings active for 60+ days with no new offer in the last 14 days
CREATE OR REPLACE FUNCTION public.expire_stale_listings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    n integer := 0;
BEGIN
    PERFORM public.enter_trusted_mode();
    FOR r IN
        UPDATE listings l SET status = 'removed', removed_reason = 'expired'
        WHERE l.status = 'active'
          AND l.active_since < now() - interval '60 days'
          AND NOT EXISTS (
              SELECT 1 FROM bids b WHERE b.listing_id = l.id AND b.created_at > now() - interval '14 days'
          )
        RETURNING l.id, l.seller_id
    LOOP
        PERFORM notify(r.seller_id, 'listing_expired', r.id, NULL);
        n := n + 1;
    END LOOP;
    RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_stale_listings() FROM PUBLIC, anon, authenticated;

-- Seller puts an expired listing back up
CREATE OR REPLACE FUNCTION public.renew_listing(p_listing uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    l listings;
BEGIN
    l := public.seller_listing_for_update(p_listing);
    IF l.status <> 'removed' OR l.removed_reason IS DISTINCT FROM 'expired' THEN
        RAISE EXCEPTION 'Only expired listings can be renewed.';
    END IF;
    IF (SELECT count(*) FROM listings WHERE seller_id = l.seller_id AND status = 'active') >= 20 THEN
        RAISE EXCEPTION 'You can have at most 20 active listings. Mark some as sold or remove them first.';
    END IF;

    PERFORM public.enter_trusted_mode();
    UPDATE listings SET status = 'active', removed_reason = NULL, active_since = now() WHERE id = l.id;
END;
$$;

-- Daily at 03:17 UTC, where pg_cron is available (Supabase: Database > Extensions)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        PERFORM cron.schedule('goodsmandi-expire-listings', '17 3 * * *', 'SELECT public.expire_stale_listings()');
    ELSE
        RAISE NOTICE 'pg_cron is not available: run SELECT public.expire_stale_listings() daily another way.';
    END IF;
END $$;

------------------------------------------------------------------------------
-- 4. Bans take listings down; unbans put them back
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_ban_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.banned IS NOT DISTINCT FROM OLD.banned THEN
        RETURN NULL;
    END IF;
    -- banned can only be changed by trusted code (protect_profile_columns)
    PERFORM public.enter_trusted_mode();

    IF NEW.banned THEN
        UPDATE listings SET status = 'removed', removed_reason = 'banned'
        WHERE seller_id = NEW.id AND status = 'active';
        UPDATE bids b SET status = 'rejected'
        FROM listings l
        WHERE b.listing_id = l.id AND l.status = 'active'
          AND b.bidder_id = NEW.id AND b.status = 'pending';
        PERFORM notify(NEW.id, 'account_banned', NULL, NULL);
    ELSE
        UPDATE listings SET status = 'active', removed_reason = NULL, active_since = now()
        WHERE seller_id = NEW.id AND status = 'removed' AND removed_reason = 'banned';
        PERFORM notify(NEW.id, 'account_unbanned', NULL, NULL);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_ban_change ON profiles;
CREATE TRIGGER trg_apply_ban_change
    AFTER UPDATE OF banned ON profiles
    FOR EACH ROW EXECUTE PROCEDURE public.apply_ban_change();

-- Admin removal now records why, and tells the seller
CREATE OR REPLACE FUNCTION public.admin_remove_listing(target_listing uuid, reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin uuid := auth.uid();
    seller uuid;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can do this.';
    END IF;
    PERFORM public.enter_trusted_mode();

    UPDATE listings SET status = 'removed', removed_reason = 'admin'
    WHERE id = target_listing AND status = 'active'
    RETURNING seller_id INTO seller;
    IF seller IS NULL THEN
        RAISE EXCEPTION 'Listing not found, or it is already sold or removed.';
    END IF;

    INSERT INTO admin_actions (admin_id, action, target_user_id, target_listing_id, reason)
    VALUES (admin, 'remove_listing', seller, target_listing, reason);
    PERFORM notify(seller, 'listing_removed', target_listing, NULL);
END;
$$;

-- Admin marks a flagged listing as fine
CREATE OR REPLACE FUNCTION public.admin_clear_flag(target_listing uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin uuid := auth.uid();
    seller uuid;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can do this.';
    END IF;
    PERFORM public.enter_trusted_mode();

    UPDATE listings SET flagged = false WHERE id = target_listing AND flagged
    RETURNING seller_id INTO seller;
    IF seller IS NULL THEN
        RAISE EXCEPTION 'Listing not found, or it isn''t flagged.';
    END IF;

    INSERT INTO admin_actions (admin_id, action, target_user_id, target_listing_id)
    VALUES (admin, 'clear_flag', seller, target_listing);
END;
$$;

------------------------------------------------------------------------------
-- 6. Reports: a reported listing must involve the reported user
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.limit_reports()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;
    IF NEW.reported_listing_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM listings l
        WHERE l.id = NEW.reported_listing_id
          AND (
              l.seller_id = NEW.reported_user_id
              OR EXISTS (
                  SELECT 1 FROM bids b
                  WHERE b.listing_id = l.id AND b.bidder_id = NEW.reported_user_id
              )
              -- reported from a chat about this listing
              OR EXISTS (
                  SELECT 1 FROM chat_messages m
                  WHERE m.listing_id = l.id
                    AND ((m.sender_id = NEW.reported_user_id AND m.recipient_id = NEW.reporter_id)
                      OR (m.sender_id = NEW.reporter_id AND m.recipient_id = NEW.reported_user_id))
              )
          )
    ) THEN
        RAISE EXCEPTION 'That listing has nothing to do with the person you''re reporting.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM reports
        WHERE reporter_id = NEW.reporter_id
          AND reported_user_id = NEW.reported_user_id
          AND reported_listing_id IS NOT DISTINCT FROM NEW.reported_listing_id
          AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'You already reported this. Our team will review it.';
    END IF;
    IF (SELECT count(*) FROM reports
        WHERE reporter_id = NEW.reporter_id AND created_at > now() - interval '1 day') >= 10 THEN
        RAISE EXCEPTION 'You can send at most 10 reports a day.';
    END IF;
    RETURN NEW;
END;
$$;

------------------------------------------------------------------------------
-- 7. Listing photo files are locked once the listing has offers or is sold
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listing_photo_locked(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM listings l
        WHERE l.photos @> ARRAY[
                (SELECT value FROM app_config WHERE key = 'storage_public_url') || 'listing-photos/' || object_name
              ]
          AND (l.status = 'sold' OR (l.status = 'active' AND EXISTS (SELECT 1 FROM bids b WHERE b.listing_id = l.id)))
    );
$$;
REVOKE ALL ON FUNCTION public.listing_photo_locked(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listing_photo_locked(text) TO authenticated;

DROP POLICY IF EXISTS "Users can update own uploads listing-photos" ON storage.objects;
CREATE POLICY "Users can update own uploads listing-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    AND NOT public.listing_photo_locked(name)
);

DROP POLICY IF EXISTS "Users can delete own uploads listing-photos" ON storage.objects;
CREATE POLICY "Users can delete own uploads listing-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    AND NOT public.listing_photo_locked(name)
);

------------------------------------------------------------------------------
-- 8. Browse: search, category filter, sort and paging in the database
------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Same text the Browse search used to match in the browser
CREATE OR REPLACE FUNCTION public.listing_search_text(p_title text, p_description text, p_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT lower(p_title || ' ' || COALESCE(p_description, '') || ' ' || p_category);
$$;

CREATE INDEX IF NOT EXISTS idx_listings_search_trgm ON public.listings
    USING gin (public.listing_search_text(title, description, category) extensions.gin_trgm_ops)
    WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.is_standard_category(p_category text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
    -- Keep in step with LISTING_CATEGORIES in src/lib/constants.ts
    SELECT p_category IN (
        'Books & Study Material', 'Electronics & Gadgets', 'Furniture & Room Essentials',
        'Cycles & Transport', 'Appliances', 'Clothing & Misc'
    );
$$;

-- Every word in p_query must appear somewhere (as before). p_category 'Others'
-- means seller-typed categories. p_sort: newest | price_low | price_high.
-- SECURITY INVOKER: row-level rules apply as usual.
CREATE OR REPLACE FUNCTION public.search_listings(
    p_query text DEFAULT '',
    p_category text DEFAULT NULL,
    p_sort text DEFAULT 'newest',
    p_limit integer DEFAULT 24,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    asking_price numeric,
    category text,
    product_age text,
    photos text[],
    status text,
    created_at timestamptz,
    seller_id uuid,
    seller jsonb,
    total_count bigint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    WITH words AS (
        SELECT array_remove(regexp_split_to_array(lower(btrim(COALESCE(p_query, ''))), '\s+'), '') AS w
    ),
    matches AS (
        SELECT l.*
        FROM listings l, words
        WHERE l.status = 'active'
          AND (
              p_category IS NULL OR p_category = '' OR p_category = 'All'
              OR (p_category = 'Others' AND NOT public.is_standard_category(l.category))
              OR l.category = p_category
          )
          AND NOT EXISTS (
              SELECT 1 FROM unnest(words.w) AS word
              WHERE strpos(public.listing_search_text(l.title, l.description, l.category), word) = 0
          )
          AND (
              cardinality(words.w) = 0
              OR public.listing_search_text(l.title, l.description, l.category)
                 LIKE '%' || replace(replace(replace(words.w[1], '\', '\\'), '%', '\%'), '_', '\_') || '%'
          )
    )
    SELECT m.id, m.title, m.description, m.asking_price, m.category, m.product_age, m.photos,
           m.status::text, m.created_at, m.seller_id,
           jsonb_build_object(
               'id', p.id, 'name', p.name,
               'profile_photo_url', p.profile_photo_url, 'rating_avg', p.rating_avg
           ),
           count(*) OVER ()
    FROM matches m
    LEFT JOIN profiles p ON p.id = m.seller_id
    ORDER BY
        CASE WHEN p_sort = 'price_low' THEN m.asking_price END ASC,
        CASE WHEN p_sort = 'price_high' THEN m.asking_price END DESC,
        m.created_at DESC,
        m.id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 24), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;
REVOKE ALL ON FUNCTION public.search_listings(text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_listings(text, text, text, integer, integer) TO authenticated;

-- Active listings per category group, for the Browse chips
CREATE OR REPLACE FUNCTION public.listing_category_counts()
RETURNS TABLE (category text, listings bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT CASE WHEN public.is_standard_category(l.category) THEN l.category ELSE 'Others' END, count(*)
    FROM listings l
    WHERE l.status = 'active'
    GROUP BY 1;
$$;
REVOKE ALL ON FUNCTION public.listing_category_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listing_category_counts() TO authenticated;

------------------------------------------------------------------------------
-- Function permissions for the new user-facing functions
------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.accept_offer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_backup_buyer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.promote_backup_buyer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.relist_listing(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.withdraw_offer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.renew_listing(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_clear_flag(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_backup_buyer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_backup_buyer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.relist_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.renew_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_flag(uuid) TO authenticated;

-- Flag existing listings
DO $$
BEGIN
    PERFORM public.enter_trusted_mode();
    UPDATE public.listings
    SET flagged = cardinality(public.prohibited_words_in(title || ' ' || COALESCE(description, ''))) > 0
    WHERE status = 'active';
END $$;

------------------------------------------------------------------------------
-- Listings are never hard-deleted by users (that wiped offers, chats and
-- ratings). The app removes listings by setting status = 'removed'.
------------------------------------------------------------------------------
DROP POLICY IF EXISTS "listings_delete_policy" ON public.listings;
