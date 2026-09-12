import { redirect } from 'next/navigation';
import { verifyAdmin, getAdminPaymentsAction } from '@/actions/admin';
import { AdminPaymentsView } from '@/components/admin/admin-payments-view';

export const metadata = {
  title: 'Payment Audits - Admin Console | QuickBite',
};

export default async function AdminPaymentsPage() {
  const admin = await verifyAdmin();
  if (!admin) {
    redirect('/auth/login?role=admin');
  }

  const res = await getAdminPaymentsAction();
  const initialPayments = res.success && res.data ? res.data : [];

  return <AdminPaymentsView initialPayments={initialPayments} />;
}
