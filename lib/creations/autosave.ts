export type SaveReason = "edit" | "flush" | "retry" | "manual";
export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export interface AutosaveSchedulerOptions {
  initialSnapshot?: string;
  getSnapshot: () => string;
  isDraft: () => boolean;
  onSave: (reason: SaveReason) => Promise<{ ok: boolean; error?: string }>;
  onStatusChange?: (status: AutosaveStatus, error?: string) => void;
  debounceMs?: number;
  retryDelays?: number[];
}

export class AutosaveScheduler {
  static saveCounter = 0;

  private lastSavedSnapshot: string;
  private options: AutosaveSchedulerOptions;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private hasPendingFollowup = false;
  private isBlocked = false;
  private retryCount = 0;

  constructor(options: AutosaveSchedulerOptions) {
    this.options = {
      debounceMs: 3000,
      retryDelays: [5000, 15000, 45000],
      ...options,
    };
    this.lastSavedSnapshot = options.initialSnapshot ?? options.getSnapshot();
  }

  public setLastSavedSnapshot(snapshot: string) {
    this.lastSavedSnapshot = snapshot;
  }

  public getLastSavedSnapshot(): string {
    return this.lastSavedSnapshot;
  }

  public isDirty(): boolean {
    return this.options.getSnapshot() !== this.lastSavedSnapshot;
  }

  public isInFlight(): boolean {
    return this.inFlight;
  }

  public getRetryCount(): number {
    return this.retryCount;
  }

  /**
   * Called when an edit occurs. Debounces save by debounceMs (default 3s).
   */
  public notifyEdit() {
    if (this.isBlocked) return;
    if (!this.options.isDraft()) return;

    if (!this.isDirty()) {
      return;
    }

    // Cancel pending retry if user typed new changes
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
      this.retryCount = 0;
    }

    if (this.inFlight) {
      this.hasPendingFollowup = true;
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const debounceMs = this.options.debounceMs ?? 3000;
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.execute("edit");
    }, debounceMs);
  }

  /**
   * Flushes any pending dirty changes immediately (e.g. visibilitychange: hidden or beforeunload).
   */
  public async flush(): Promise<void> {
    if (this.isBlocked) return;
    if (!this.options.isDraft()) return;

    if (!this.isDirty()) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.inFlight) {
      this.hasPendingFollowup = true;
      return;
    }

    await this.execute("flush");
  }

  /**
   * Explicit manual save (e.g. 'Save changes' button on published creations or 'Save draft' button).
   */
  public async manualSave(): Promise<boolean> {
    if (this.isBlocked) return false;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
      this.retryCount = 0;
    }

    return await this.execute("manual");
  }

  /**
   * Completely blocks any further saves (e.g. when Publish is clicked).
   */
  public block() {
    this.isBlocked = true;
    this.hasPendingFollowup = false;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  public unblock() {
    this.isBlocked = false;
  }

  public destroy() {
    this.block();
  }

  /**
   * Executes a save request with reason tracking, dirty validation, and retry logic.
   */
  public async execute(reason: SaveReason): Promise<boolean> {
    if (this.isBlocked) return false;
    if (!this.options.isDraft() && reason !== "manual") return false;

    const currentSnapshot = this.options.getSnapshot();
    if (currentSnapshot === this.lastSavedSnapshot && reason !== "manual") {
      return true;
    }

    if (this.inFlight) {
      this.hasPendingFollowup = true;
      return false;
    }

    this.inFlight = true;
    this.options.onStatusChange?.("saving");

    if (process.env.NODE_ENV !== "production") {
      AutosaveScheduler.saveCounter += 1;
      console.debug(
        `[Autosave] Save triggered: reason=${reason}, count=${AutosaveScheduler.saveCounter}`
      );
    }

    try {
      const res = await this.options.onSave(reason);

      if (this.isBlocked) {
        return false;
      }

      if (res.ok) {
        this.lastSavedSnapshot = currentSnapshot;
        this.retryCount = 0;
        this.options.onStatusChange?.("saved");
        return true;
      } else {
        this.handleFailure(res.error);
        return false;
      }
    } catch (err: unknown) {
      if (this.isBlocked) return false;
      const msg = (err as Error)?.message || "Save failed";
      this.handleFailure(msg);
      return false;
    } finally {
      this.inFlight = false;

      // Handle queued follow-up if user edited during in-flight save
      if (!this.isBlocked && this.hasPendingFollowup) {
        this.hasPendingFollowup = false;
        if (this.isDirty()) {
          this.notifyEdit();
        }
      }
    }
  }

  private handleFailure(errorMsg?: string) {
    this.retryCount += 1;
    const delays = this.options.retryDelays || [5000, 15000, 45000];

    if (this.retryCount <= delays.length) {
      const delay = delays[this.retryCount - 1];
      this.options.onStatusChange?.(
        "error",
        errorMsg || `Save failed. Retrying in ${delay / 1000}s...`
      );

      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        void this.execute("retry");
      }, delay);
    } else {
      // Stopped after 3 retries
      this.options.onStatusChange?.("error", "Couldn't save · Retry");
    }
  }
}
