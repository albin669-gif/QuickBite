-- ==============================================================================
-- QuickBite - Harden Supabase Storage RLS Policies
-- File: supabase/migrations/20260912_harden_storage_rls.sql
-- Fixes: Insecure Direct Object Deletion / Missing Owner Constraint
-- Safe and idempotent: Uses direct DROP POLICY IF EXISTS followed by CREATE POLICY.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. POLICIES FOR 'restaurant-media'
-- ------------------------------------------------------------------------------

-- Public read access: Anyone can view restaurant logos, dish photos, and banners
DROP POLICY IF EXISTS "Public can view restaurant media" ON storage.objects;
CREATE POLICY "Public can view restaurant media"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-media');

-- Authenticated upload access: Authenticated users can upload media
DROP POLICY IF EXISTS "Authenticated users can upload restaurant media" ON storage.objects;
CREATE POLICY "Authenticated users can upload restaurant media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'restaurant-media');

-- Hardened update access: Only the object owner or an admin can update media
DROP POLICY IF EXISTS "Authenticated users can update restaurant media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own restaurant media" ON storage.objects;
CREATE POLICY "Authenticated users can update own restaurant media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'restaurant-media'
    AND (auth.uid() = owner OR public.is_admin())
)
WITH CHECK (
    bucket_id = 'restaurant-media'
    AND (auth.uid() = owner OR public.is_admin())
);

-- Hardened delete access: Only the object owner or an admin can delete media
DROP POLICY IF EXISTS "Authenticated users can delete restaurant media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own restaurant media" ON storage.objects;
CREATE POLICY "Authenticated users can delete own restaurant media"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'restaurant-media'
    AND (auth.uid() = owner OR public.is_admin())
);

-- ------------------------------------------------------------------------------
-- 2. POLICIES FOR 'avatars'
-- ------------------------------------------------------------------------------

-- Public read access: Anyone can view user and driver profile avatars
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated upload access: Authenticated users can upload avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Hardened update access: Only the object owner or an admin can update avatars
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (auth.uid() = owner OR public.is_admin())
)
WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid() = owner OR public.is_admin())
);

-- Hardened delete access: Only the object owner or an admin can delete avatars
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (auth.uid() = owner OR public.is_admin())
);
