import { getAdminCustomers } from '@/actions/admin';
import { AdminCustomersView } from '@/components/admin/admin-customers-view';

export default async function AdminCustomersPage() {
  const customers = await getAdminCustomers();

  return (
    <div className="p-6 sm:p-8">
      <AdminCustomersView initialCustomers={customers} />
    </div>
  );
}
