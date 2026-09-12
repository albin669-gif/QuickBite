import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database, UserRole, Profile } from '@/types/database.types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Static assets and API routes (except auth protected) bypass middleware checks
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/favicon.ico') ||
    path.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return supabaseResponse;
  }

  // Auth pages logic: redirect already logged-in users to their dashboards
  const isAuthPage =
    path === '/login' ||
    path === '/signup' ||
    path === '/restaurant/login' ||
    path === '/admin/login' ||
    path === '/forgot-password';

  // Protected Admin Routes (/admin/*)
  const isAdminRoute = path.startsWith('/admin') && path !== '/admin/login';

  // Protected Delivery Partner Routes (/driver/*)
  const isDriverAuthPage = path === '/driver/login' || path === '/driver/signup';
  const isDriverRoute = path.startsWith('/driver') && !isDriverAuthPage;

  // Protected Restaurant Owner Management Routes
  const isRestaurantOwnerRoute =
    path.startsWith('/restaurant/dashboard') ||
    path.startsWith('/restaurant/menu') ||
    path.startsWith('/restaurant/categories') ||
    path.startsWith('/restaurant/profile') ||
    path.startsWith('/restaurant/orders') ||
    path.startsWith('/restaurant/settings');

  // Fetch user role ONLY when the route requires role verification
  let userRole: UserRole | null = null;
  if (user && (isAuthPage || isAdminRoute || isDriverRoute || isRestaurantOwnerRoute)) {
    const metaRole = user.user_metadata?.role as UserRole | undefined;
    if (metaRole && ['ADMIN', 'RESTAURANT_OWNER', 'DELIVERY_PARTNER', 'CUSTOMER'].includes(metaRole)) {
      userRole = metaRole;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileData } = await (supabase.from('profiles') as any)
        .select('role')
        .eq('id', user.id)
        .single();
      userRole = (profileData?.role as UserRole) || 'CUSTOMER';
    }
  }

  if (user && isAuthPage) {
    if (userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    if (userRole === 'RESTAURANT_OWNER') {
      return NextResponse.redirect(new URL('/restaurant/dashboard', request.url));
    }
    if (userRole === 'DELIVERY_PARTNER') {
      return NextResponse.redirect(new URL('/driver/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protected Admin Routes (/admin/*)
  if (isAdminRoute) {
    if (!user) {
      const redirectUrl = new URL('/admin/login', request.url);
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Protected Delivery Partner Routes (/driver/*)
  if (isDriverRoute) {
    if (!user) {
      const redirectUrl = new URL('/driver/login', request.url);
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }
    if (userRole !== 'DELIVERY_PARTNER' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Protected Restaurant Owner Management Routes
  if (isRestaurantOwnerRoute) {
    if (!user) {
      const redirectUrl = new URL('/restaurant/login', request.url);
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }
    if (userRole !== 'RESTAURANT_OWNER' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Protected Customer User Routes
  const isProtectedCustomerRoute =
    path.startsWith('/profile') ||
    path.startsWith('/addresses') ||
    path.startsWith('/checkout') ||
    path.startsWith('/orders');

  if (isProtectedCustomerRoute && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
