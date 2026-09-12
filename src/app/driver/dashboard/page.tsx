import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  getActiveDriverDeliveryAction,
  getAvailableDeliveriesAction,
} from '@/actions/delivery';
import { DriverDashboardView } from '@/components/delivery/driver-dashboard-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Driver Dashboard | QuickBite Delivery Partner',
  description: 'Manage deliveries, view live tasks, and broadcast GPS location.',
};

export const dynamic = 'force-dynamic';

export default async function DriverDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/driver/login');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'DELIVERY_PARTNER' && profile.role !== 'ADMIN')) {
    redirect('/unauthorized');
  }

  const [activeDelivery, availableOrders] = await Promise.all([
    getActiveDriverDeliveryAction(),
    getAvailableDeliveriesAction(),
  ]);

  return (
    <div className="min-h-screen bg-stone-50/50 pb-16">
      <DriverDashboardView
        initialActiveDelivery={activeDelivery}
        initialAvailableOrders={availableOrders}
        driverName={profile.full_name}
      />
    </div>
  );
}
