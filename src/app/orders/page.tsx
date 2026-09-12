import { getCurrentUserProfile } from '@/actions/auth';
import { getCustomerOrders } from '@/actions/order';
import { redirect } from 'next/navigation';
import { CustomerOrdersList } from '@/components/orders/customer-orders-list';
import { ShoppingBag } from 'lucide-react';

export default async function CustomerOrdersPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/login?redirect=/orders');
  }

  const orders = await getCustomerOrders();

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
              <ShoppingBag className="w-6 h-6 text-orange-600" />
              My Orders
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              View your ongoing deliveries and past order history.
            </p>
          </div>
        </div>

        <CustomerOrdersList orders={orders} />
      </div>
    </div>
  );
}
