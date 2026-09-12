-- ==============================================================================
-- QuickBite - Production Bootstrap & Demo Seed Script
-- Safe to run in Supabase SQL Editor: Idempotent and respects all foreign keys & RLS.
-- Does NOT create fake customer orders or fake reviews.
-- ==============================================================================

DO $$
DECLARE
    v_owner_hyderabad UUID;
    v_owner_punjab UUID;
    v_owner_dakshin UUID;
    v_owner_delhi UUID;
    v_owner_bengal UUID;

    rest1_id UUID := '44444444-4444-4444-4444-444444444441';
    rest2_id UUID := '44444444-4444-4444-4444-444444444442';
    rest3_id UUID := '44444444-4444-4444-4444-444444444443';
    rest4_id UUID := '44444444-4444-4444-4444-444444444444';
    rest5_id UUID := '44444444-4444-4444-4444-444444444445';

    cat1_1 UUID := '55555555-5555-5555-5555-555555555501';
    cat1_2 UUID := '55555555-5555-5555-5555-555555555502';
    cat1_3 UUID := '55555555-5555-5555-5555-555555555503';
    cat2_1 UUID := '55555555-5555-5555-5555-555555555504';
    cat2_2 UUID := '55555555-5555-5555-5555-555555555505';
    cat3_1 UUID := '55555555-5555-5555-5555-555555555511';
    cat3_2 UUID := '55555555-5555-5555-5555-555555555512';
    cat3_3 UUID := '55555555-5555-5555-5555-555555555513';
    cat4_1 UUID := '55555555-5555-5555-5555-555555555514';
    cat4_2 UUID := '55555555-5555-5555-5555-555555555515';
    cat5_1 UUID := '55555555-5555-5555-5555-555555555516';
BEGIN
    -- 1. Resolve or verify partner profile IDs
    SELECT id INTO v_owner_hyderabad FROM public.profiles WHERE email = 'owner.hyderabad@quickbite.in';
    SELECT id INTO v_owner_punjab FROM public.profiles WHERE email = 'owner.punjab@quickbite.in';
    SELECT id INTO v_owner_dakshin FROM public.profiles WHERE email = 'owner.dakshin@quickbite.in';
    SELECT id INTO v_owner_delhi FROM public.profiles WHERE email = 'owner.delhichaat@quickbite.in';
    SELECT id INTO v_owner_bengal FROM public.profiles WHERE email = 'owner.sweetbengal@quickbite.in';

    -- Fallback to any available restaurant owner if specific email not found
    IF v_owner_hyderabad IS NULL THEN
        SELECT id INTO v_owner_hyderabad FROM public.profiles WHERE role IN ('RESTAURANT_OWNER', 'ADMIN') LIMIT 1;
        v_owner_punjab := v_owner_hyderabad;
        v_owner_dakshin := v_owner_hyderabad;
        v_owner_delhi := v_owner_hyderabad;
        v_owner_bengal := v_owner_hyderabad;
    END IF;

    IF v_owner_hyderabad IS NULL THEN
        RAISE NOTICE 'No restaurant owner account found. Please ensure at least one RESTAURANT_OWNER is registered in auth.users.';
        RETURN;
    END IF;

    -- 2. Insert/Upsert Restaurants
    INSERT INTO public.restaurants (
        id, owner_id, name, description, address, city, state, postal_code,
        phone, email, logo_url, banner_url, cuisine_types,
        rating, total_reviews, delivery_time_min, delivery_time_max, minimum_order, delivery_fee,
        is_active, is_accepting_orders
    ) VALUES
    (
        rest1_id, v_owner_hyderabad, 'Royal Hyderabadi Biryani',
        'Authentic dum cooked Hyderabadi biryanis and kebabs prepared with traditional spices.',
        '100 Feet Road, Indiranagar', 'Bangalore', 'Karnataka', '560038',
        '+91 98765 43210', 'order@royalbiryani.in',
        'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200&auto=format&fit=crop&q=80',
        ARRAY['Biryani', 'Mughlai', 'North Indian'],
        4.60, 0, 25, 35, 149.00, 39.00, TRUE, TRUE
    ),
    (
        rest2_id, COALESCE(v_owner_punjab, v_owner_hyderabad), 'Punjab Spice & Tandoor',
        'Rich Punjabi gravies, fresh garlic naans, tandoori starters, and creamy lassi.',
        'Koramangala 5th Block', 'Bangalore', 'Karnataka', '560095',
        '+91 98765 43211', 'hello@punjabspice.in',
        'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1200&auto=format&fit=crop&q=80',
        ARRAY['North Indian', 'Punjabi', 'Tandoori'],
        4.50, 0, 30, 45, 199.00, 35.00, TRUE, TRUE
    ),
    (
        rest3_id, COALESCE(v_owner_dakshin, v_owner_hyderabad), 'Dakshin Tiffin Express',
        'Crispy ghee roast dosas, fluffy steamed idlis, and traditional filter coffee.',
        'Jayanagar 4th Block', 'Bangalore', 'Karnataka', '560041',
        '+91 98765 43212', 'support@dakshinexpress.in',
        'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=1200&auto=format&fit=crop&q=80',
        ARRAY['South Indian', 'Breakfast', 'Fast Food'],
        4.80, 0, 15, 25, 99.00, 25.00, TRUE, TRUE
    ),
    (
        rest4_id, COALESCE(v_owner_delhi, v_owner_hyderabad), 'Delhi Chaat & Street Food',
        'Chandni Chowk style Pani Puri, Papdi Chaat, Chole Bhature, and Aloo Tikki.',
        'HSR Layout Sector 1', 'Bangalore', 'Karnataka', '560102',
        '+91 98765 43213', 'contact@delhichaat.in',
        'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=1200&auto=format&fit=crop&q=80',
        ARRAY['Street Food', 'Chaat', 'North Indian'],
        4.40, 0, 20, 30, 99.00, 30.00, TRUE, TRUE
    ),
    (
        rest5_id, COALESCE(v_owner_bengal, v_owner_hyderabad), 'The Sweet Bengal & Desserts',
        'Traditional Rasgullas, soft Gulab Jamuns, Sandesh, and premium Rabri.',
        'Whitefield Main Road', 'Bangalore', 'Karnataka', '560066',
        '+91 98765 43214', 'sweets@sweetbengal.in',
        'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=1200&auto=format&fit=crop&q=80',
        ARRAY['Desserts', 'Mithai', 'Bakery'],
        4.70, 0, 20, 35, 149.00, 29.00, TRUE, TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        cuisine_types = EXCLUDED.cuisine_types,
        is_active = EXCLUDED.is_active,
        is_accepting_orders = EXCLUDED.is_accepting_orders;

    -- 3. Insert/Upsert Operating Hours (Every day 10am to 11pm)
    FOR d IN 0..6 LOOP
        INSERT INTO public.restaurant_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
        VALUES
            (rest1_id, d, '10:00:00', '23:00:00', FALSE),
            (rest2_id, d, '10:00:00', '23:00:00', FALSE),
            (rest3_id, d, '07:00:00', '22:30:00', FALSE),
            (rest4_id, d, '11:00:00', '22:30:00', FALSE),
            (rest5_id, d, '10:00:00', '22:00:00', FALSE)
        ON CONFLICT (restaurant_id, day_of_week) DO NOTHING;
    END LOOP;

    -- 4. Insert/Upsert Categories
    INSERT INTO public.menu_categories (id, restaurant_id, name, description, display_order, is_active)
    VALUES
        (cat1_1, rest1_id, 'Special Biryanis', 'Slow cooked aromatic basmati rice dum biryanis', 1, TRUE),
        (cat1_2, rest1_id, 'Starters & Kebabs', 'Clay oven tandoor grilled specialties', 2, TRUE),
        (cat1_3, rest1_id, 'Desserts & Beverages', 'Traditional sweets and refreshments', 3, TRUE),
        (cat2_1, rest2_id, 'Main Course Gravies', 'Rich butter gravies and curries', 1, TRUE),
        (cat2_2, rest2_id, 'Tandoori Breads & Kulchas', 'Clay oven baked naans, rotis, and kulchas', 2, TRUE),
        (cat3_1, rest3_id, 'Crispy Dosas', 'Golden thin crepes served with sambar and 3 chutneys', 1, TRUE),
        (cat3_2, rest3_id, 'Idli & Vada', 'Steamed soft rice cakes and crispy lentil fritters', 2, TRUE),
        (cat3_3, rest3_id, 'Hot Beverages', 'South Indian decoction filter coffee and teas', 3, TRUE),
        (cat4_1, rest4_id, 'Chaat Specialties', 'Crisp puris with tangy mint-tamarind water and spiced potatoes', 1, TRUE),
        (cat4_2, rest4_id, 'Street Food Meals', 'Wholesome North Indian street meals', 2, TRUE),
        (cat5_1, rest5_id, 'Artisanal Bengali Sweets', 'Fresh chenna delicacies crafted by master sweet makers', 1, TRUE)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        display_order = EXCLUDED.display_order;

    -- 5. Insert/Upsert Menu Items
    INSERT INTO public.menu_items (
        id, restaurant_id, category_id, name, description, price, is_veg, is_available,
        image_url, preparation_time_min, display_order, calories
    ) VALUES
        ('66666666-6666-6666-6666-666666666601', rest1_id, cat1_1, 'Hyderabadi Chicken Dum Biryani', 'Fragrant basmati rice layered with spiced chicken, mint, and saffron.', 280.00, FALSE, TRUE, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80', 25, 1, 650),
        ('66666666-6666-6666-6666-666666666602', rest1_id, cat1_1, 'Hyderabadi Paneer Dum Biryani', 'Fresh cottage cheese cubes cooked in aromatic spices and long grain rice.', 240.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1642821373181-696a54913e9a?w=500&auto=format&fit=crop&q=80', 20, 2, 580),
        ('66666666-6666-6666-6666-666666666603', rest1_id, cat1_1, 'Royal Mutton Dum Biryani', 'Tender cuts of goat meat marinated overnight and cooked on slow charcoal.', 360.00, FALSE, TRUE, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop&q=80', 30, 3, 780),
        ('66666666-6666-6666-6666-666666666604', rest1_id, cat1_2, 'Chicken Tikka Kebab (6 Pcs)', 'Boneless chicken marinated in yogurt and tandoori spices, smoked in tandoor.', 260.00, FALSE, TRUE, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80', 20, 1, 420),
        ('66666666-6666-6666-6666-666666666605', rest1_id, cat1_2, 'Paneer Haryali Tikka', 'Cottage cheese marinated in coriander-mint pesto and roasted to perfection.', 230.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80', 15, 2, 380),
        ('66666666-6666-6666-6666-666666666606', rest1_id, cat1_3, 'Double Ka Meetha', 'Royal Hyderabadi bread pudding soaked in saffron infused condensed milk.', 120.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&auto=format&fit=crop&q=80', 10, 1, 320),
        ('66666666-6666-6666-6666-666666666607', rest1_id, cat1_3, 'Kesar Badam Lassi', 'Chilled churned yogurt drink loaded with saffron and slivered almonds.', 90.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1571006687084-25e771c50821?w=500&auto=format&fit=crop&q=80', 5, 2, 250),
        ('66666666-6666-6666-6666-666666666621', rest2_id, cat2_1, 'Murgh Makhani (Butter Chicken)', 'Tandoori chicken simmered in rich creamy tomato and cashew nut gravy.', 320.00, FALSE, TRUE, 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=80', 25, 1, 590),
        ('66666666-6666-6666-6666-666666666622', rest2_id, cat2_1, 'Dal Makhani Slow Simmered', 'Black lentils slow cooked overnight with butter, cream, and Kashmiri mirch.', 240.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80', 20, 2, 450),
        ('66666666-6666-6666-6666-666666666623', rest2_id, cat2_2, 'Garlic Butter Naan (2 Pcs)', 'Hand stretched tandoor naan topped with minced garlic, coriander, and desi ghee.', 90.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80', 10, 1, 280),
        ('66666666-6666-6666-6666-666666666611', rest3_id, cat3_1, 'Benne Masala Dosa (Ghee Roast)', 'Crisp golden dosa smeared with fresh white butter and potato masala.', 110.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80', 15, 1, 380),
        ('66666666-6666-6666-6666-666666666612', rest3_id, cat3_1, 'Rava Onion Masala Dosa', 'Semolina batter dosa with chopped onions, green chilies, and potato filling.', 125.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=500&auto=format&fit=crop&q=80', 15, 2, 340),
        ('66666666-6666-6666-6666-666666666613', rest3_id, cat3_2, 'Steamed Thatte Idli (2 Pcs)', 'Pillowy soft plate idlis topped with spiced podi and pure ghee.', 70.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80', 10, 1, 220),
        ('66666666-6666-6666-6666-666666666614', rest3_id, cat3_2, 'Medu Vada (2 Pcs)', 'Crispy golden fried lentil donuts served piping hot with coconut chutney.', 65.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80', 10, 2, 280),
        ('66666666-6666-6666-6666-666666666615', rest3_id, cat3_3, 'South Indian Filter Coffee', 'Freshly brewed chicory blend milk coffee served frothy in a dabarah set.', 40.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80', 5, 1, 110),
        ('66666666-6666-6666-6666-666666666631', rest4_id, cat4_1, 'Dahi Puri (6 Pcs)', 'Crispy puris stuffed with boiled potato, sweet yogurt, tamarind chutney, and fine sev.', 90.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80', 10, 1, 290),
        ('66666666-6666-6666-6666-666666666632', rest4_id, cat4_2, 'Amritsari Chole Bhature', 'Two fluffy balloon fried bhaturas served with spicy pindi chole and pickled onions.', 160.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80', 15, 1, 620),
        ('66666666-6666-6666-6666-666666666641', rest5_id, cat5_1, 'Kolkata Spongy Rasgulla (2 Pcs)', 'Melt-in-mouth cottage cheese balls simmered in light sugar cardamom syrup.', 80.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&auto=format&fit=crop&q=80', 5, 1, 210),
        ('66666666-6666-6666-6666-666666666642', rest5_id, cat5_1, 'Mishti Doi Earthen Pot (200g)', 'Caramelized thick sweetened curd fermented slowly in traditional earthen clay pots.', 95.00, TRUE, TRUE, 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=500&auto=format&fit=crop&q=80', 5, 2, 260)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        image_url = EXCLUDED.image_url,
        is_veg = EXCLUDED.is_veg,
        is_available = EXCLUDED.is_available;

    -- 6. Insert/Upsert Promotional Coupons
    INSERT INTO public.coupons (
        code, description, discount_type, discount_value, min_order_amount,
        max_discount_amount, start_date, end_date, is_active
    ) VALUES
        ('WELCOME50', 'Get flat ₹50 OFF on your first food order above ₹199', 'FIXED', 50.00, 199.00, 50.00, NOW(), NOW() + INTERVAL '1 year', TRUE),
        ('QUICKBITE20', 'Get 20% OFF on gourmet orders above ₹399 (up to ₹100)', 'PERCENTAGE', 20.00, 399.00, 100.00, NOW(), NOW() + INTERVAL '1 year', TRUE),
        ('FESTIVE100', 'Flat ₹100 OFF on family orders above ₹599', 'FIXED', 100.00, 599.00, 100.00, NOW(), NOW() + INTERVAL '1 year', TRUE)
    ON CONFLICT (code) DO NOTHING;

    RAISE NOTICE 'Production seed completed successfully!';
END $$;
