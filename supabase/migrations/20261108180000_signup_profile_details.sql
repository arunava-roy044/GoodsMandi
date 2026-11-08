-- The signup form sends year of study and branch, but handle_new_user only
-- saved the name, so every new profile had an empty year and branch.
-- Save them on signup, and fill them in for existing profiles that are missing them.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    meta jsonb := COALESCE(new.raw_user_meta_data, '{}'::jsonb);
    year_text text := meta->>'year_of_study';
BEGIN
    INSERT INTO public.profiles (id, college_email, name, year_of_study, branch_course)
    VALUES (
        new.id,
        new.email,
        COALESCE(NULLIF(btrim(meta->>'full_name'), ''), split_part(new.email, '@', 1)),
        CASE WHEN year_text ~ '^[1-9]$' THEN year_text::integer END,
        NULLIF(left(btrim(meta->>'branch_course'), 60), '')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Backfill: only fills empty fields, never overwrites what a user has set
UPDATE public.profiles p
SET
    year_of_study = COALESCE(
        p.year_of_study,
        CASE WHEN (u.raw_user_meta_data->>'year_of_study') ~ '^[1-9]$'
             THEN (u.raw_user_meta_data->>'year_of_study')::integer END
    ),
    branch_course = COALESCE(
        NULLIF(p.branch_course, ''),
        NULLIF(left(btrim(u.raw_user_meta_data->>'branch_course'), 60), '')
    )
FROM auth.users u
WHERE u.id = p.id
  AND (p.year_of_study IS NULL OR p.branch_course IS NULL OR p.branch_course = '');
