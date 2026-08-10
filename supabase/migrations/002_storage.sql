-- 002_storage.sql

-- Insert buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-photos', 'listing-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);

-- Enable RLS for storage.objects if not already enabled (good practice, although Supabase sets it up)
-- Storage RLS

-- Anyone can SELECT (read) from both buckets
CREATE POLICY "Public Read Access listing-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-photos');

CREATE POLICY "Public Read Access profile-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Authenticated users can INSERT to listing-photos (with path prefix matching their user id)
CREATE POLICY "Authenticated users can upload to listing-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'listing-photos' 
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Authenticated users can INSERT to profile-photos (with path prefix matching their user id)
CREATE POLICY "Authenticated users can upload to profile-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-photos' 
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Users can UPDATE/DELETE their own uploads
CREATE POLICY "Users can update own uploads listing-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'listing-photos' 
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can delete own uploads listing-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'listing-photos' 
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can update own uploads profile-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-photos' 
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can delete own uploads profile-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-photos' 
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
