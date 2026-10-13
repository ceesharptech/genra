'use client';

import * as React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Flag01Icon,
  Wrench01Icon,
  Activity01Icon,
  BadgeCheckIcon,
} from '@hugeicons/core-free-icons';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AdminReportsView } from './admin-reports-view';
import { AdminToolsView } from './admin-tools-view';
import { AdminActivityView } from './admin-activity-view';
import type {
  ReportQueueItem,
  UnverifiedToolItem,
  ActivityLogItem,
} from '@/lib/actions/admin';

interface AdminDashboardProps {
  initialReports: ReportQueueItem[];
  initialTools: UnverifiedToolItem[];
  initialLogs: ActivityLogItem[];
}

export function AdminDashboard({
  initialReports,
  initialTools,
  initialLogs,
}: AdminDashboardProps) {
  const openReportsCount = initialReports.filter((r) => r.status === 'open').length;
  const unverifiedToolsCount = initialTools.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
              <HugeiconsIcon icon={BadgeCheckIcon} className="size-3.5" />
              <span>Admin Console</span>
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              V1 Operations
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Platform Moderation &amp; Quality
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Review reported creations, prompts, resources, and profiles. Verify community-added tools and inspect the moderation audit trail.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-border/70 bg-card px-4 py-2.5 text-center shadow-2xs">
            <div className="text-lg font-bold text-foreground tabular-nums">
              {openReportsCount}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              Open Reports
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-card px-4 py-2.5 text-center shadow-2xs">
            <div className="text-lg font-bold text-foreground tabular-nums">
              {unverifiedToolsCount}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              Unverified Tools
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="h-10 p-1">
          <TabsTrigger value="reports" className="gap-2 text-xs">
            <HugeiconsIcon icon={Flag01Icon} className="size-3.5" />
            <span>Reports</span>
            {openReportsCount > 0 && (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                {openReportsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2 text-xs">
            <HugeiconsIcon icon={Wrench01Icon} className="size-3.5" />
            <span>Tools Review</span>
            {unverifiedToolsCount > 0 && (
              <span className="rounded-full bg-brand/15 px-1.5 py-0.2 text-[10px] font-semibold text-brand tabular-nums">
                {unverifiedToolsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2 text-xs">
            <HugeiconsIcon icon={Activity01Icon} className="size-3.5" />
            <span>Activity Log</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="outline-none">
          <AdminReportsView initialReports={initialReports} />
        </TabsContent>

        <TabsContent value="tools" className="outline-none">
          <AdminToolsView initialTools={initialTools} />
        </TabsContent>

        <TabsContent value="activity" className="outline-none">
          <AdminActivityView initialLogs={initialLogs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
