import { getCurrentUserProfile } from '@/actions/auth';
import { getOrderById } from '@/actions/order';
import { notFound, redirect } from 'next/navigation';
import { OrderTrackingView } from '@/components/orders/order-tracking-view';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrderPage({ params }: Props) {
  const { id } = await params;
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect(`/login?redirect=/orders/${id}`);
  }

  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  const isOwnerOrAdmin =
    profile.role === 'ADMIN' ||
    (profile.role === 'RESTAURANT_OWNER' && order.restaurant?.owner_id === profile.id);

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to My Orders
          </Link>
        </div>

        <OrderTrackingView order={order} isOwnerOrAdmin={isOwnerOrAdmin} />
      </div>
    </div>
  );
}
