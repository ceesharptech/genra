import {
  getAdminReportsQueueAction,
  getAdminUnverifiedToolsAction,
  getAdminActivityLogAction,
} from '@/lib/actions/admin';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [reportsRes, toolsRes, logsRes] = await Promise.all([
    getAdminReportsQueueAction({ status: 'open' }),
    getAdminUnverifiedToolsAction(),
    getAdminActivityLogAction(),
  ]);

  const initialReports = reportsRes.data || [];
  const initialTools = toolsRes.data || [];
  const initialLogs = logsRes.data || [];

  return (
    <AdminDashboard
      initialReports={initialReports}
      initialTools={initialTools}
      initialLogs={initialLogs}
    />
  );
}
