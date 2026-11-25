-- 20261126120000_chat_read_receipts.sql
-- Chat redesign:
--   1. chat_reads: when each person last opened each conversation
--      (drives unread badges and "Seen" ticks)
--   2. mark_chat_read(): the caller marks a conversation read, and clears its
--      "new message" notifications
--   3. get_my_conversations() now also returns the item photo, price and status,
--      whether the caller is the seller, the unread count and "seen" state
--   4. get_unread_chat_count(): number of unread messages, for the navbar badge

------------------------------------------------------------------------------
-- 1. chat_reads
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_reads (
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    other_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, listing_id, other_user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_reads_other ON public.chat_reads (other_user_id, listing_id);
CREATE INDEX IF NOT EXISTS idx_chat_reads_listing ON public.chat_reads (listing_id);

ALTER TABLE public.chat_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_reads FROM anon, authenticated;
GRANT SELECT ON public.chat_reads TO authenticated;

-- You can see your own read marks, and the other person's marks for chats with you
-- (that is what "Seen" needs). Writes only go through mark_chat_read().
DROP POLICY IF EXISTS "chat_reads_select_participants" ON public.chat_reads;
CREATE POLICY "chat_reads_select_participants"
ON public.chat_reads FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()) OR other_user_id = (SELECT auth.uid()));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_reads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reads;
    END IF;
END $$;

-- Existing chats start as read for both people, so nobody opens the app to a wall
-- of old "unread" messages.
INSERT INTO public.chat_reads (user_id, listing_id, other_user_id, last_read_at)
SELECT DISTINCT person, listing_id, other, now()
FROM (
    SELECT sender_id AS person, listing_id, recipient_id AS other FROM public.chat_messages
    UNION
    SELECT recipient_id, listing_id, sender_id FROM public.chat_messages
) pairs
ON CONFLICT DO NOTHING;

------------------------------------------------------------------------------
-- 2. mark_chat_read
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_chat_read(p_listing_id uuid, p_other_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    me uuid := auth.uid();
BEGIN
    IF me IS NULL THEN
        RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
    END IF;

    -- Only conversations that actually exist get a read mark
    IF NOT EXISTS (
        SELECT 1 FROM chat_messages
        WHERE listing_id = p_listing_id
          AND ((sender_id = me AND recipient_id = p_other_user_id)
            OR (sender_id = p_other_user_id AND recipient_id = me))
    ) THEN
        RETURN;
    END IF;

    INSERT INTO chat_reads (user_id, listing_id, other_user_id, last_read_at)
    VALUES (me, p_listing_id, p_other_user_id, now())
    ON CONFLICT (user_id, listing_id, other_user_id)
    DO UPDATE SET last_read_at = EXCLUDED.last_read_at;

    UPDATE notifications SET read_at = now()
    WHERE user_id = me
      AND kind = 'new_message'
      AND listing_id = p_listing_id
      AND actor_id = p_other_user_id
      AND read_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_chat_read(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_chat_read(uuid, uuid) TO authenticated;

------------------------------------------------------------------------------
-- 3. get_my_conversations, with item details and read state
------------------------------------------------------------------------------
-- The return columns change, so the old function has to be dropped first.
-- SECURITY INVOKER as before: listings the caller can no longer see come back
-- with NULL item fields.
DROP FUNCTION IF EXISTS public.get_my_conversations();

CREATE FUNCTION public.get_my_conversations()
RETURNS TABLE (
    listing_id uuid,
    other_user_id uuid,
    listing_title text,
    listing_photo text,
    listing_price numeric,
    listing_status text,
    i_am_seller boolean,
    other_user_name text,
    other_user_photo text,
    last_message text,
    last_message_mine boolean,
    last_message_time timestamptz,
    last_message_seen boolean,
    unread_count integer
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    WITH mine AS (
        SELECT c.*,
               CASE WHEN c.sender_id = auth.uid() THEN c.recipient_id ELSE c.sender_id END AS other_id
        FROM chat_messages c
        WHERE c.sender_id = auth.uid() OR c.recipient_id = auth.uid()
    ),
    latest AS (
        SELECT DISTINCT ON (m.listing_id, m.other_id) m.*
        FROM mine m
        ORDER BY m.listing_id, m.other_id, m.created_at DESC
    )
    SELECT
        lt.listing_id,
        lt.other_id,
        l.title,
        l.photos[1],
        l.asking_price::numeric,
        l.status::text,
        l.seller_id = auth.uid(),
        p.name,
        p.profile_photo_url,
        lt.message_text,
        lt.sender_id = auth.uid(),
        lt.created_at,
        (lt.sender_id = auth.uid() AND theirs.last_read_at IS NOT NULL AND theirs.last_read_at >= lt.created_at),
        (
            SELECT count(*)::int FROM mine u
            WHERE u.listing_id = lt.listing_id
              AND u.sender_id = lt.other_id
              AND u.created_at > COALESCE(myread.last_read_at, '-infinity'::timestamptz)
        )
    FROM latest lt
    LEFT JOIN listings l ON l.id = lt.listing_id
    LEFT JOIN profiles p ON p.id = lt.other_id
    LEFT JOIN chat_reads myread
           ON myread.user_id = auth.uid() AND myread.listing_id = lt.listing_id AND myread.other_user_id = lt.other_id
    LEFT JOIN chat_reads theirs
           ON theirs.user_id = lt.other_id AND theirs.listing_id = lt.listing_id AND theirs.other_user_id = auth.uid()
    ORDER BY lt.created_at DESC
    LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_my_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;

------------------------------------------------------------------------------
-- 4. get_unread_chat_count
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_unread_chat_count()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT count(*)::int
    FROM chat_messages c
    LEFT JOIN chat_reads r
           ON r.user_id = auth.uid() AND r.listing_id = c.listing_id AND r.other_user_id = c.sender_id
    WHERE c.recipient_id = auth.uid()
      AND c.created_at > COALESCE(r.last_read_at, '-infinity'::timestamptz);
$$;

REVOKE ALL ON FUNCTION public.get_unread_chat_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unread_chat_count() TO authenticated;
