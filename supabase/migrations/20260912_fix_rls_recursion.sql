-- ==============================================================================
-- QuickBite - Fix RLS Infinite Recursion (orders <-> delivery_assignments)
-- File: supabase/migrations/20260912_fix_rls_recursion.sql
-- ==============================================================================

-- 1. Helper function: Check if current user is the assigned driver for an order
-- SECURITY DEFINER with SET search_path = public bypasses RLS on delivery_assignments
-- preventing circular policy evaluation when called from orders RLS.
CREATE OR REPLACE FUNCTION public.is_assigned_driver(target_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.delivery_assignments da
        WHERE da.order_id = target_order_id AND da.driver_id = auth.uid()
    );
$$;

-- 2. Helper function: Check if current user has access to an order (customer, owner, admin)
-- SECURITY DEFINER with SET search_path = public bypasses RLS on orders
-- preventing circular policy evaluation when called from delivery_assignments RLS.
CREATE OR REPLACE FUNCTION public.can_access_delivery_assignment(target_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = target_order_id 
          AND (o.customer_id = auth.uid() OR public.is_restaurant_owner(o.restaurant_id) OR public.is_admin())
    );
$$;

-- 3. Replace public.orders SELECT and UPDATE policies with non-recursive versions
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
                OR public.is_assigned_driver(id)
            )
        )
    );

    DROP POLICY IF EXISTS "Authorized parties can update orders" ON public.orders;
    CREATE POLICY "Authorized parties can update orders"
    ON public.orders FOR UPDATE
    USING (
        auth.uid() = customer_id
        OR public.is_restaurant_owner(restaurant_id)
        OR public.is_admin()
        OR (public.is_delivery_partner() AND public.is_assigned_driver(id))
    );
END $$;

-- 4. Replace public.delivery_assignments SELECT policy with non-recursive version
DO $$ BEGIN
    DROP POLICY IF EXISTS "Order parties, drivers and admins can view delivery assignment" ON public.delivery_assignments;
    CREATE POLICY "Order parties, drivers and admins can view delivery assignment"
    ON public.delivery_assignments FOR SELECT
    USING (
        driver_id = auth.uid()
        OR public.is_admin()
        OR public.can_access_delivery_assignment(order_id)
    );
END $$;

-- 5. Replace public.order_items SELECT policy using is_assigned_driver to prevent nested cycles
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
                        OR public.is_assigned_driver(o.id)
                    )
                )
            )
        )
    );
END $$;
