-- ==============================================================================
-- QuickBite - Production Supabase Storage Configuration
-- Buckets: restaurant-media, avatars
-- Idempotent setup with Row Level Security (RLS) policies
-- Note: Does NOT modify or drop any public application tables or schema.sql.
-- ==============================================================================

-- ==============================================================================
-- 1. STORAGE BUCKETS SETUP
-- ==============================================================================

-- 1.1 'restaurant-media' (Logos, banners, menu dish photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'restaurant-media',
    'restaurant-media',
    TRUE,
    5242880, -- 5 MB limit per image
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

-- 1.2 'avatars' (User and delivery partner profile pictures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    TRUE,
    2097152, -- 2 MB limit per avatar
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];


-- ==============================================================================
-- 2. STORAGE RLS POLICIES (IDEMPOTENT & SAFE FOR SQL EDITOR)
-- Note: Supabase-managed storage.objects already has RLS enabled by default.
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY is intentionally omitted
-- because storage.objects is owned by supabase_storage_admin (prevents error 42501).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 2.1 POLICIES FOR 'restaurant-media'
-- ------------------------------------------------------------------------------

-- Public read access: Anyone can view restaurant logos, dish photos, and banners
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view restaurant media" ON storage.objects;
    CREATE POLICY "Public can view restaurant media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'restaurant-media');
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN insufficient_privilege THEN NULL;
END $$;

-- Authenticated upload access: Authenticated users can upload media
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can upload restaurant media" ON storage.objects;
    CREATE POLICY "Authenticated users can upload restaurant media"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'restaurant-media');
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN insufficient_privilege THEN NULL;
END $$;

-- Authenticated update access: Authenticated users can update media they own
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can update restaurant media" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update own restaurant media" ON storage.objects;
    CREATE POLICY "Authenticated users can update own restaurant media"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'restaurant-media'
        AND (auth.uid() = owner OR public.is_admin())
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN insufficient_privilege THEN NULL;
END $$;

-- Authenticated delete access: Authenticated users can delete media they own
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can delete restaurant media" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete own restaurant media" ON storage.objects;
    CREATE POLICY "Authenticated users can delete own restaurant media"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'restaurant-media'
        AND (auth.uid() = owner OR public.is_admin())
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN insufficient_privilege THEN NULL;
END $$;


-- ------------------------------------------------------------------------------
-- 2.2 POLICIES FOR 'avatars'
-- ------------------------------------------------------------------------------

-- Public read access: Anyone can view user and driver profile avatars
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
    CREATE POLICY "Public can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN insufficient_privilege THEN NULL;
END $$;

-- Authenticated upload access: Authenticated users can upload their profile avatar
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
    CREATE POLICY "Authenticated users can upload avatars"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'avatars');
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN insufficient_privilege THEN NULL;
END $$;

-- Authenticated update access: Authenticated users can update their profile avatar
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update own avatars" ON storage.objects;
    CREATE POLICY "Authenticated users can update own avatars"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (auth.uid() = owner OR public.is_admin())
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN insufficient_privilege THEN NULL;
END $$;

-- Authenticated delete access: Authenticated users can delete their profile avatar
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete own avatars" ON storage.objects;
    CREATE POLICY "Authenticated users can delete own avatars"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (auth.uid() = owner OR public.is_admin())
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN insufficient_privilege THEN NULL;
END $$;
