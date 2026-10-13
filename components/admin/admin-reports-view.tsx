'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  LockIcon,
  AlertCircleIcon,
  ArrowReloadHorizontalIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getAdminReportsQueueAction,
  resolveReportAction,
  restoreItemAction,
  type ReportQueueItem,
} from '@/lib/actions/admin';
import { reportReasonLabels, type ReportReason } from '@/lib/validation/moderation';
import { cn } from '@/lib/utils';

export function AdminReportsView({ initialReports }: { initialReports?: ReportQueueItem[] }) {
  const [reports, setReports] = React.useState<ReportQueueItem[]>(initialReports || []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string>('open');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Dialog state for resolving report
  const [activeReport, setActiveReport] = React.useState<ReportQueueItem | null>(null);
  const [actionType, setActionType] = React.useState<'hide' | 'clear_profile' | 'dismiss' | 'restore' | null>(null);
  const [actionNote, setActionNote] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchReports = React.useCallback(async (status: string) => {
    setIsLoading(true);
    try {
      const res = await getAdminReportsQueueAction({ status });
      if (res.success && res.data) {
        setReports(res.data);
      } else {
        toast.error(res.error || 'Failed to fetch reports');
      }
    } catch {
      toast.error('An error occurred while loading reports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleActionSubmit = async () => {
    if (!activeReport || !actionType) return;
    setIsSubmitting(true);

    try {
      if (actionType === 'restore') {
        const res = await restoreItemAction({
          targetType: activeReport.target_type as 'creation' | 'prompt' | 'resource' | 'collection',
          targetId: activeReport.target_id,
          note: actionNote.trim() || undefined,
        });

        if (res.success) {
          toast.success('Item restored and unlocked successfully');
          setActiveReport(null);
          setActionType(null);
          setActionNote('');
          void fetchReports(statusFilter);
        } else {
          toast.error(res.error || 'Failed to restore item');
        }
      } else {
        const res = await resolveReportAction({
          reportId: activeReport.id,
          action: actionType,
          note: actionNote.trim() || undefined,
        });

        if (res.success) {
          toast.success(
            actionType === 'dismiss'
              ? 'Report dismissed'
              : actionType === 'clear_profile'
              ? 'Profile content cleared'
              : 'Content hidden and moderation locked'
          );
          setActiveReport(null);
          setActionType(null);
          setActionNote('');
          void fetchReports(statusFilter);
        } else {
          toast.error(res.error || 'Failed to resolve report');
        }
      }
    } catch {
      toast.error('Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTargetUrl = (type: string, id: string, username?: string | null) => {
    switch (type) {
      case 'creation':
        return `/creations/${id}`;
      case 'prompt':
        return `/prompts/${id}`;
      case 'resource':
        return `/resources/${id}`;
      case 'collection':
        return `/collections/${id}`;
      case 'profile':
        return username ? `/u/${username}` : `/u/${id}`;
      default:
        return '#';
    }
  };

  const filteredReports = React.useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(
      (r) =>
        r.target_title?.toLowerCase().includes(q) ||
        r.reporter_username?.toLowerCase().includes(q) ||
        r.target_owner_username?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.details?.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Controls & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'open', label: 'Open Reports' },
            { id: 'actioned', label: 'Actioned' },
            { id: 'dismissed', label: 'Dismissed' },
            { id: 'all', label: 'All Reports' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                void fetchReports(tab.id);
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                statusFilter === tab.id
                  ? 'bg-foreground text-background shadow-2xs'
                  : 'bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <HugeiconsIcon
              icon={Search01Icon}
              className="text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
            />
            <Input
              type="search"
              placeholder="Filter reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchReports(statusFilter)}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs"
            title="Refresh reports"
          >
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              className={cn('size-3.5', isLoading && 'animate-spin')}
            />
          </Button>
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 w-full animate-pulse rounded-xl border border-border/60 bg-card p-5"
            />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No reports found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {statusFilter === 'open'
              ? 'The moderation queue is clear. No pending reports to review.'
              : 'No reports match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredReports.map((report) => {
            const isProfile = report.target_type === 'profile';
            const reasonText =
              reportReasonLabels[report.reason as ReportReason] || report.reason;
            const targetUrl = getTargetUrl(
              report.target_type,
              report.target_id,
              report.target_owner_username
            );

            return (
              <div
                key={report.id}
                className="rounded-xl border border-border/70 bg-card p-5 shadow-2xs transition-colors hover:border-border"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    {/* Badges & Meta */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-foreground uppercase tracking-wider">
                        {report.target_type}
                      </span>

                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-[11px] font-medium',
                          report.status === 'open'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : report.status === 'actioned'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {report.status}
                      </span>

                      {report.target_hidden && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                          <HugeiconsIcon icon={LockIcon} className="size-3" />
                          <span>Locked</span>
                        </span>
                      )}

                      {report.other_reports_count > 0 && (
                        <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-600 dark:text-purple-400">
                          +{report.other_reports_count} other reports
                        </span>
                      )}

                      <span className="text-[11px] text-muted-foreground">
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Target Title & Owner */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        <Link
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline hover:text-brand transition-colors"
                        >
                          {report.target_title || `[Untitled ${report.target_type}]`}
                        </Link>
                      </h4>
                      {report.target_owner_username && (
                        <p className="text-xs text-muted-foreground">
                          Created by{' '}
                          <Link
                            href={`/u/${report.target_owner_username}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            @{report.target_owner_username}
                          </Link>
                        </p>
                      )}
                    </div>

                    {/* Report Reason & Details */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <HugeiconsIcon
                          icon={AlertCircleIcon}
                          className="size-3.5 text-amber-500"
                        />
                        <span>Reason: {reasonText}</span>
                      </div>
                      {report.details && (
                        <p className="rounded-md bg-surface-2 p-2.5 text-xs text-muted-foreground italic border border-border/40">
                          &ldquo;{report.details}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Reporter info */}
                    <div className="text-[11px] text-muted-foreground">
                      Reported by:{' '}
                      {report.reporter_username ? (
                        <Link
                          href={`/u/${report.reporter_username}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          @{report.reporter_username}
                        </Link>
                      ) : (
                        <span className="italic">Anonymous / Deleted user</span>
                      )}
                    </div>

                    {/* Resolution note if already resolved */}
                    {report.resolution_note && (
                      <div className="rounded-md bg-surface-2/60 p-2 text-xs text-foreground/80 border border-border/30">
                        <span className="font-medium text-foreground">Resolution note: </span>
                        {report.resolution_note}
                      </div>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    {report.status === 'open' && (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setActiveReport(report);
                            setActionType(isProfile ? 'clear_profile' : 'hide');
                          }}
                          className="h-8 text-xs font-medium"
                        >
                          <HugeiconsIcon icon={LockIcon} className="size-3.5 mr-1" />
                          {isProfile ? 'Clear profile' : 'Hide content'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveReport(report);
                            setActionType('dismiss');
                          }}
                          className="h-8 text-xs font-medium"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5 mr-1" />
                          Dismiss
                        </Button>
                      </>
                    )}

                    {report.target_hidden && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setActiveReport(report);
                          setActionType('restore');
                        }}
                        className="h-8 text-xs font-medium"
                      >
                        <HugeiconsIcon icon={ArrowReloadHorizontalIcon} className="size-3.5 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={Boolean(activeReport && actionType)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveReport(null);
            setActionType(null);
            setActionNote('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'hide'
                ? 'Hide Content & Apply Lock'
                : actionType === 'clear_profile'
                ? 'Clear Profile Details'
                : actionType === 'restore'
                ? 'Restore Content'
                : 'Dismiss Report'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'hide'
                ? 'This will soft-delete the item, archive it, and apply a moderation lock so the creator cannot republish it.'
                : actionType === 'clear_profile'
                ? 'This will reset the user’s bio, headline, website, avatar, and social links to default values.'
                : actionType === 'restore'
                ? 'This will unlock the item and restore it to archived state so the creator can edit and republish.'
                : 'This will mark the report as dismissed without taking action against the target.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-xs text-muted-foreground">
              Target: <span className="font-medium text-foreground">{activeReport?.target_title || activeReport?.target_id}</span>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="action-note" className="text-xs font-medium text-foreground">
                Moderator Note (Optional)
              </label>
              <Textarea
                id="action-note"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Reason or notes for the audit log..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveReport(null);
                setActionType(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'dismiss' || actionType === 'restore' ? 'default' : 'destructive'}
              size="sm"
              onClick={() => void handleActionSubmit()}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Processing...'
                : actionType === 'hide'
                ? 'Hide Content'
                : actionType === 'clear_profile'
                ? 'Clear Profile'
                : actionType === 'restore'
                ? 'Restore Content'
                : 'Dismiss'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
