-- 20261127120000_admin_dashboard_trends.sql
-- The admin overview now shows "this week vs last week" arrows, so admin_dashboard()
-- also returns last week's counts (8 to 14 days ago) for new students, listings and offers:
--   users.new_prev_7d, listings.new_prev_7d, offers.new_prev_7d
-- Everything else it returns is unchanged. Same admin check, same rights.
-- Re-running this file is safe.

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
            'new_prev_7d', (SELECT count(*) FROM profiles WHERE created_at > now() - interval '14 days' AND created_at <= now() - interval '7 days'),
            'banned', (SELECT count(*) FROM profiles WHERE banned),
            'admins', (SELECT count(*) FROM profiles WHERE is_admin)
        ),
        'listings', jsonb_build_object(
            'active', (SELECT count(*) FROM listings WHERE status = 'active'),
            'sold', (SELECT count(*) FROM listings WHERE status = 'sold'),
            'removed', (SELECT count(*) FROM listings WHERE status = 'removed'),
            'flagged', (SELECT count(*) FROM listings WHERE status = 'active' AND flagged),
            'new_7d', (SELECT count(*) FROM listings WHERE created_at > now() - interval '7 days'),
            'new_prev_7d', (SELECT count(*) FROM listings WHERE created_at > now() - interval '14 days' AND created_at <= now() - interval '7 days')
        ),
        'offers', jsonb_build_object(
            'total', (SELECT count(*) FROM bids),
            'pending', (SELECT count(*) FROM bids WHERE status = 'pending'),
            'new_7d', (SELECT count(*) FROM bids WHERE created_at > now() - interval '7 days'),
            'new_prev_7d', (SELECT count(*) FROM bids WHERE created_at > now() - interval '14 days' AND created_at <= now() - interval '7 days')
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

REVOKE ALL ON FUNCTION public.admin_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard() TO authenticated;
