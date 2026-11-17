-- ============================================================
-- WSH Portal — Seed Data
-- Run AFTER schema.sql in the Supabase SQL Editor.
-- ============================================================

-- ── Subscription Plans ──────────────────────────────────────
INSERT INTO public.subscription_plans (id, name, description, price, currency, duration_days, features, is_active)
VALUES
    (
        'a1b2c3d4-0001-0001-0001-000000000001',
        'Basic',
        'Perfect for individuals getting started with WSH Portal.',
        9.99,
        'USD',
        30,
        '["Access to public events", "View community posts", "Basic profile", "Event RSVP (up to 3/month)"]'::jsonb,
        true
    ),
    (
        'a1b2c3d4-0002-0002-0002-000000000002',
        'Pro',
        'For active community members who want the full WSH experience.',
        19.99,
        'USD',
        30,
        '["Everything in Basic", "Unlimited event RSVP", "Full profile customization", "Priority event notifications", "Access to exclusive events"]'::jsonb,
        true
    ),
    (
        'a1b2c3d4-0003-0003-0003-000000000003',
        'Enterprise',
        'For organizations, teams, and power users.',
        49.99,
        'USD',
        30,
        '["Everything in Pro", "Create & manage events", "Team member seats (up to 10)", "Analytics dashboard", "Dedicated support", "Custom branding"]'::jsonb,
        true
    )
ON CONFLICT (id) DO NOTHING;

-- ── Sample Events ───────────────────────────────────────────
-- Note: organizer_id references auth.users; replace UUIDs with real user IDs when testing.
-- These events use a placeholder organizer UUID that must be replaced in real use.
-- Using a known UUID pattern for demo purposes — replace with actual user IDs.

DO $$
DECLARE
    demo_organizer_id UUID;
BEGIN
    -- Try to get a real user, or skip events if no users exist
    SELECT id INTO demo_organizer_id FROM auth.users LIMIT 1;

    IF demo_organizer_id IS NOT NULL THEN
        INSERT INTO public.events (id, title, description, location, event_date, end_date, organizer_id, category, tags, max_attendees, is_public)
        VALUES
            (
                'e0000001-0000-0000-0000-000000000001',
                'WSH Annual Summit 2026',
                'Our flagship annual conference bringing together the brightest minds in our community for two days of learning, networking, and inspiration. Featuring keynote speakers, workshops, and a gala dinner.',
                'Grand Hyatt, Downtown Conference Center',
                NOW() + INTERVAL '45 days',
                NOW() + INTERVAL '47 days',
                demo_organizer_id,
                'conference',
                ARRAY['summit', 'networking', 'keynote', 'annual'],
                500,
                true
            ),
            (
                'e0000002-0000-0000-0000-000000000002',
                'Web Development Bootcamp — React & Supabase',
                'An intensive 3-day bootcamp where you will build a full-stack application using React and Supabase. Suitable for intermediate developers. Bring your laptop!',
                'WSH Tech Hub, Room 3A',
                NOW() + INTERVAL '14 days',
                NOW() + INTERVAL '17 days',
                demo_organizer_id,
                'workshop',
                ARRAY['react', 'supabase', 'coding', 'bootcamp', 'web'],
                30,
                true
            ),
            (
                'e0000003-0000-0000-0000-000000000003',
                'Monthly Networking Mixer — November',
                'Join us for a relaxed evening of networking with fellow WSH community members. Light refreshments will be served. Perfect for newcomers and veterans alike.',
                'The Rooftop Lounge, WSH HQ',
                NOW() + INTERVAL '7 days',
                NOW() + INTERVAL '7 days' + INTERVAL '3 hours',
                demo_organizer_id,
                'networking',
                ARRAY['networking', 'mixer', 'social', 'monthly'],
                100,
                true
            ),
            (
                'e0000004-0000-0000-0000-000000000004',
                'AI & Machine Learning Panel Discussion',
                'A thought-provoking panel featuring experts from across the industry discussing the future of AI, ethical considerations, and practical applications for businesses of all sizes.',
                'Virtual — Zoom Webinar',
                NOW() + INTERVAL '21 days',
                NOW() + INTERVAL '21 days' + INTERVAL '2 hours',
                demo_organizer_id,
                'seminar',
                ARRAY['ai', 'machine-learning', 'panel', 'virtual', 'technology'],
                NULL,
                true
            ),
            (
                'e0000005-0000-0000-0000-000000000005',
                'Product Design Sprint — UX Workshop',
                'Learn the Google Design Sprint methodology and apply it to a real product challenge in this hands-on 1-day workshop. Teams of 4–5 will compete for best prototype.',
                'WSH Design Studio, Floor 2',
                NOW() + INTERVAL '30 days',
                NOW() + INTERVAL '30 days' + INTERVAL '8 hours',
                demo_organizer_id,
                'workshop',
                ARRAY['design', 'ux', 'sprint', 'prototype', 'product'],
                25,
                true
            )
        ON CONFLICT (id) DO NOTHING;

        -- ── Sample Posts ─────────────────────────────────────────────
        INSERT INTO public.posts (id, author_id, title, content, type, tags, is_published)
        VALUES
            (
                'p0000001-0000-0000-0000-000000000001',
                demo_organizer_id,
                '🎉 Welcome to WSH Portal — Your Community Hub',
                'We are thrilled to officially launch the WSH Portal! This platform is your one-stop destination for community events, announcements, networking, and resources. Subscribe to a plan to unlock full access to all features, including profile customization and event registration. Explore the events calendar, connect with fellow members, and stay up to date with the latest announcements. We are just getting started — expect exciting features and events coming your way soon!',
                'announcement',
                ARRAY['welcome', 'launch', 'community'],
                true
            ),
            (
                'p0000002-0000-0000-0000-000000000002',
                demo_organizer_id,
                'How to Get the Most Out of Your WSH Membership',
                'Whether you are a Basic, Pro, or Enterprise member, there are countless ways to engage with the WSH community. Here are our top 5 tips: 1) Complete your profile to get discovered. 2) RSVP to events early as seats fill fast. 3) Use the search feature to find members with shared interests. 4) Engage with posts by liking and sharing. 5) Upgrade your plan as your involvement grows. The more you put in, the more you get out. See you at the next event!',
                'article',
                ARRAY['tips', 'membership', 'guide'],
                true
            ),
            (
                'p0000003-0000-0000-0000-000000000003',
                demo_organizer_id,
                '📢 Annual Summit Speakers Announced',
                'We are excited to announce the keynote speakers for the WSH Annual Summit 2026! This year''s lineup features industry leaders from technology, design, entrepreneurship, and social impact. Early bird tickets are now available — register before the end of the month to save 20%. Seats are limited, so do not wait. Full speaker bios and schedule will be published next week.',
                'announcement',
                ARRAY['summit', 'speakers', 'announcement', 'tickets'],
                true
            ),
            (
                'p0000004-0000-0000-0000-000000000004',
                demo_organizer_id,
                'The Future of Work: Remote, Hybrid, or In-Office?',
                'As the world continues to adapt post-pandemic, organizations face a critical question: what does the ideal work arrangement look like? In this article, we explore data from our recent community survey, hearing from over 200 WSH members across industries. Key findings: 67% prefer hybrid arrangements, 22% prefer fully remote, and 11% prefer in-office. The consensus? Flexibility and trust are the top factors driving satisfaction. Read the full report in the members section.',
                'article',
                ARRAY['future-of-work', 'remote', 'hybrid', 'survey'],
                true
            ),
            (
                'p0000005-0000-0000-0000-000000000005',
                demo_organizer_id,
                '⭐ Featured: Member Spotlight — Building Community Through Tech',
                'Every month we spotlight an outstanding WSH community member who is making a difference. This month, we feature Sarah Chen, founder of ConnectLocal, a platform that has helped over 10,000 people find volunteering opportunities in their neighborhoods. Sarah shares her journey, the challenges of building a tech startup, and how the WSH community played a pivotal role in her growth. Read her story and get inspired.',
                'featured',
                ARRAY['spotlight', 'featured', 'member', 'startup', 'inspiration'],
                true
            )
        ON CONFLICT (id) DO NOTHING;
    END IF;
END;
$$;
