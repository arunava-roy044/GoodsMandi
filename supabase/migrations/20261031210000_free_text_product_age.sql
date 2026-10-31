-- Allow sellers to type their own product age ("Others" option in the form).
-- product_age was a strict enum; switch it to text and keep basic sanity limits.
-- Existing rows keep their current values.

ALTER TABLE public.listings
    ALTER COLUMN product_age TYPE text USING product_age::text;

ALTER TABLE public.listings
    ADD CONSTRAINT listings_product_age_length
    CHECK (char_length(btrim(product_age)) BETWEEN 1 AND 40);

DROP TYPE IF EXISTS public.product_age_bracket;
