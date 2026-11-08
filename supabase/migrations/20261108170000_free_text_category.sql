-- Allow sellers to tag their own category ("Others" option in the sell form).
-- category was a strict enum; switch it to text and keep basic sanity limits.
-- Existing rows keep their current values. The index on category is rebuilt automatically.

ALTER TABLE public.listings
    ALTER COLUMN category TYPE text USING category::text;

ALTER TABLE public.listings
    ADD CONSTRAINT listings_category_length
    CHECK (char_length(btrim(category)) BETWEEN 1 AND 40);

DROP TYPE IF EXISTS public.listing_category;
