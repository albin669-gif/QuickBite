import { getAdminCoupons } from '@/actions/admin';
import { AdminCouponsView } from '@/components/admin/admin-coupons-view';

export default async function AdminCouponsPage() {
  const coupons = await getAdminCoupons();

  return (
    <div className="p-6 sm:p-8">
      <AdminCouponsView initialCoupons={coupons} />
    </div>
  );
}
