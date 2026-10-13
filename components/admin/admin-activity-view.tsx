'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowReloadHorizontalIcon,
  CheckmarkCircle02Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getAdminActivityLogAction,
  type ActivityLogItem,
} from '@/lib/actions/admin';
import { cn } from '@/lib/utils';

export function AdminActivityView({ initialLogs }: { initialLogs?: ActivityLogItem[] }) {
  const [logs, setLogs] = React.useState<ActivityLogItem[]>(initialLogs || []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAdminActivityLogAction();
      if (res.success && res.data) {
        setLogs(res.data);
      } else {
        toast.error(res.error || 'Failed to fetch activity log');
      }
    } catch {
      toast.error('An error occurred while loading activity log');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredLogs = React.useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        l.action?.toLowerCase().includes(q) ||
        l.admin_username?.toLowerCase().includes(q) ||
        l.target_type?.toLowerCase().includes(q) ||
        l.target_id?.toLowerCase().includes(q) ||
        l.note?.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Moderation Activity Audit Trail ({logs.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Immutable log of all administrative actions, decisions, and tool alterations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <HugeiconsIcon
              icon={Search01Icon}
              className="text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
            />
            <Input
              type="search"
              placeholder="Filter activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchLogs()}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs"
            title="Refresh activity"
          >
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              className={cn('size-3.5', isLoading && 'animate-spin')}
            />
          </Button>
        </div>
      </div>

      {/* Activity Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 w-full animate-pulse rounded-xl border border-border/60 bg-card p-4"
            />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No activity recorded</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            No moderation actions match the current filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/60 bg-surface-2/40 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Moderator</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Details / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-foreground">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-surface-2/20">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-[11px]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    @{log.admin_username || 'system'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[11px] font-medium',
                        log.action === 'hide'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                          : log.action === 'restore'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : log.action === 'dismiss'
                          ? 'bg-muted text-muted-foreground'
                          : log.action === 'verify_tool'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-surface-2 text-foreground'
                      )}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-muted-foreground mr-1.5 uppercase text-[10px]">
                      {log.target_type}:
                    </span>
                    <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px]">
                      {log.target_id.slice(0, 12)}
                      {log.target_id.length > 12 ? '…' : ''}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                    {log.note || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
