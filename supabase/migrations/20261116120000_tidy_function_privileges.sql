-- 20261116120000_tidy_function_privileges.sql
-- Clean-up from the Supabase security and performance advisors (2026-11-16):
--   1. Trigger functions were callable through the API (/rest/v1/rpc/...). Calling a
--      trigger function directly only errors, but nobody needs to, so take that away.
--      Triggers keep working: EXECUTE is checked when a trigger is created, not when it fires.
--   2. is_own_storage_url is only used inside other functions, so it isn't callable either.
--   3. Helper functions get a fixed search_path.
--   4. Indexes on foreign keys that had none.
-- Re-running this file is safe.

------------------------------------------------------------------------------
-- 1. Trigger functions: not callable by users
------------------------------------------------------------------------------
DO $$
DECLARE
    f regprocedure;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prorettype = 'trigger'::regtype
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    END LOOP;
END $$;

------------------------------------------------------------------------------
-- 2. Internal helper: not callable by users
------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.is_own_storage_url(text, text, uuid) FROM PUBLIC, anon, authenticated;

------------------------------------------------------------------------------
-- 3. Fixed search_path for helpers that didn't have one
------------------------------------------------------------------------------
ALTER FUNCTION public.check_minimum_bid() SET search_path = public;
ALTER FUNCTION public.check_banned_on_bid() SET search_path = public;
ALTER FUNCTION public.check_banned_on_listing() SET search_path = public;
ALTER FUNCTION public.enter_trusted_mode() SET search_path = public;
ALTER FUNCTION public.prohibited_words_in(text) SET search_path = public;
ALTER FUNCTION public.listing_search_text(text, text, text) SET search_path = public;
ALTER FUNCTION public.is_standard_category(text) SET search_path = public;

------------------------------------------------------------------------------
-- 4. Indexes for foreign keys without one
------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON public.admin_actions (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user_id ON public.admin_actions (target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_listing_id ON public.admin_actions (target_listing_id);
CREATE INDEX IF NOT EXISTS idx_listings_selected_bidder_id ON public.listings (selected_bidder_id);
CREATE INDEX IF NOT EXISTS idx_listings_backup_bidder_id ON public.listings (backup_bidder_id);
CREATE INDEX IF NOT EXISTS idx_notifications_listing_id ON public.notifications (listing_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications (actor_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater_id ON public.ratings (rater_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_listing_id ON public.reports (reported_listing_id);
