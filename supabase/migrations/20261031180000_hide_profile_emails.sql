-- 20261031180000_hide_profile_emails.sql
-- Any signed-in user could read every profile's college_email through the API.
-- Replace the table-wide SELECT grant with a column list that leaves it out.
-- The app never reads college_email; the signed-in user's own email is on their
-- auth session. Note: columns added to profiles later must be granted here too.

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
    is_admin,
    created_at
) ON public.profiles TO authenticated;
