'use client';

import * as React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Flag01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { ReportDialog } from './report-dialog';
import type { ReportTargetType } from '@/lib/validation/moderation';
import { cn } from '@/lib/utils';

export interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  isSignedIn?: boolean;
  variant?: 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'icon' | 'icon-sm';
  showLabel?: boolean;
  className?: string;
}

export function ReportButton({
  targetType,
  targetId,
  targetTitle,
  isSignedIn = false,
  variant = 'ghost',
  size = 'icon-sm',
  showLabel = false,
  className,
}: ReportButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          'text-muted-foreground hover:text-foreground transition-colors',
          className
        )}
        aria-label={`Report ${targetType}`}
        title={`Report ${targetType}`}
      >
        <HugeiconsIcon icon={Flag01Icon} className="size-3.5 shrink-0" strokeWidth={2} />
        {showLabel && <span>Report</span>}
      </Button>

      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        targetType={targetType}
        targetId={targetId}
        targetTitle={targetTitle}
        isSignedIn={isSignedIn}
      />
    </>
  );
}
