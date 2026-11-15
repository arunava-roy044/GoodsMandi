-- 20261112120000_backend_hardening.sql
-- Backend fixes before launch:
--   1. Photo-link check no longer has the Supabase project ID written into it
--   2. Spam limits on chat messages, listings and reports
--   3. Admin tools: ban / unban, reset warnings, remove listings, with an audit log
--   4. Users can delete their own account
--   5. Indexes for the feeds, chat and reports
--   6. One-row-per-conversation function for the chat list
--   7. is_admin is no longer readable on other people's profiles
--   8. Fix: sending a chat message failed with "infinite recursion" in its policy
--
-- As in earlier migrations, "trusted" code runs with auth.uid() = NULL and is not
-- restricted by the listing / bid triggers. The admin and delete-account functions
-- below check who is calling first, then switch to trusted mode for the rest of the
-- transaction with public.enter_trusted_mode().

------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------

-- Private settings, readable only by SECURITY DEFINER functions
CREATE TABLE IF NOT EXISTS public.app_config (
    key text PRIMARY KEY,
    value text NOT NULL
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_config FROM anon, authenticated;

-- Public storage address of THIS project. On a new Supabase project, run:
--   UPDATE public.app_config SET value = 'https://<project-ref>.supabase.co/storage/v1/object/public/'
--   WHERE key = 'storage_public_url';
INSERT INTO public.app_config (key, value)
VALUES ('storage_public_url', 'https://furntiuxjxzuevrqlpdw.supabase.co/storage/v1/object/public/')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Clears the caller's identity for the rest of the transaction, so auth.uid()
-- returns NULL and the listing / bid triggers treat the work as trusted.
-- Only callable from other SECURITY DEFINER functions, after they checked the caller.
CREATE OR REPLACE FUNCTION public.enter_trusted_mode()
RETURNS void
LANGUAGE sql
AS $$
    SELECT set_config('request.jwt.claims', '', true),
           set_config('request.jwt.claim.sub', '', true);
$$;
REVOKE ALL ON FUNCTION public.enter_trusted_mode() FROM PUBLIC, anon, authenticated;

------------------------------------------------------------------------------
-- 1. Photo links: read the storage address from app_config
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_own_storage_url(url text, bucket text, owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT url IS NOT NULL
       AND url !~ '\.\.'
       AND starts_with(
            url,
            COALESCE(
                (SELECT value FROM public.app_config WHERE key = 'storage_public_url'),
                'https://invalid.invalid/'
            ) || bucket || '/' || owner::text || '/'
       );
$$;

------------------------------------------------------------------------------
-- 2. Spam limits (signed-in users only; trusted code is not limited)
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.limit_chat_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;
    IF (SELECT count(*) FROM chat_messages
        WHERE sender_id = NEW.sender_id AND created_at > now() - interval '1 minute') >= 30 THEN
        RAISE EXCEPTION 'You''re sending messages too fast. Wait a minute and try again.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_limit_chat_messages ON chat_messages;
CREATE TRIGGER trg_limit_chat_messages
    BEFORE INSERT ON chat_messages
    FOR EACH ROW EXECUTE PROCEDURE public.limit_chat_messages();

CREATE OR REPLACE FUNCTION public.limit_new_listings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;
    IF (SELECT count(*) FROM listings WHERE seller_id = NEW.seller_id AND status = 'active') >= 20 THEN
        RAISE EXCEPTION 'You can have at most 20 active listings. Mark some as sold or remove them first.';
    END IF;
    IF (SELECT count(*) FROM listings
        WHERE seller_id = NEW.seller_id AND created_at > now() - interval '1 day') >= 10 THEN
        RAISE EXCEPTION 'You can post at most 10 listings a day. Try again tomorrow.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_limit_new_listings ON listings;
CREATE TRIGGER trg_limit_new_listings
    BEFORE INSERT ON listings
    FOR EACH ROW EXECUTE PROCEDURE public.limit_new_listings();

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

DROP TRIGGER IF EXISTS trg_limit_reports ON reports;
CREATE TRIGGER trg_limit_reports
    BEFORE INSERT ON reports
    FOR EACH ROW EXECUTE PROCEDURE public.limit_reports();

------------------------------------------------------------------------------
-- 3. Admin tools with an audit log
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
    reason text CHECK (reason IS NULL OR char_length(reason) <= 500),
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_actions FROM anon, authenticated;
GRANT SELECT ON public.admin_actions TO authenticated;

DROP POLICY IF EXISTS "admin_actions_select_policy" ON public.admin_actions;
CREATE POLICY "admin_actions_select_policy"
ON public.admin_actions FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions (created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_set_ban(target uuid, ban boolean, reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin uuid := auth.uid();
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can do this.';
    END IF;
    IF target = admin THEN
        RAISE EXCEPTION 'You can''t ban or unban yourself.';
    END IF;
    PERFORM public.enter_trusted_mode();

    UPDATE profiles SET banned = ban WHERE id = target;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    INSERT INTO admin_actions (admin_id, action, target_user_id, reason)
    VALUES (admin, CASE WHEN ban THEN 'ban' ELSE 'unban' END, target, reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_warnings(target uuid, reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin uuid := auth.uid();
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can do this.';
    END IF;
    PERFORM public.enter_trusted_mode();

    UPDATE profiles SET warning_count = 0 WHERE id = target;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    INSERT INTO admin_actions (admin_id, action, target_user_id, reason)
    VALUES (admin, 'reset_warnings', target, reason);
END;
$$;

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

    UPDATE listings SET status = 'removed'
    WHERE id = target_listing AND status = 'active'
    RETURNING seller_id INTO seller;
    IF seller IS NULL THEN
        RAISE EXCEPTION 'Listing not found, or it is already sold or removed.';
    END IF;

    INSERT INTO admin_actions (admin_id, action, target_user_id, target_listing_id, reason)
    VALUES (admin, 'remove_listing', seller, target_listing, reason);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_ban(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reset_warnings(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_remove_listing(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_ban(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_warnings(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_listing(uuid, text) TO authenticated;

------------------------------------------------------------------------------
-- 4. Delete my account
------------------------------------------------------------------------------
-- Deleting a user must not be blocked by listings that name them as buyer
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_selected_bidder_id_fkey;
ALTER TABLE public.listings
    ADD CONSTRAINT listings_selected_bidder_id_fkey
    FOREIGN KEY (selected_bidder_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_backup_bidder_id_fkey;
ALTER TABLE public.listings
    ADD CONSTRAINT listings_backup_bidder_id_fkey
    FOREIGN KEY (backup_bidder_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Removes the auth user. The profile, their listings, offers, messages and ratings
-- go with it (ON DELETE CASCADE). Photos stay in storage until cleaned up.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    me uuid := auth.uid();
BEGIN
    IF me IS NULL THEN
        RAISE EXCEPTION 'You need to be logged in.';
    END IF;
    PERFORM public.enter_trusted_mode();
    DELETE FROM auth.users WHERE id = me;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

------------------------------------------------------------------------------
-- 5. Indexes
------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_listings_status_created_at ON public.listings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_seller_created_at ON public.listings (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_created_at ON public.chat_messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_created_at ON public.chat_messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_created_at ON public.reports (reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_listing_id ON public.ratings (listing_id);

------------------------------------------------------------------------------
-- 6. Chat list: one row per (listing, other person), newest message first
------------------------------------------------------------------------------
-- SECURITY INVOKER: the caller's own row-level rules still apply, so a listing
-- the caller can no longer see comes back with a NULL title.
CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE (
    listing_id uuid,
    other_user_id uuid,
    listing_title text,
    other_user_name text,
    other_user_photo text,
    last_message text,
    last_message_mine boolean,
    last_message_time timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT * FROM (
        SELECT DISTINCT ON (m.listing_id, m.other_id)
            m.listing_id,
            m.other_id,
            l.title,
            p.name,
            p.profile_photo_url,
            m.message_text,
            m.sender_id = auth.uid(),
            m.created_at
        FROM (
            SELECT c.*,
                   CASE WHEN c.sender_id = auth.uid() THEN c.recipient_id ELSE c.sender_id END AS other_id
            FROM chat_messages c
            WHERE c.sender_id = auth.uid() OR c.recipient_id = auth.uid()
        ) m
        LEFT JOIN listings l ON l.id = m.listing_id
        LEFT JOIN profiles p ON p.id = m.other_id
        ORDER BY m.listing_id, m.other_id, m.created_at DESC
    ) latest
    ORDER BY 8 DESC
    LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_my_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;

------------------------------------------------------------------------------
-- 7. Hide is_admin from other users
------------------------------------------------------------------------------
-- Report policies read is_admin as the caller, so switch them to is_admin() first
DROP POLICY IF EXISTS "reports_select_policy" ON reports;
CREATE POLICY "reports_select_policy"
ON reports FOR SELECT
TO authenticated
USING (reporter_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "reports_update_policy" ON reports;
CREATE POLICY "reports_update_policy"
ON reports FOR UPDATE
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- Same column list as 20261031180000_hide_profile_emails.sql, minus is_admin.
-- The app checks admin rights with rpc('is_admin').
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
    id,
    name,
    year_of_study,
    branch_course,
    profile_photo_url,
    verified,
    rating_avg,
    total_items_sold,
    active_listings_count,
    banned,
    warning_count,
    created_at
) ON public.profiles TO authenticated;

------------------------------------------------------------------------------
-- 8. Fix: chat messages could not be sent at all
------------------------------------------------------------------------------
-- The insert policy from 20261108190000_close_audit_gaps.sql reads chat_messages
-- inside its own policy, which Postgres rejects with "infinite recursion detected
-- in policy for relation chat_messages". Do that lookup in a function instead.
CREATE OR REPLACE FUNCTION public.has_messaged(p_listing uuid, p_from uuid, p_to uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM chat_messages
        WHERE listing_id = p_listing AND sender_id = p_from AND recipient_id = p_to
    );
$$;
REVOKE ALL ON FUNCTION public.has_messaged(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_messaged(uuid, uuid, uuid) TO authenticated;

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
                      OR public.has_messaged(l.id, chat_messages.recipient_id, chat_messages.sender_id)
                  )
              )
          )
    )
);
