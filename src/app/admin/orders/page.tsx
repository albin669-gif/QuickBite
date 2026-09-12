import { getAdminOrders } from '@/actions/admin';
import { AdminOrdersView } from '@/components/admin/admin-orders-view';

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders({});

  return (
    <div className="p-6 sm:p-8">
      <AdminOrdersView initialOrders={orders} />
    </div>
  );
}
