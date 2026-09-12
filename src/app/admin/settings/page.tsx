import { getPlatformSettings } from '@/actions/admin';
import { AdminSettingsView } from '@/components/admin/admin-settings-view';

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings();

  return (
    <div className="p-6 sm:p-8">
      <AdminSettingsView initialSettings={settings} />
    </div>
  );
}
