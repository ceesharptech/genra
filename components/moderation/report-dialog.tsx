'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Flag01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  Loading03Icon,
} from '@hugeicons/core-free-icons';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  reportReasonLabels,
  type ReportReason,
  type ReportTargetType,
} from '@/lib/validation/moderation';
import { submitReportAction } from '@/lib/actions/moderation';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';

export interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  isSignedIn?: boolean;
}

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetTitle,
  isSignedIn = false,
}: ReportDialogProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [selectedReason, setSelectedReason] = React.useState<ReportReason>('spam');
  const [details, setDetails] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSelectedReason('spam');
        setDetails('');
        setErrorMsg(null);
        setIsDuplicate(false);
        setIsSuccess(false);
      }, 200);
    }
  }, [open]);

  const handleSignIn = () => {
    onOpenChange(false);
    const targetUrl = pathname || '/';
    router.push(`/login?next=${encodeURIComponent(targetUrl)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      handleSignIn();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setIsDuplicate(false);

    try {
      const result = await submitReportAction({
        targetType,
        targetId,
        reason: selectedReason,
        details: details.trim() || undefined,
      });

      if (result.success) {
        setIsSuccess(true);
        track('report_submitted', {
          targetType,
          reason: selectedReason,
        });
      } else {
        if (result.duplicate) {
          setIsDuplicate(true);
        }
        setErrorMsg(result.error || 'Failed to submit report.');
      }
    } catch {
      setErrorMsg('A network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <HugeiconsIcon icon={Flag01Icon} className="h-4 w-4" strokeWidth={2} />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">
                Report {targetType}
              </DialogTitle>
              {targetTitle && (
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  &ldquo;{targetTitle}&rdquo;
                </p>
              )}
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Help keep the Genra community constructive, safe, and original.
          </DialogDescription>
        </DialogHeader>

        {!isSignedIn ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
              You must be signed in to submit a report. Verified creator reports are prioritized for rapid review.
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSignIn}
                className="bg-primary text-primary-foreground"
              >
                Sign in to report
              </Button>
            </DialogFooter>
          </div>
        ) : isSuccess ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-6 w-6" strokeWidth={2} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-foreground">Report submitted</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Thank you. Our moderation team reviews reports according to our Content Policy.
              </p>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-1">
            {errorMsg && (
              <div
                className={cn(
                  'flex items-start gap-2 rounded-lg p-2.5 text-xs',
                  isDuplicate
                    ? 'border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'border border-destructive/20 bg-destructive/10 text-destructive'
                )}
              >
                <HugeiconsIcon
                  icon={Alert02Icon}
                  className="h-4 w-4 shrink-0 mt-0.5"
                  strokeWidth={2}
                />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium">Select a reason</Label>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {(Object.keys(reportReasonLabels) as ReportReason[]).map((reasonKey) => {
                  const isSelected = selectedReason === reasonKey;
                  return (
                    <label
                      key={reasonKey}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs transition-colors cursor-pointer',
                        isSelected
                          ? 'border-primary bg-primary/5 text-foreground font-medium'
                          : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                      )}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={reasonKey}
                        checked={isSelected}
                        onChange={() => setSelectedReason(reasonKey)}
                        className="h-3.5 w-3.5 accent-primary"
                      />
                      <span>{reportReasonLabels[reasonKey]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="report-details" className="text-xs font-medium">
                  Additional context (optional)
                </Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {details.length} / 1,000
                </span>
              </div>
              <Textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                placeholder="Specific details, timestamp or reference link that clarifies the violation..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <p className="text-[11px] text-muted-foreground leading-normal border-t border-border/40 pt-2">
              Reports are reviewed manually by moderators. Repeated false reports may result in account restrictions.
            </p>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground"
              >
                {isSubmitting ? (
                  <>
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      className="mr-1.5 h-3.5 w-3.5 animate-spin"
                      strokeWidth={2}
                    />
                    Submitting...
                  </>
                ) : (
                  'Submit report'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
