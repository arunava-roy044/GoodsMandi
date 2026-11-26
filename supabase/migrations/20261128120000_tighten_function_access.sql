-- Security review follow-up: close two ways the public API (/rest/v1/rpc/...) reached
-- functions it was never meant to.
--
-- 1. rls_auto_enable() is a helper Supabase adds to a project. The app never calls it, but
--    it was callable by signed-out visitors and by every signed-in user. Nobody who talks to
--    the API needs it (the event trigger that uses it runs as the database owner).
--
-- 2. has_messaged(listing, from, to) answered "did this person message that person about
--    this listing?" for ANY two people. The only place that needs it is the chat-send rule,
--    where the caller is always the recipient (p_to) of the question. It now only answers
--    for a caller who is one of the two people, or an admin; anyone else gets false.
--    Trusted code (auth.uid() IS NULL: the dashboard, the service role, tests that call it
--    directly as the owner) is unchanged.
--
-- is_banned(uuid) is deliberately NOT changed here: many internal functions ask it about
-- *other* people (accepting an offer checks the bidder), so narrowing it would weaken ban
-- enforcement. It only reveals whether someone is restricted.

-- 1. Only exists on projects where Supabase created it, so check first
DO $$
BEGIN
    IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
        REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
    END IF;
END $$;

-- 2. Same lookup as before, but only for the people involved
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
    )
    AND (
        auth.uid() IS NULL
        OR auth.uid() IN (p_from, p_to)
        OR public.is_admin()
    );
$$;
REVOKE ALL ON FUNCTION public.has_messaged(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_messaged(uuid, uuid, uuid) TO authenticated;
