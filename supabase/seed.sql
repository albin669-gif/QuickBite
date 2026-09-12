-- ==============================================================================
-- QuickBite - Development-Only Seed Script
-- WARNING: DO NOT RUN THIS SCRIPT IN PRODUCTION.
-- 
-- Production databases must ONLY contain real registered users, real restaurants,
-- and organic reviews/ratings generated through completed customer orders.
--
-- This script is strictly for local/staging developer environments to test
-- menu rendering and catalog views when at least one owner profile exists.
-- ==============================================================================

DO $$
DECLARE
    v_owner_id UUID;
    rest1_id UUID := '44444444-4444-4444-4444-444444444441';
    rest2_id UUID := '44444444-4444-4444-4444-444444444442';
    cat1_1 UUID := '55555555-5555-5555-5555-555555555501';
    cat1_2 UUID := '55555555-5555-5555-5555-555555555502';
BEGIN
    -- 1. Resolve a real existing profile to satisfy the foreign key constraint:
    -- restaurants.owner_id REFERENCES public.profiles(id)
    SELECT id INTO v_owner_id 
    FROM public.profiles 
    WHERE role IN ('RESTAURANT_OWNER', 'ADMIN') 
    LIMIT 1;

    -- If no owner profile exists yet, skip restaurant creation gracefully
    -- rather than throwing foreign key constraint violation (23503).
    IF v_owner_id IS NULL THEN
        RAISE NOTICE 'No RESTAURANT_OWNER or ADMIN profile found in public.profiles. Skipping mock restaurant seeding.';
    ELSE
        -- Seed sample restaurants attached to the verified owner profile
        INSERT INTO public.restaurants (
            id, owner_id, name, description, address, city, state, postal_code,
            phone, email, logo_url, banner_url, cuisine_types,
            rating, total_reviews, delivery_time_min, delivery_time_max, minimum_order, delivery_fee
        ) VALUES (
            rest1_id, v_owner_id,
            'Royal Hyderabadi Biryani',
            'Authentic dum cooked Hyderabadi biryanis and kebabs prepared with traditional spices.',
            '100 Feet Road, Indiranagar', 'Bangalore', 'Karnataka', '560038',
            '+91 98765 43210', 'order@royalbiryani.in',
            'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200&auto=format&fit=crop&q=80',
            ARRAY['Biryani', 'Mughlai', 'North Indian'],
            0.00, 0, 25, 35, 149.00, 39.00
        ) ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.restaurants (
            id, owner_id, name, description, address, city, state, postal_code,
            phone, email, logo_url, banner_url, cuisine_types,
            rating, total_reviews, delivery_time_min, delivery_time_max, minimum_order, delivery_fee
        ) VALUES (
            rest2_id, v_owner_id,
            'Dakshin Tiffin Express',
            'Crispy ghee roast dosas, fluffy steamed idlis, and traditional filter coffee.',
            'Jayanagar 4th Block', 'Bangalore', 'Karnataka', '560041',
            '+91 98765 43212', 'support@dakshinexpress.in',
            'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=200&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=1200&auto=format&fit=crop&q=80',
            ARRAY['South Indian', 'Breakfast', 'Fast Food'],
            0.00, 0, 15, 25, 99.00, 25.00
        ) ON CONFLICT (id) DO NOTHING;

        -- Seed Categories
        INSERT INTO public.menu_categories (id, restaurant_id, name, description, display_order)
        VALUES
            (cat1_1, rest1_id, 'Special Biryanis', 'Slow cooked aromatic basmati rice dum biryanis', 1),
            (cat1_2, rest1_id, 'Starters & Kebabs', 'Clay oven tandoor grilled specialties', 2)
        ON CONFLICT (id) DO NOTHING;

        -- Seed Menu Items
        INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, is_veg, is_available, image_url)
        VALUES
            (rest1_id, cat1_1, 'Hyderabadi Chicken Dum Biryani', 'Fragrant basmati rice layered with spiced chicken, mint, and saffron.', 280.00, FALSE, TRUE, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'),
            (rest1_id, cat1_1, 'Hyderabadi Paneer Dum Biryani', 'Fresh cottage cheese cubes cooked in aromatic spices and long grain rice.', 240.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1642821373181-696a54913e9a?w=500&auto=format&fit=crop&q=80'),
            (rest1_id, cat1_2, 'Chicken Tikka Kebab (6 Pcs)', 'Boneless chicken marinated in yogurt and tandoori spices, smoked in tandoor.', 260.00, FALSE, TRUE, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80')
        ON CONFLICT DO NOTHING;
    END IF;

    -- 2. Standard Promotional Coupons (Safe to seed in development environments)
    -- Using the correct column names: start_date and end_date
    INSERT INTO public.coupons (
        code, description, discount_type, discount_value, min_order_amount, max_discount_amount, start_date, end_date, is_active
    ) VALUES
        ('WELCOME50', 'Get flat ₹50 OFF on your first food order above ₹199', 'FIXED', 50.00, 199.00, 50.00, NOW(), NOW() + INTERVAL '1 year', TRUE),
        ('QUICKBITE20', 'Get 20% OFF on gourmet orders above ₹399 (up to ₹100)', 'PERCENTAGE', 20.00, 399.00, 100.00, NOW(), NOW() + INTERVAL '1 year', TRUE),
        ('FESTIVE100', 'Flat ₹100 OFF on family orders above ₹599', 'FIXED', 100.00, 599.00, 100.00, NOW(), NOW() + INTERVAL '1 year', TRUE)
    ON CONFLICT (code) DO NOTHING;

END $$;
