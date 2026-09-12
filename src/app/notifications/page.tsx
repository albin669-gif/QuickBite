import { getCurrentUserProfile } from '@/actions/auth';
import { getUserNotifications } from '@/actions/notification';
import { redirect } from 'next/navigation';
import { NotificationList } from '@/components/notifications/notification-list';
import { Bell } from 'lucide-react';

export default async function NotificationsPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/login?redirect=/notifications');
  }

  const notifications = await getUserNotifications();

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-orange-600" />
            Notifications
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Real-time updates regarding your food orders, delivery milestones, and promotions.
          </p>
        </div>

        <NotificationList initialNotifications={notifications} />
      </div>
    </div>
  );
}
