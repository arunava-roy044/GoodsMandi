-- 20261121120000_privacy_compliance.sql
-- Supports the Digital Personal Data Protection Act, 2023:
--   1. consent_records: which Privacy Notice version each person agreed to, that they
--      confirmed they are 18 or older, and when. Sign-up now fails without all three.
--   2. export_my_data(): a copy of everything we hold about the caller (Settings > Download my data)
--   3. privacy_requests: requests and complaints from students (access, correction, erasure,
--      nomination, grievance), each with a due date, handled from the admin panel
--   4. breach_incidents: a log of data incidents (admins only)
--   5. admin functions: update a request, a privacy overview, users with no consent record
--   6. delete_my_account() is removed: accounts are now deleted by the delete-account
--      Edge Function, which also deletes the person's photo files from storage
--
-- Apply this AFTER the website code that sends the consent details at sign-up is live,
-- otherwise sign-ups fail in between.
-- Re-running this file is safe.

------------------------------------------------------------------------------
-- 1. Consent records
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notice_version text NOT NULL CHECK (char_length(notice_version) BETWEEN 1 AND 40),
    adult_confirmed boolean NOT NULL,
    terms_accepted boolean NOT NULL,
    accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user ON public.consent_records (user_id, accepted_at DESC);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consent_records FROM anon, authenticated;
GRANT SELECT ON public.consent_records TO authenticated;

DROP POLICY IF EXISTS "consent_records_select_policy" ON public.consent_records;
CREATE POLICY "consent_records_select_policy"
ON public.consent_records FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

-- Sign-up now needs the three confirmations (sent by the sign-up form as user metadata)
-- and writes the consent record. Everything else is as before.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    meta jsonb := COALESCE(new.raw_user_meta_data, '{}'::jsonb);
    year_text text := meta->>'year_of_study';
    notice text := NULLIF(btrim(meta->>'privacy_notice_version'), '');
BEGIN
    IF COALESCE(meta->>'adult_confirmed', '') <> 'true'
        OR COALESCE(meta->>'terms_accepted', '') <> 'true'
        OR notice IS NULL
    THEN
        RAISE EXCEPTION 'To sign up you must confirm you are 18 or older and accept the Terms and the Privacy Notice.';
    END IF;

    INSERT INTO public.profiles (id, college_email, name, year_of_study, branch_course)
    VALUES (
        new.id,
        new.email,
        COALESCE(NULLIF(btrim(meta->>'full_name'), ''), split_part(new.email, '@', 1)),
        CASE WHEN year_text ~ '^[1-9]$' THEN year_text::integer END,
        NULLIF(left(btrim(meta->>'branch_course'), 60), '')
    );

    INSERT INTO public.consent_records (user_id, notice_version, adult_confirmed, terms_accepted)
    VALUES (new.id, left(notice, 40), true, true);

    RETURN new;
END;
$$;

------------------------------------------------------------------------------
-- Notifications: a new kind, for updates on a privacy request
------------------------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_kind_check CHECK (kind IN (
        'new_offer', 'offer_changed', 'offer_accepted', 'listing_sold', 'backup_chosen',
        'deal_cancelled', 'listing_relisted', 'new_message', 'report_reviewed',
        'warning_received', 'account_banned', 'account_unbanned', 'listing_removed',
        'listing_expired', 'privacy_request_update'
    ));

------------------------------------------------------------------------------
-- 3. Privacy requests and complaints
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.privacy_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('access', 'correction', 'erasure', 'nomination', 'grievance', 'other')),
    message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 2000),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'rejected')),
    admin_note text CHECK (admin_note IS NULL OR char_length(admin_note) <= 2000),
    created_at timestamptz NOT NULL DEFAULT now(),
    due_at timestamptz NOT NULL DEFAULT now() + interval '15 days',
    resolved_at timestamptz,
    handled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_user ON public.privacy_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status_due ON public.privacy_requests (status, due_at);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_handled_by ON public.privacy_requests (handled_by);

ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.privacy_requests FROM anon, authenticated;
GRANT SELECT, INSERT ON public.privacy_requests TO authenticated;

DROP POLICY IF EXISTS "privacy_requests_select_policy" ON public.privacy_requests;
CREATE POLICY "privacy_requests_select_policy"
ON public.privacy_requests FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "privacy_requests_insert_policy" ON public.privacy_requests;
CREATE POLICY "privacy_requests_insert_policy"
ON public.privacy_requests FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- People send the kind and the message; everything else is set here. Banned users
-- can still use their data rights.
CREATE OR REPLACE FUNCTION public.prepare_privacy_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;
    IF (SELECT count(*) FROM privacy_requests
        WHERE user_id = NEW.user_id AND created_at > now() - interval '1 day') >= 5 THEN
        RAISE EXCEPTION 'You can send at most 5 requests a day. We will answer the ones you already sent.';
    END IF;
    NEW.status := 'open';
    NEW.admin_note := NULL;
    NEW.resolved_at := NULL;
    NEW.handled_by := NULL;
    NEW.created_at := now();
    NEW.due_at := now() + interval '15 days';
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prepare_privacy_request ON public.privacy_requests;
CREATE TRIGGER trg_prepare_privacy_request
    BEFORE INSERT ON public.privacy_requests
    FOR EACH ROW EXECUTE PROCEDURE public.prepare_privacy_request();

-- Admins move a request along; the person is notified and the change is logged
CREATE OR REPLACE FUNCTION public.admin_update_privacy_request(p_id uuid, p_status text, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin uuid := auth.uid();
    r privacy_requests;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can do this.';
    END IF;
    IF p_status NOT IN ('open', 'in_progress', 'resolved', 'rejected') THEN
        RAISE EXCEPTION 'Unknown status.';
    END IF;
    IF p_note IS NOT NULL AND char_length(p_note) > 2000 THEN
        RAISE EXCEPTION 'The note is too long.';
    END IF;

    UPDATE privacy_requests
    SET status = p_status,
        admin_note = COALESCE(NULLIF(btrim(p_note), ''), admin_note),
        resolved_at = CASE WHEN p_status IN ('resolved', 'rejected') THEN COALESCE(resolved_at, now()) ELSE NULL END,
        handled_by = admin
    WHERE id = p_id
    RETURNING * INTO r;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found.';
    END IF;

    INSERT INTO admin_actions (admin_id, action, target_user_id, reason)
    VALUES (admin, 'privacy_request_' || p_status, r.user_id, left(r.kind || COALESCE(': ' || NULLIF(btrim(p_note), ''), ''), 500));

    PERFORM notify(r.user_id, 'privacy_request_update', NULL, NULL);
END;
$$;

------------------------------------------------------------------------------
-- 4. Data incident log (admins only)
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.breach_incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    discovered_at timestamptz NOT NULL DEFAULT now(),
    occurred_at timestamptz,
    summary text NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 1 AND 2000),
    data_affected text CHECK (data_affected IS NULL OR char_length(data_affected) <= 1000),
    people_affected integer CHECK (people_affected IS NULL OR people_affected >= 0),
    actions_taken text CHECK (actions_taken IS NULL OR char_length(actions_taken) <= 2000),
    board_notified_at timestamptz,
    people_notified_at timestamptz,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'contained', 'closed')),
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_breach_incidents_status ON public.breach_incidents (status, discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_breach_incidents_created_by ON public.breach_incidents (created_by);

ALTER TABLE public.breach_incidents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.breach_incidents FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.breach_incidents TO authenticated;

DROP POLICY IF EXISTS "breach_incidents_select_policy" ON public.breach_incidents;
CREATE POLICY "breach_incidents_select_policy" ON public.breach_incidents FOR SELECT TO authenticated
USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "breach_incidents_insert_policy" ON public.breach_incidents;
CREATE POLICY "breach_incidents_insert_policy" ON public.breach_incidents FOR INSERT TO authenticated
WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "breach_incidents_update_policy" ON public.breach_incidents;
CREATE POLICY "breach_incidents_update_policy" ON public.breach_incidents FOR UPDATE TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- The author is the signed-in admin (can't be faked), and every change is recorded in the admin log
CREATE OR REPLACE FUNCTION public.set_incident_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        NEW.created_by := auth.uid();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_incident_author ON public.breach_incidents;
CREATE TRIGGER trg_set_incident_author
    BEFORE INSERT ON public.breach_incidents
    FOR EACH ROW EXECUTE PROCEDURE public.set_incident_author();

CREATE OR REPLACE FUNCTION public.log_incident_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO admin_actions (admin_id, action, reason)
    VALUES (auth.uid(), CASE WHEN TG_OP = 'INSERT' THEN 'incident_logged' ELSE 'incident_updated' END, left(NEW.summary, 500));
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_incident_change ON public.breach_incidents;
CREATE TRIGGER trg_log_incident_change
    AFTER INSERT OR UPDATE ON public.breach_incidents
    FOR EACH ROW EXECUTE PROCEDURE public.log_incident_change();

------------------------------------------------------------------------------
-- 5. Admin overview and consent follow-up
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_privacy_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    accounts bigint := (SELECT count(*) FROM profiles);
    with_consent bigint := (SELECT count(DISTINCT user_id) FROM consent_records);
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can do this.';
    END IF;
    RETURN jsonb_build_object(
        'accounts', accounts,
        'with_consent', with_consent,
        'without_consent', accounts - with_consent,
        'by_notice_version', COALESCE((
            SELECT jsonb_object_agg(notice_version, n)
            FROM (
                SELECT notice_version, count(*) AS n
                FROM (SELECT DISTINCT ON (user_id) user_id, notice_version
                      FROM consent_records ORDER BY user_id, accepted_at DESC) latest
                GROUP BY notice_version
            ) counts
        ), '{}'::jsonb),
        'open_requests', (SELECT count(*) FROM privacy_requests WHERE status IN ('open', 'in_progress')),
        'overdue_requests', (SELECT count(*) FROM privacy_requests WHERE status IN ('open', 'in_progress') AND due_at < now()),
        'open_incidents', (SELECT count(*) FROM breach_incidents WHERE status <> 'closed')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_users_without_consent()
RETURNS TABLE (id uuid, name text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can do this.';
    END IF;
    RETURN QUERY
    SELECT p.id, p.name, p.created_at
    FROM profiles p
    WHERE NOT EXISTS (SELECT 1 FROM consent_records c WHERE c.user_id = p.id)
    ORDER BY p.created_at
    LIMIT 200;
END;
$$;

------------------------------------------------------------------------------
-- 2. Download my data
------------------------------------------------------------------------------
-- Reads only rows that belong to the caller. Reports other students made about
-- the caller are left out because they contain other people's information.
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    me uuid := auth.uid();
BEGIN
    IF me IS NULL THEN
        RAISE EXCEPTION 'You need to be logged in.';
    END IF;
    RETURN jsonb_build_object(
        'exported_at', now(),
        'about_this_file', 'A copy of the personal data GoodsMandi holds about you. Photos are listed by web address and are not included in the file.',
        'not_included', 'Reports that other students made about you, because they contain other people''s information. Write to us from Settings if you want to know about them.',
        'account', (SELECT jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at)
                    FROM auth.users u WHERE u.id = me),
        'profile', (SELECT to_jsonb(p) FROM profiles p WHERE p.id = me),
        'listings', COALESCE((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.created_at) FROM listings l WHERE l.seller_id = me), '[]'::jsonb),
        'offers_made', COALESCE((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.created_at) FROM bids b WHERE b.bidder_id = me), '[]'::jsonb),
        'messages', COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at) FROM chat_messages m
                              WHERE m.sender_id = me OR m.recipient_id = me), '[]'::jsonb),
        'ratings_given', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at) FROM ratings r WHERE r.rater_id = me), '[]'::jsonb),
        'ratings_received', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at) FROM ratings r WHERE r.rated_user_id = me), '[]'::jsonb),
        'reports_made', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at) FROM reports x WHERE x.reporter_id = me), '[]'::jsonb),
        'notifications', COALESCE((SELECT jsonb_agg(to_jsonb(n) ORDER BY n.created_at) FROM notifications n WHERE n.user_id = me), '[]'::jsonb),
        'consent_records', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.accepted_at) FROM consent_records c WHERE c.user_id = me), '[]'::jsonb),
        'privacy_requests', COALESCE((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at) FROM privacy_requests q WHERE q.user_id = me), '[]'::jsonb)
    );
END;
$$;

------------------------------------------------------------------------------
-- 6. Account deletion moves to the delete-account Edge Function
------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.delete_my_account();

------------------------------------------------------------------------------
-- Permissions
------------------------------------------------------------------------------
-- New trigger functions can't be called through the API
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

REVOKE ALL ON FUNCTION public.admin_update_privacy_request(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_privacy_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_users_without_consent() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.export_my_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_privacy_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_privacy_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_users_without_consent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;
