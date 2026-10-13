'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Download01Icon,
  Delete02Icon,
  Alert02Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  exportMyDataAction,
  deleteAccountAction,
} from '@/lib/actions/account';

interface AccountDangerZoneProps {
  username: string;
}

export function AccountDangerZone({ username }: AccountDangerZoneProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [confirmInput, setConfirmInput] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await exportMyDataAction();
      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to export your data');
        return;
      }

      const jsonStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `genra-export-${username}-${dateStr}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Your data export has downloaded successfully');
    } catch {
      toast.error('An unexpected error occurred during data export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmInput.trim().toLowerCase() !== username.toLowerCase()) {
      toast.error('Username confirmation does not match');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteAccountAction({ usernameConfirmation: confirmInput });
      if (!res.success) {
        toast.error(res.error || 'Failed to delete account');
        setIsDeleting(false);
        return;
      }

      toast.success('Your account and personal data have been permanently removed');
      setIsDeleteDialogOpen(false);
      router.replace('/');
    } catch {
      toast.error('An unexpected error occurred during account deletion');
      setIsDeleting(false);
    }
  };

  const isConfirmed = confirmInput.trim().toLowerCase() === username.toLowerCase();

  return (
    <div className="space-y-6 pt-6">
      {/* 1. Data Export Section */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Download01Icon} className="size-4 text-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Export Your Data
              </h3>
            </div>
            <p className="text-xs text-muted-foreground max-w-md">
              Download an archive of all your personal data in machine-readable JSON format, including your profile, creations, prompts, resources, and collections.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleExportData()}
            disabled={isExporting}
            className="shrink-0 text-xs font-medium"
          >
            <HugeiconsIcon
              icon={Download01Icon}
              className="mr-1.5 size-3.5"
            />
            {isExporting ? 'Preparing export...' : 'Export data (JSON)'}
          </Button>
        </div>
      </div>

      {/* 2. Danger Zone (Account Deletion) */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Alert02Icon} className="size-4 text-destructive" />
              <h3 className="text-sm font-semibold text-destructive">
                Danger Zone: Delete Account
              </h3>
            </div>
            <p className="text-xs text-muted-foreground max-w-md">
              Permanently delete your account, public profile, creations, uploaded media, prompts, and collections. This action is irreversible.
            </p>
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              setConfirmInput('');
              setIsDeleteDialogOpen(true);
            }}
            className="shrink-0 text-xs font-medium"
          >
            <HugeiconsIcon icon={Delete02Icon} className="mr-1.5 size-3.5" />
            Delete account
          </Button>
        </div>
      </div>

      {/* Deletion Confirmation Modal */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <HugeiconsIcon icon={Alert02Icon} className="size-5 shrink-0" />
              <span>Permanently Delete Account</span>
            </DialogTitle>
            <DialogDescription className="space-y-2 text-xs text-muted-foreground">
              <span>
                This will immediately delete your account and all associated data, including creations, prompts, resources, collections, and uploaded media files.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-surface-2 p-3 text-xs text-foreground/90 border border-border/40">
              To proceed, please enter your username{' '}
              <strong className="font-mono text-foreground font-semibold">@{username}</strong> below:
            </div>

            <div className="space-y-1">
              <Label htmlFor="delete-confirm-username" className="text-xs">
                Your username
              </Label>
              <Input
                id="delete-confirm-username"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={username}
                autoComplete="off"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void handleDeleteAccount()}
              disabled={!isConfirmed || isDeleting}
            >
              {isDeleting ? 'Deleting account...' : 'I understand, delete my account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
