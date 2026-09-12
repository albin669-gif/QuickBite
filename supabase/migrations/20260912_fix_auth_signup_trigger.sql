-- ==============================================================================
-- QuickBite - Fix Supabase Auth Signup Trigger
-- File: supabase/migrations/20260912_fix_auth_signup_trigger.sql
-- Fixes: Database error creating/saving new user on auth.signUp()
-- ==============================================================================

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

-- Ensure trigger is cleanly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
