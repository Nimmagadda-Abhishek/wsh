-- ============================================================
-- WSH Portal — Full Database Schema
-- Run this in the Supabase SQL Editor to set up the database.
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fast text search (ILIKE)

-- ============================================================
-- 1. SUBSCRIPTION PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    description   TEXT,
    price         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency      TEXT NOT NULL DEFAULT 'USD',
    duration_days INTEGER NOT NULL DEFAULT 30,
    features      JSONB DEFAULT '[]'::jsonb,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. USER SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id    UUID NOT NULL REFERENCES public.subscription_plans(id),
    status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id  ON public.user_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status   ON public.user_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires  ON public.user_subscriptions (expires_at);

-- ============================================================
-- 3. PROFILES  (extends auth.users 1-to-1)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username            TEXT UNIQUE,
    full_name           TEXT,
    bio                 TEXT,
    avatar_url          TEXT,
    phone               TEXT,
    location            TEXT,
    city                TEXT,
    country             TEXT,
    website             TEXT,
    role                TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'business_owner', 'admin')),
    is_profile_complete BOOLEAN NOT NULL DEFAULT false,
    subscription_id     UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username  ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles USING gin (full_name gin_trgm_ops);

-- ============================================================
-- 3a. BUSINESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.business_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO public.business_categories (name, slug, sort_order) VALUES
    ('Healthcare', 'healthcare', 1),
    ('Real Estate', 'real-estate', 2),
    ('Technology', 'technology', 3),
    ('Manufacturing', 'manufacturing', 4),
    ('Agriculture', 'agriculture', 5),
    ('Education', 'education', 6),
    ('Finance', 'finance', 7),
    ('Automobile', 'automobile', 8),
    ('Professional Services', 'professional-services', 9)
ON CONFLICT (slug) DO NOTHING;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS business_categories_public_read ON public.business_categories;
CREATE POLICY business_categories_public_read ON public.business_categories FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.business_categories(id),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
    description TEXT,
    logo_url TEXT,
    cover_url TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    hours JSONB NOT NULL DEFAULT '{}'::jsonb,
    social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'suspended')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    plan_code TEXT NOT NULL DEFAULT 'free' CHECK (plan_code IN ('free', 'pro', 'premium')),
    avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_status_city ON public.businesses(status, city);
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS businesses_select_published_or_owner ON public.businesses;
CREATE POLICY businesses_select_published_or_owner ON public.businesses FOR SELECT TO authenticated
    USING (status = 'published' OR auth.uid() = owner_id);
DROP POLICY IF EXISTS businesses_insert_owner ON public.businesses;
CREATE POLICY businesses_insert_owner ON public.businesses FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS businesses_update_owner ON public.businesses;
CREATE POLICY businesses_update_owner ON public.businesses FOR UPDATE TO authenticated
    USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- ============================================================
-- 4. EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    description     TEXT,
    cover_image_url TEXT,
    location        TEXT,
    event_date      TIMESTAMPTZ NOT NULL,
    end_date        TIMESTAMPTZ,
    organizer_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category        TEXT,
    tags            TEXT[] DEFAULT ARRAY[]::TEXT[],
    max_attendees   INTEGER,
    is_public       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events (organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date   ON public.events (event_date);
CREATE INDEX IF NOT EXISTS idx_events_category     ON public.events (category);
CREATE INDEX IF NOT EXISTS idx_events_is_public    ON public.events (is_public);
CREATE INDEX IF NOT EXISTS idx_events_title        ON public.events USING gin (title gin_trgm_ops);

-- ============================================================
-- 5. EVENT REGISTRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled', 'attended')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id  ON public.event_registrations (user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status   ON public.event_registrations (status);

-- ============================================================
-- 6. POSTS  (home feed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.posts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    content         TEXT,
    cover_image_url TEXT,
    type            TEXT NOT NULL DEFAULT 'article' CHECK (type IN ('announcement', 'article', 'featured')),
    tags            TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_published    BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id    ON public.posts (author_id);
CREATE INDEX IF NOT EXISTS idx_posts_type         ON public.posts (type);
CREATE INDEX IF NOT EXISTS idx_posts_is_published ON public.posts (is_published);
CREATE INDEX IF NOT EXISTS idx_posts_created_at   ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_title        ON public.posts USING gin (title gin_trgm_ops);

-- ============================================================
-- 7. POST LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes (user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, is_profile_complete)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'full_name',
        false
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp for profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_events_updated_at ON public.events;
CREATE TRIGGER set_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_posts_updated_at ON public.posts;
CREATE TRIGGER set_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-expire subscriptions
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_subscriptions
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at < NOW();
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.subscription_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes          ENABLE ROW LEVEL SECURITY;

-- ── Helper function: check active subscription ──────────────
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    result BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_subscriptions
        WHERE user_id = user_uuid
          AND status = 'active'
          AND expires_at > NOW()
    ) INTO result;
    RETURN result;
END;
$$;

-- ── PROFILES ────────────────────────────────────────────────
-- Any authenticated user can read any profile
CREATE POLICY "profiles_select_authenticated"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Profile edits do not require a paid subscription (matches the API contract).
DROP POLICY IF EXISTS "profiles_update_own_with_subscription" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (triggered on signup)
CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- ── SUBSCRIPTION PLANS ──────────────────────────────────────
-- Anyone authenticated can read active plans
CREATE POLICY "subscription_plans_select"
    ON public.subscription_plans FOR SELECT
    TO authenticated
    USING (is_active = true);

-- ── USER SUBSCRIPTIONS ──────────────────────────────────────
-- Users can only read their own subscriptions
CREATE POLICY "user_subscriptions_select_own"
    ON public.user_subscriptions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "user_subscriptions_insert_own"
    ON public.user_subscriptions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions (e.g., cancel)
CREATE POLICY "user_subscriptions_update_own"
    ON public.user_subscriptions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- ── EVENTS ──────────────────────────────────────────────────
-- Authenticated users can read public events
CREATE POLICY "events_select_public_authenticated"
    ON public.events FOR SELECT
    TO authenticated
    USING (is_public = true);

-- Authenticated users can create events
CREATE POLICY "events_insert_authenticated"
    ON public.events FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = organizer_id);

-- Only the organizer can update their events
CREATE POLICY "events_update_organizer"
    ON public.events FOR UPDATE
    TO authenticated
    USING (auth.uid() = organizer_id)
    WITH CHECK (auth.uid() = organizer_id);

-- Only the organizer can delete their events
CREATE POLICY "events_delete_organizer"
    ON public.events FOR DELETE
    TO authenticated
    USING (auth.uid() = organizer_id);

-- ── EVENT REGISTRATIONS ─────────────────────────────────────
-- Users can read their own registrations; event organizers can read all registrations for their events
CREATE POLICY "event_registrations_select"
    ON public.event_registrations FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR auth.uid() IN (
            SELECT organizer_id FROM public.events WHERE id = event_id
        )
    );

-- Users can register (insert) for events if they have an active subscription
CREATE POLICY "event_registrations_insert_with_subscription"
    ON public.event_registrations FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND public.has_active_subscription(auth.uid())
    );

-- Users can update (cancel) their own registrations
CREATE POLICY "event_registrations_update_own"
    ON public.event_registrations FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ── POSTS ───────────────────────────────────────────────────
-- Any authenticated user can read published posts
CREATE POLICY "posts_select_published_authenticated"
    ON public.posts FOR SELECT
    TO authenticated
    USING (is_published = true);

-- Only service role (admin) can insert/update/delete posts
-- (Use supabaseAdmin client on the server side for content management)

-- ── POST LIKES ──────────────────────────────────────────────
-- Users can read all likes
CREATE POLICY "post_likes_select_authenticated"
    ON public.post_likes FOR SELECT
    TO authenticated
    USING (true);

-- Users can like posts (insert their own likes)
CREATE POLICY "post_likes_insert_own"
    ON public.post_likes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can remove their own likes
CREATE POLICY "post_likes_delete_own"
    ON public.post_likes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Create avatars bucket (if it doesn't exist via dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder in avatars bucket
CREATE POLICY "avatar_upload_own"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to update their own avatars
CREATE POLICY "avatar_update_own"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow public read of all avatars
CREATE POLICY "avatar_public_read"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'avatars');
