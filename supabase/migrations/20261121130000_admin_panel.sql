-- 20261121130000_admin_panel.sql
-- Backend for the admin panel that runs the whole site:
--   * admin_dashboard():            numbers for the overview page
--   * admin_list_users():           search and filter all users (with email, last sign-in, counts)
--   * admin_get_user():             one user's details, listings, reports and admin history
--   * admin_set_admin():            give or take away admin rights (with safeguards)
--   * admin_list_listings():        search all listings, including sold and removed ones
--   * admin_restore_listing():      undo an admin's removal of a listing
-- Every function checks that the caller is an admin. Regular rules hide other people's
-- removed and sold listings and everyone's email, so these run with elevated rights
-- (SECURITY DEFINER) after that check. Changes are written to admin_actions.
-- Needs 20261121120000_privacy_compliance.sql (reads privacy_requests and breach_incidents).
-- Re-running this file is safe.

-- A new notification for sellers whose listing was restored
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_kind_check CHECK (kind IN (
        'new_offer', 'offer_changed', 'offer_accepted', 'listing_sold', 'backup_chosen',
        'deal_cancelled', 'listing_relisted', 'new_message', 'report_reviewed',
        'warning_received', 'account_banned', 'account_unbanned', 'listing_removed',
        'listing_expired', 'privacy_request_update', 'listing_restored'
    ));

------------------------------------------------------------------------------
-- Overview
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    days integer := 14;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can do this.';
    END IF;

    RETURN jsonb_build_object(
        'users', jsonb_build_object(
            'total', (SELECT count(*) FROM profiles),
            'new_7d', (SELECT count(*) FROM profiles WHERE created_at > now() - interval '7 days'),
            'banned', (SELECT count(*) FROM profiles WHERE banned),
            'admins', (SELECT count(*) FROM profiles WHERE is_admin)
        ),
        'listings', jsonb_build_object(
            'active', (SELECT count(*) FROM listings WHERE status = 'active'),
            'sold', (SELECT count(*) FROM listings WHERE status = 'sold'),
            'removed', (SELECT count(*) FROM listings WHERE status = 'removed'),
            'flagged', (SELECT count(*) FROM listings WHERE status = 'active' AND flagged),
            'new_7d', (SELECT count(*) FROM listings WHERE created_at > now() - interval '7 days')
        ),
        'offers', jsonb_build_object(
            'total', (SELECT count(*) FROM bids),
            'pending', (SELECT count(*) FROM bids WHERE status = 'pending'),
            'new_7d', (SELECT count(*) FROM bids WHERE created_at > now() - interval '7 days')
        ),
        'messages', jsonb_build_object(
            'total', (SELECT count(*) FROM chat_messages),
            'last_24h', (SELECT count(*) FROM chat_messages WHERE created_at > now() - interval '24 hours')
        ),
        'reports', jsonb_build_object(
            'pending', (SELECT count(*) FROM reports WHERE status = 'pending')
        ),
        'privacy', jsonb_build_object(
            'open_requests', (SELECT count(*) FROM privacy_requests WHERE status IN ('open', 'in_progress')),
            'overdue_requests', (SELECT count(*) FROM privacy_requests WHERE status IN ('open', 'in_progress') AND due_at < now()),
            'open_incidents', (SELECT count(*) FROM breach_incidents WHERE status <> 'closed')
        ),
        'signups_by_day', (
            SELECT jsonb_agg(jsonb_build_object('day', d::date, 'n', COALESCE(c.n, 0)) ORDER BY d)
            FROM generate_series(current_date - (days - 1), current_date, interval '1 day') AS d
            LEFT JOIN (
                SELECT created_at::date AS day, count(*) AS n
                FROM profiles WHERE created_at >= current_date - (days - 1) GROUP BY 1
            ) c ON c.day = d::date
        ),
        'listings_by_day', (
            SELECT jsonb_agg(jsonb_build_object('day', d::date, 'n', COALESCE(c.n, 0)) ORDER BY d)
            FROM generate_series(current_date - (days - 1), current_date, interval '1 day') AS d
            LEFT JOIN (
                SELECT created_at::date AS day, count(*) AS n
                FROM listings WHERE created_at >= current_date - (days - 1) GROUP BY 1
            ) c ON c.day = d::date
        )
    );
END;
$$;

------------------------------------------------------------------------------
-- Users
------------------------------------------------------------------------------
-- p_filter: all | banned | admins | warned | new (joined in the last 7 days)
CREATE OR REPLACE FUNCTION public.admin_list_users(
    p_search text DEFAULT '',
    p_filter text DEFAULT 'all',
    p_limit integer DEFAULT 25,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    name text,
    email text,
    year_of_study integer,
    branch_course text,
    created_at timestamptz,
    last_sign_in_at timestamptz,
    banned boolean,
    warning_count integer,
    is_admin boolean,
    rating_avg numeric,
    active_listings bigint,
    items_sold bigint,
    offers_made bigint,
    reports_against bigint,
    total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    pattern text := '%' || replace(replace(replace(btrim(COALESCE(p_search, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%';
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can do this.';
    END IF;

    RETURN QUERY
    SELECT p.id, p.name, p.college_email, p.year_of_study, p.branch_course, p.created_at,
           u.last_sign_in_at, p.banned, p.warning_count, p.is_admin, p.rating_avg,
           (SELECT count(*) FROM listings l WHERE l.seller_id = p.id AND l.status = 'active'),
           (SELECT count(*) FROM listings l WHERE l.seller_id = p.id AND l.status = 'sold'),
           (SELECT count(*) FROM bids b WHERE b.bidder_id = p.id),
           (SELECT count(*) FROM reports r WHERE r.reported_user_id = p.id),
           count(*) OVER ()
    FROM profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE (btrim(COALESCE(p_search, '')) = '' OR p.name ILIKE pattern OR p.college_email ILIKE pattern)
      AND CASE p_filter
              WHEN 'banned' THEN p.banned
              WHEN 'admins' THEN p.is_admin
              WHEN 'warned' THEN p.warning_count > 0
              WHEN 'new' THEN p.created_at > now() - interval '7 days'
              ELSE true
          END
    ORDER BY p.created_at DESC, p.id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_user(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    result jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can do this.';
    END IF;

    SELECT jsonb_build_object(
        'profile', jsonb_build_object(
            'id', p.id, 'name', p.name, 'email', p.college_email,
            'year_of_study', p.year_of_study, 'branch_course', p.branch_course,
            'profile_photo_url', p.profile_photo_url, 'created_at', p.created_at,
            'last_sign_in_at', u.last_sign_in_at, 'banned', p.banned,
            'warning_count', p.warning_count, 'is_admin', p.is_admin,
            'rating_avg', p.rating_avg, 'total_items_sold', p.total_items_sold
        ),
        'counts', jsonb_build_object(
            'active_listings', (SELECT count(*) FROM listings WHERE seller_id = p.id AND status = 'active'),
            'sold_listings', (SELECT count(*) FROM listings WHERE seller_id = p.id AND status = 'sold'),
            'removed_listings', (SELECT count(*) FROM listings WHERE seller_id = p.id AND status = 'removed'),
            'offers_made', (SELECT count(*) FROM bids WHERE bidder_id = p.id),
            'messages_sent', (SELECT count(*) FROM chat_messages WHERE sender_id = p.id),
            'reports_against', (SELECT count(*) FROM reports WHERE reported_user_id = p.id),
            'reports_made', (SELECT count(*) FROM reports WHERE reporter_id = p.id)
        ),
        'consent', (SELECT jsonb_build_object('notice_version', c.notice_version, 'accepted_at', c.accepted_at)
                    FROM consent_records c WHERE c.user_id = p.id ORDER BY c.accepted_at DESC LIMIT 1),
        'listings', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', l.id, 'title', l.title, 'status', l.status, 'removed_reason', l.removed_reason,
                'flagged', l.flagged, 'asking_price', l.asking_price, 'created_at', l.created_at
            ) ORDER BY l.created_at DESC)
            FROM (SELECT * FROM listings WHERE seller_id = p.id ORDER BY created_at DESC LIMIT 20) l
        ), '[]'::jsonb),
        'reports_against', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', r.id, 'category', r.category, 'status', r.status,
                'description', left(COALESCE(r.description, ''), 300), 'created_at', r.created_at,
                'reporter_name', rp.name
            ) ORDER BY r.created_at DESC)
            FROM (SELECT * FROM reports WHERE reported_user_id = p.id ORDER BY created_at DESC LIMIT 20) r
            LEFT JOIN profiles rp ON rp.id = r.reporter_id
        ), '[]'::jsonb),
        'admin_history', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', a.id, 'action', a.action, 'reason', a.reason, 'created_at', a.created_at,
                'admin_name', ap.name
            ) ORDER BY a.created_at DESC)
            FROM (SELECT * FROM admin_actions WHERE target_user_id = p.id ORDER BY created_at DESC LIMIT 20) a
            LEFT JOIN profiles ap ON ap.id = a.admin_id
        ), '[]'::jsonb)
    )
    INTO result
    FROM profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.id = p_id;

    IF result IS NULL THEN
        RAISE EXCEPTION 'User not found.';
    END IF;
    RETURN result;
END;
$$;

-- Give or take away admin rights. You can't change your own, and there is always one admin.
CREATE OR REPLACE FUNCTION public.admin_set_admin(target uuid, make_admin boolean, reason text DEFAULT NULL)
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
        RAISE EXCEPTION 'You can''t change your own admin rights. Ask another admin.';
    END IF;
    IF NOT make_admin AND (SELECT count(*) FROM profiles WHERE is_admin) <= 1 THEN
        RAISE EXCEPTION 'There must always be at least one admin.';
    END IF;

    UPDATE profiles SET is_admin = make_admin WHERE id = target;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    INSERT INTO admin_actions (admin_id, action, target_user_id, reason)
    VALUES (admin, CASE WHEN make_admin THEN 'grant_admin' ELSE 'revoke_admin' END, target, left(reason, 500));
END;
$$;

------------------------------------------------------------------------------
-- Listings
------------------------------------------------------------------------------
-- p_filter: all | active | sold | removed | flagged (active and flagged) | expired
CREATE OR REPLACE FUNCTION public.admin_list_listings(
    p_search text DEFAULT '',
    p_filter text DEFAULT 'all',
    p_limit integer DEFAULT 25,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    title text,
    seller_id uuid,
    seller_name text,
    asking_price numeric,
    category text,
    status text,
    removed_reason text,
    flagged boolean,
    created_at timestamptz,
    offers bigint,
    total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    pattern text := '%' || replace(replace(replace(btrim(COALESCE(p_search, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%';
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can do this.';
    END IF;

    RETURN QUERY
    SELECT l.id, l.title, l.seller_id, p.name, l.asking_price, l.category, l.status::text,
           l.removed_reason, l.flagged, l.created_at,
           (SELECT count(*) FROM bids b WHERE b.listing_id = l.id),
           count(*) OVER ()
    FROM listings l
    LEFT JOIN profiles p ON p.id = l.seller_id
    WHERE (btrim(COALESCE(p_search, '')) = '' OR l.title ILIKE pattern OR p.name ILIKE pattern)
      AND CASE p_filter
              WHEN 'active' THEN l.status = 'active'
              WHEN 'sold' THEN l.status = 'sold'
              WHEN 'removed' THEN l.status = 'removed'
              WHEN 'flagged' THEN l.status = 'active' AND l.flagged
              WHEN 'expired' THEN l.status = 'removed' AND l.removed_reason = 'expired'
              ELSE true
          END
    ORDER BY l.created_at DESC, l.id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

-- Undo a removal that an admin made. (Listings a seller took down, or that expired,
-- belong to the seller; listings hidden by a ban come back when the ban is lifted.)
CREATE OR REPLACE FUNCTION public.admin_restore_listing(p_listing uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin uuid := auth.uid();
    l listings;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can do this.';
    END IF;

    SELECT * INTO l FROM listings WHERE id = p_listing FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found.';
    END IF;
    IF l.status <> 'removed' OR l.removed_reason IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Only listings that a moderator removed can be restored here.';
    END IF;
    IF public.is_banned(l.seller_id) THEN
        RAISE EXCEPTION 'The seller''s account is banned. Lift the ban first.';
    END IF;
    IF (SELECT count(*) FROM listings WHERE seller_id = l.seller_id AND status = 'active') >= 20 THEN
        RAISE EXCEPTION 'The seller already has 20 active listings.';
    END IF;

    PERFORM public.enter_trusted_mode();
    UPDATE listings SET status = 'active', removed_reason = NULL, active_since = now() WHERE id = p_listing;

    INSERT INTO admin_actions (admin_id, action, target_user_id, target_listing_id, reason)
    VALUES (admin, 'restore_listing', l.seller_id, p_listing, left(p_reason, 500));
    PERFORM notify(l.seller_id, 'listing_restored', p_listing, NULL);
END;
$$;

------------------------------------------------------------------------------
-- Permissions
------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_dashboard() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_users(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_admin(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_listings(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_restore_listing(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_admin(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_listings(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_listing(uuid, text) TO authenticated;
