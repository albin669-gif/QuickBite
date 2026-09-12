-- ==============================================================================
-- QuickBite - Production Database Schema with RLS and Role-Based Authorization
-- PostgreSQL / Supabase
-- Clean Bootstrap Migration (Phases A through H)
-- ==============================================================================

-- ==============================================================================
-- PHASE A: EXTENSIONS & ENUMS ONLY
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('CUSTOMER', 'RESTAURANT_OWNER', 'ADMIN', 'DELIVERY_PARTNER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'PENDING_PAYMENT',
        'PAID',
        'RESTAURANT_ACCEPTED',
        'PREPARING',
        'READY_FOR_PICKUP',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
        'REFUNDED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- ==============================================================================
-- PHASE B: ALL 18 TABLES ONLY (STRICT DEPENDENCY ORDER)
-- Zero policies, zero triggers, zero indexes, zero functions
-- ==============================================================================

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. restaurants
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Bangalore',
    state TEXT NOT NULL DEFAULT 'Karnataka',
    postal_code TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    banner_url TEXT,
    cuisine_types TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_accepting_orders BOOLEAN NOT NULL DEFAULT TRUE,
    rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    total_reviews INTEGER NOT NULL DEFAULT 0,
    delivery_time_min INTEGER NOT NULL DEFAULT 25,
    delivery_time_max INTEGER NOT NULL DEFAULT 40,
    minimum_order NUMERIC(10,2) NOT NULL DEFAULT 100.00,
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 35.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. restaurant_staff
CREATE TABLE IF NOT EXISTS public.restaurant_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'STAFF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(restaurant_id, user_id)
);

-- 4. restaurant_hours
CREATE TABLE IF NOT EXISTS public.restaurant_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(restaurant_id, day_of_week)
);

-- 5. menu_categories
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. menu_items
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_veg BOOLEAN NOT NULL DEFAULT TRUE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    calories INTEGER,
    preparation_time_min INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. addresses
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'HOME',
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    landmark TEXT,
    city TEXT NOT NULL DEFAULT 'Bangalore',
    state TEXT NOT NULL DEFAULT 'Karnataka',
    postal_code TEXT NOT NULL,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. carts
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. cart_items
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    customization_notes TEXT,
    unit_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cart_id, menu_item_id)
);

-- 10. coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type discount_type NOT NULL DEFAULT 'PERCENTAGE',
    discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_discount_amount NUMERIC(10,2),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    usage_limit INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
    status order_status NOT NULL DEFAULT 'PENDING_PAYMENT',
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    tax NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    delivery_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    delivery_address JSONB NOT NULL,
    notes TEXT,
    estimated_delivery_time TIMESTAMPTZ,
    actual_delivery_time TIMESTAMPTZ,
    payment_method TEXT NOT NULL DEFAULT 'ONLINE',
    payment_status payment_status NOT NULL DEFAULT 'PENDING',
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. order_items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    payment_method TEXT NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'PENDING',
    transaction_id TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. coupon_usage
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    discount_amount NUMERIC(10,2) NOT NULL CHECK (discount_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(coupon_id, order_id)
);

-- 15. reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. platform_settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. delivery_assignments
CREATE TABLE IF NOT EXISTS public.delivery_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('ASSIGNED', 'ACCEPTED', 'ARRIVED_AT_STORE', 'PICKED_UP', 'DELIVERED', 'CANCELLED')) DEFAULT 'ASSIGNED',
    current_latitude NUMERIC(10,8),
    current_longitude NUMERIC(11,8),
    location_updated_at TIMESTAMPTZ,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==============================================================================
-- PHASE C: HELPER FUNCTIONS
-- Created after all 18 tables exist so relation names can be resolved cleanly
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'ADMIN'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_delivery_partner()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'DELIVERY_PARTNER'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_restaurant_owner(target_restaurant_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.restaurants 
        WHERE id = target_restaurant_id AND owner_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.restaurant_staff 
        WHERE restaurant_id = target_restaurant_id AND user_id = auth.uid()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_role public.user_role := 'CUSTOMER'::public.user_role;
    v_raw_role TEXT;
BEGIN
    v_raw_role := NEW.raw_user_meta_data->>'role';
    IF v_raw_role IN ('CUSTOMER', 'RESTAURANT_OWNER', 'ADMIN', 'DELIVERY_PARTNER') THEN
        v_role := v_raw_role::public.user_role;
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Customer'),
        v_role
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$;



-- ==============================================================================
-- PHASE D: ROW LEVEL SECURITY & POLICIES
-- Enable RLS on all 18 tables and apply security policies
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
    CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());
END $$;

-- 2. Restaurants Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Active restaurants are viewable by everyone" ON public.restaurants;
    CREATE POLICY "Active restaurants are viewable by everyone"
    ON public.restaurants FOR SELECT
    USING (is_active = true OR owner_id = auth.uid() OR public.is_admin() OR public.is_restaurant_owner(id));

    DROP POLICY IF EXISTS "Restaurant owners and admins can insert restaurants" ON public.restaurants;
    CREATE POLICY "Restaurant owners and admins can insert restaurants"
    ON public.restaurants FOR INSERT
    WITH CHECK (
        public.is_admin() OR 
        (public.get_auth_role() = 'RESTAURANT_OWNER' AND owner_id = auth.uid())
    );

    DROP POLICY IF EXISTS "Restaurant owners and admins can update restaurants" ON public.restaurants;
    CREATE POLICY "Restaurant owners and admins can update restaurants"
    ON public.restaurants FOR UPDATE
    USING (owner_id = auth.uid() OR public.is_admin())
    WITH CHECK (owner_id = auth.uid() OR public.is_admin());

    DROP POLICY IF EXISTS "Admins can delete restaurants" ON public.restaurants;
    CREATE POLICY "Admins can delete restaurants"
    ON public.restaurants FOR DELETE
    USING (public.is_admin());
END $$;

-- 3. Restaurant Staff Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Staff members can view their assignments" ON public.restaurant_staff;
    CREATE POLICY "Staff members can view their assignments"
    ON public.restaurant_staff FOR SELECT
    USING (user_id = auth.uid() OR public.is_restaurant_owner(restaurant_id) OR public.is_admin());

    DROP POLICY IF EXISTS "Restaurant owners and admins can manage staff" ON public.restaurant_staff;
    CREATE POLICY "Restaurant owners and admins can manage staff"
    ON public.restaurant_staff FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
        OR public.is_admin()
    );
END $$;

-- 4. Restaurant Hours Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Restaurant hours are viewable by everyone" ON public.restaurant_hours;
    CREATE POLICY "Restaurant hours are viewable by everyone"
    ON public.restaurant_hours FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Restaurant owners and admins can manage hours" ON public.restaurant_hours;
    CREATE POLICY "Restaurant owners and admins can manage hours"
    ON public.restaurant_hours FOR ALL
    USING (public.is_restaurant_owner(restaurant_id) OR public.is_admin())
    WITH CHECK (public.is_restaurant_owner(restaurant_id) OR public.is_admin());
END $$;

-- 5. Menu Categories Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Menu categories are viewable by everyone" ON public.menu_categories;
    CREATE POLICY "Menu categories are viewable by everyone"
    ON public.menu_categories FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Restaurant owners and admins can manage categories" ON public.menu_categories;
    CREATE POLICY "Restaurant owners and admins can manage categories"
    ON public.menu_categories FOR ALL
    USING (public.is_restaurant_owner(restaurant_id) OR public.is_admin())
    WITH CHECK (public.is_restaurant_owner(restaurant_id) OR public.is_admin());
END $$;

-- 6. Menu Items Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Menu items are viewable by everyone" ON public.menu_items;
    CREATE POLICY "Menu items are viewable by everyone"
    ON public.menu_items FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Restaurant owners and admins can manage items" ON public.menu_items;
    CREATE POLICY "Restaurant owners and admins can manage items"
    ON public.menu_items FOR ALL
    USING (public.is_restaurant_owner(restaurant_id) OR public.is_admin())
    WITH CHECK (public.is_restaurant_owner(restaurant_id) OR public.is_admin());
END $$;

-- 7. Addresses Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
    CREATE POLICY "Users can view their own addresses"
    ON public.addresses FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

    DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
    CREATE POLICY "Users can insert their own addresses"
    ON public.addresses FOR INSERT
    WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
    CREATE POLICY "Users can update their own addresses"
    ON public.addresses FOR UPDATE
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

    DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;
    CREATE POLICY "Users can delete their own addresses"
    ON public.addresses FOR DELETE
    USING (user_id = auth.uid() OR public.is_admin());
END $$;

-- 8. Carts Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their own cart" ON public.carts;
    CREATE POLICY "Users can view their own cart"
    ON public.carts FOR SELECT
    USING (user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can insert their own cart" ON public.carts;
    CREATE POLICY "Users can insert their own cart"
    ON public.carts FOR INSERT
    WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can update their own cart" ON public.carts;
    CREATE POLICY "Users can update their own cart"
    ON public.carts FOR UPDATE
    USING (user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can delete their own cart" ON public.carts;
    CREATE POLICY "Users can delete their own cart"
    ON public.carts FOR DELETE
    USING (user_id = auth.uid());
END $$;

-- 9. Cart Items Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
    CREATE POLICY "Users can view their own cart items"
    ON public.cart_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()));

    DROP POLICY IF EXISTS "Users can insert items into their own cart" ON public.cart_items;
    CREATE POLICY "Users can insert items into their own cart"
    ON public.cart_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()));

    DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
    CREATE POLICY "Users can update their own cart items"
    ON public.cart_items FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()));

    DROP POLICY IF EXISTS "Users can delete items from their own cart" ON public.cart_items;
    CREATE POLICY "Users can delete items from their own cart"
    ON public.cart_items FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()));
END $$;

-- 10. Coupons Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Active coupons are viewable by authenticated users" ON public.coupons;
    CREATE POLICY "Active coupons are viewable by authenticated users"
    ON public.coupons FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

    DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
    CREATE POLICY "Admins can manage coupons"
    ON public.coupons FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
END $$;

-- 11. Orders Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Customers, Restaurant Owners, Drivers and Admins can view orders" ON public.orders;
    CREATE POLICY "Customers, Restaurant Owners, Drivers and Admins can view orders"
    ON public.orders FOR SELECT
    USING (
        auth.uid() = customer_id
        OR public.is_restaurant_owner(restaurant_id)
        OR public.is_admin()
        OR (
            public.is_delivery_partner() AND (
                status IN ('READY_FOR_PICKUP', 'OUT_FOR_DELIVERY')
                OR EXISTS (
                    SELECT 1 FROM public.delivery_assignments da
                    WHERE da.order_id = id AND da.driver_id = auth.uid()
                )
            )
        )
    );

    DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;
    CREATE POLICY "Customers can create orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

    DROP POLICY IF EXISTS "Authorized parties can update orders" ON public.orders;
    CREATE POLICY "Authorized parties can update orders"
    ON public.orders FOR UPDATE
    USING (
        auth.uid() = customer_id
        OR public.is_restaurant_owner(restaurant_id)
        OR public.is_admin()
        OR (public.is_delivery_partner() AND EXISTS (
            SELECT 1 FROM public.delivery_assignments da
            WHERE da.order_id = id AND da.driver_id = auth.uid()
        ))
    );
END $$;

-- 12. Order Items Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authorized users can view order items" ON public.order_items;
    CREATE POLICY "Authorized users can view order items"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id
            AND (
                o.customer_id = auth.uid()
                OR public.is_restaurant_owner(o.restaurant_id)
                OR public.is_admin()
                OR (
                    public.is_delivery_partner() AND (
                        o.status IN ('READY_FOR_PICKUP', 'OUT_FOR_DELIVERY')
                        OR EXISTS (
                            SELECT 1 FROM public.delivery_assignments da
                            WHERE da.order_id = o.id AND da.driver_id = auth.uid()
                        )
                    )
                )
            )
        )
    );

    DROP POLICY IF EXISTS "Customers can insert order items" ON public.order_items;
    CREATE POLICY "Customers can insert order items"
    ON public.order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND o.customer_id = auth.uid()
        )
    );
END $$;

-- 13. Payments Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view payments for their own orders" ON public.payments;
    CREATE POLICY "Users can view payments for their own orders"
    ON public.payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.is_restaurant_owner(o.restaurant_id) OR public.is_admin())
        )
    );

    DROP POLICY IF EXISTS "Service role and customers can create payments" ON public.payments;
    CREATE POLICY "Service role and customers can create payments"
    ON public.payments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND o.customer_id = auth.uid()
        ) OR public.is_admin()
    );

    DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
    CREATE POLICY "Admins can update payments"
    ON public.payments FOR UPDATE
    USING (public.is_admin());
END $$;

-- 14. Coupon Usage Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own coupon usage" ON public.coupon_usage;
    CREATE POLICY "Users can view own coupon usage"
    ON public.coupon_usage FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

    DROP POLICY IF EXISTS "Users can insert coupon usage" ON public.coupon_usage;
    CREATE POLICY "Users can insert coupon usage"
    ON public.coupon_usage FOR INSERT
    WITH CHECK (user_id = auth.uid());
END $$;

-- 15. Reviews Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
    CREATE POLICY "Anyone can read reviews"
    ON public.reviews FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Customers can insert their own verified review" ON public.reviews;
    CREATE POLICY "Customers can insert their own verified review"
    ON public.reviews FOR INSERT
    WITH CHECK (
        auth.uid() = customer_id
        AND EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_id
              AND orders.customer_id = auth.uid()
              AND orders.restaurant_id = reviews.restaurant_id
              AND orders.status = 'DELIVERED'
        )
    );

    DROP POLICY IF EXISTS "Customers can update their own review" ON public.reviews;
    CREATE POLICY "Customers can update their own review"
    ON public.reviews FOR UPDATE
    USING (auth.uid() = customer_id)
    WITH CHECK (auth.uid() = customer_id);

    DROP POLICY IF EXISTS "Customers and admins can delete reviews" ON public.reviews;
    CREATE POLICY "Customers and admins can delete reviews"
    ON public.reviews FOR DELETE
    USING (auth.uid() = customer_id OR public.is_admin());
END $$;

-- 16. Notifications Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
    CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
    CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
END $$;

-- 17. Platform Settings Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can read public platform settings" ON public.platform_settings;
    CREATE POLICY "Anyone can read public platform settings"
    ON public.platform_settings FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Only admins can modify platform settings" ON public.platform_settings;
    CREATE POLICY "Only admins can modify platform settings"
    ON public.platform_settings FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
END $$;

-- 18. Delivery Assignments Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Order parties, drivers and admins can view delivery assignment" ON public.delivery_assignments;
    CREATE POLICY "Order parties, drivers and admins can view delivery assignment"
    ON public.delivery_assignments FOR SELECT
    USING (
        driver_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND (
                o.customer_id = auth.uid()
                OR public.is_restaurant_owner(o.restaurant_id)
            )
        )
    );

    DROP POLICY IF EXISTS "Admins and delivery partners can assign or claim deliveries" ON public.delivery_assignments;
    CREATE POLICY "Admins and delivery partners can assign or claim deliveries"
    ON public.delivery_assignments FOR INSERT
    WITH CHECK (
        public.is_admin() 
        OR (public.is_delivery_partner() AND driver_id = auth.uid())
    );

    DROP POLICY IF EXISTS "Assigned driver and admins can update delivery assignments" ON public.delivery_assignments;
    CREATE POLICY "Assigned driver and admins can update delivery assignments"
    ON public.delivery_assignments FOR UPDATE
    USING (
        driver_id = auth.uid()
        OR public.is_admin()
    )
    WITH CHECK (
        driver_id = auth.uid()
        OR public.is_admin()
    );
END $$;


-- ==============================================================================
-- PHASE E: DATABASE TRIGGERS
-- ==============================================================================

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_restaurants_updated_at ON public.restaurants;
CREATE TRIGGER tr_restaurants_updated_at
    BEFORE UPDATE ON public.restaurants
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_menu_categories_updated_at ON public.menu_categories;
CREATE TRIGGER tr_menu_categories_updated_at
    BEFORE UPDATE ON public.menu_categories
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER tr_menu_items_updated_at
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_addresses_updated_at ON public.addresses;
CREATE TRIGGER tr_addresses_updated_at
    BEFORE UPDATE ON public.addresses
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_carts_updated_at ON public.carts;
CREATE TRIGGER tr_carts_updated_at
    BEFORE UPDATE ON public.carts
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER tr_cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_coupons_updated_at ON public.coupons;
CREATE TRIGGER tr_coupons_updated_at
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_orders_updated_at ON public.orders;
CREATE TRIGGER tr_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_payments_updated_at ON public.payments;
CREATE TRIGGER tr_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_reviews_updated_at ON public.reviews;
CREATE TRIGGER tr_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_delivery_assignments_updated_at ON public.delivery_assignments;
CREATE TRIGGER tr_delivery_assignments_updated_at
    BEFORE UPDATE ON public.delivery_assignments
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Auth trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==============================================================================
-- PHASE F: PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON public.restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_active ON public.restaurants(is_active, is_accepting_orders);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON public.reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON public.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_driver ON public.delivery_assignments(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_order ON public.delivery_assignments(order_id);


-- ==============================================================================
-- PHASE G: DEFAULT PLATFORM SETTINGS
-- Idempotent initial configuration (Zero fake user/order data)
-- ==============================================================================

INSERT INTO public.platform_settings (key, value)
VALUES 
    ('delivery_fee_default', '{"amount": 35.00}'::jsonb),
    ('tax_rate_percent', '{"rate": 5.0}'::jsonb),
    ('platform_name', '{"name": "QuickBite"}'::jsonb),
    ('support_contact', '{"email": "support@quickbite.com", "phone": "+91 98765 43210"}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ==============================================================================
-- PHASE H: SUPABASE REALTIME CONFIGURATION
-- ==============================================================================

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'delivery_assignments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_assignments;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;
