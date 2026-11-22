-- 20261121140000_keep_moderation_records.sql
-- Closes gaps between the app and the Terms / Privacy Notice:
--   1. Deleting an account no longer wipes a ban or warnings. Before the account is
--      deleted, the delete-account Edge Function calls prepare_account_deletion(), which
--      keeps a scrambled (SHA-256) copy of the email with the warning count and ban.
--      If the same email signs up again, the new account starts with them.
--   2. An account can't be deleted while a report about it is waiting for review.
--   3. Reports stay when the person who made them deletes their account (reporter_id
--      becomes NULL instead of the report being deleted).
--   4. record_consent(): lets a signed-in person agree to a new version of the Privacy
--      Notice and Terms. The website asks everyone whose latest consent is older than
--      the current version.
-- Apply this BEFORE deploying the new delete-account Edge Function.
-- Re-running this file is safe.

------------------------------------------------------------------------------
-- 1. Moderation holds
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moderation_holds (
    email_hash text PRIMARY KEY CHECK (email_hash ~ '^[0-9a-f]{64}$'),
    warning_count integer NOT NULL DEFAULT 0 CHECK (warning_count >= 0),
    banned boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_holds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.moderation_holds FROM anon, authenticated;
-- No policies: only trusted code (service role and SECURITY DEFINER functions) uses it

CREATE OR REPLACE FUNCTION public.email_hash(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT encode(sha256(convert_to(lower(btrim(p_email)), 'UTF8')), 'hex');
$$;
REVOKE ALL ON FUNCTION public.email_hash(text) FROM PUBLIC, anon, authenticated;

-- Called by the delete-account Edge Function (service role) before deleting the login.
-- Refuses while a report about the person is still pending; otherwise saves their
-- warnings and ban (if any) so a new account with the same email gets them back.
CREATE OR REPLACE FUNCTION public.prepare_account_deletion(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    p profiles%ROWTYPE;
BEGIN
    SELECT * INTO p FROM profiles WHERE id = p_user;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM reports WHERE reported_user_id = p_user AND status = 'pending') THEN
        RAISE EXCEPTION 'A report about your account is waiting for a moderator. You can delete your account once it has been reviewed.'
            USING ERRCODE = 'P0001';
    END IF;

    IF COALESCE(p.warning_count, 0) > 0 OR COALESCE(p.banned, false) THEN
        INSERT INTO moderation_holds (email_hash, warning_count, banned, updated_at)
        VALUES (email_hash(p.college_email), COALESCE(p.warning_count, 0), COALESCE(p.banned, false), now())
        ON CONFLICT (email_hash) DO UPDATE
            SET warning_count = GREATEST(moderation_holds.warning_count, EXCLUDED.warning_count),
                banned = moderation_holds.banned OR EXCLUDED.banned,
                updated_at = now();
    END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(uuid) TO service_role;

-- Sign-up: as before, plus a new account starts with any warnings and ban kept from
-- an earlier account with the same email.
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
    hold moderation_holds%ROWTYPE;
BEGIN
    IF COALESCE(meta->>'adult_confirmed', '') <> 'true'
        OR COALESCE(meta->>'terms_accepted', '') <> 'true'
        OR notice IS NULL
    THEN
        RAISE EXCEPTION 'To sign up you must confirm you are 18 or older and accept the Terms and the Privacy Notice.';
    END IF;

    SELECT * INTO hold FROM moderation_holds WHERE email_hash = email_hash(new.email);

    INSERT INTO public.profiles (id, college_email, name, year_of_study, branch_course, warning_count, banned)
    VALUES (
        new.id,
        new.email,
        COALESCE(NULLIF(btrim(meta->>'full_name'), ''), split_part(new.email, '@', 1)),
        CASE WHEN year_text ~ '^[1-9]$' THEN year_text::integer END,
        NULLIF(left(btrim(meta->>'branch_course'), 60), ''),
        COALESCE(hold.warning_count, 0),
        COALESCE(hold.banned, false)
    );

    INSERT INTO public.consent_records (user_id, notice_version, adult_confirmed, terms_accepted)
    VALUES (new.id, left(notice, 40), true, true);

    RETURN new;
END;
$$;

------------------------------------------------------------------------------
-- 3. Reports outlive the reporter's account
------------------------------------------------------------------------------
ALTER TABLE public.reports ALTER COLUMN reporter_id DROP NOT NULL;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE public.reports
    ADD CONSTRAINT reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

------------------------------------------------------------------------------
-- 4. Agreeing to a new version of the Privacy Notice and Terms
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_consent(p_notice_version text, p_adult_confirmed boolean, p_terms_accepted boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    me uuid := auth.uid();
    v text := NULLIF(btrim(p_notice_version), '');
BEGIN
    IF me IS NULL THEN
        RAISE EXCEPTION 'You need to be logged in.';
    END IF;
    IF v IS NULL OR char_length(v) > 40 THEN
        RAISE EXCEPTION 'Unknown notice version.';
    END IF;
    IF NOT COALESCE(p_adult_confirmed, false) OR NOT COALESCE(p_terms_accepted, false) THEN
        RAISE EXCEPTION 'To keep using GoodsMandi you must confirm you are 18 or older and accept the Terms and the Privacy Notice.';
    END IF;

    INSERT INTO consent_records (user_id, notice_version, adult_confirmed, terms_accepted)
    VALUES (me, v, true, true);
END;
$$;
REVOKE ALL ON FUNCTION public.record_consent(text, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_consent(text, boolean, boolean) TO authenticated;
