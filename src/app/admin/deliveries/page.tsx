import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAllDeliveriesAdminAction } from '@/actions/delivery';
import { AdminDeliveriesView } from '@/components/admin/admin-deliveries-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delivery Fleet | QuickBite Admin',
  description: 'Live delivery assignments, driver status, and real GPS locations.',
};

export const dynamic = 'force-dynamic';

export default async function AdminDeliveriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const assignments = await getAllDeliveriesAdminAction();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <AdminDeliveriesView initialAssignments={assignments} />
    </div>
  );
}
