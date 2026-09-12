import { getCurrentUserProfile } from '@/actions/auth';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/admin/login?redirect=/admin/dashboard');
  }

  if (profile.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-stone-950/50">
        {children}
      </div>
    </div>
  );
}
