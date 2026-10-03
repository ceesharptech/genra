import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AutosaveScheduler } from "@/lib/creations/autosave";

describe("AutosaveScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    AutosaveScheduler.saveCounter = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not save when nothing changed", async () => {
    const snapshot = JSON.stringify({ title: "Initial" });
    const onSave = vi.fn().mockResolvedValue({ ok: true });

    const scheduler = new AutosaveScheduler({
      getSnapshot: () => snapshot,
      isDraft: () => true,
      onSave,
      debounceMs: 3000,
    });

    scheduler.notifyEdit();
    vi.advanceTimersByTime(5000);

    expect(onSave).not.toHaveBeenCalled();
  });

  it("executes exactly one save after a burst of edits", async () => {
    let snapshot = JSON.stringify({ title: "Initial" });
    const onSave = vi.fn().mockResolvedValue({ ok: true });

    const scheduler = new AutosaveScheduler({
      getSnapshot: () => snapshot,
      isDraft: () => true,
      onSave,
      debounceMs: 3000,
    });

    // Burst of edits within 3 seconds
    snapshot = JSON.stringify({ title: "A" });
    scheduler.notifyEdit();
    vi.advanceTimersByTime(1000);

    snapshot = JSON.stringify({ title: "AB" });
    scheduler.notifyEdit();
    vi.advanceTimersByTime(1000);

    snapshot = JSON.stringify({ title: "ABC" });
    scheduler.notifyEdit();
    vi.advanceTimersByTime(1000);

    // Only 1 second has passed since "ABC", save shouldn't fire yet
    expect(onSave).not.toHaveBeenCalled();

    // Advance remaining 2000ms
    vi.advanceTimersByTime(2000);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("edit");
  });

  it("status changes and UI state do not trigger saves", async () => {
    const snapshot = JSON.stringify({ title: "Stable" });
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    const onStatusChange = vi.fn();

    const scheduler = new AutosaveScheduler({
      getSnapshot: () => snapshot,
      isDraft: () => true,
      onSave,
      onStatusChange,
      debounceMs: 3000,
    });

    // Simulating UI status notifications
    scheduler.notifyEdit();
    vi.advanceTimersByTime(4000);

    expect(onSave).not.toHaveBeenCalled();
    expect(scheduler.isDirty()).toBe(false);
  });

  it("triggers exactly one follow-up save when an edit happens during an in-flight save", async () => {
    let snapshot = JSON.stringify({ title: "Initial" });
    let resolveSave: (val: { ok: boolean }) => void = () => {};

    const onSave = vi.fn().mockImplementation(() => {
      return new Promise<{ ok: boolean }>((resolve) => {
        resolveSave = resolve;
      });
    });

    const scheduler = new AutosaveScheduler({
      getSnapshot: () => snapshot,
      isDraft: () => true,
      onSave,
      debounceMs: 3000,
    });

    // 1. Initial edit triggers save
    snapshot = JSON.stringify({ title: "First Edit" });
    scheduler.notifyEdit();
    vi.advanceTimersByTime(3000);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(scheduler.isInFlight()).toBe(true);

    // 2. User makes another edit while in-flight
    snapshot = JSON.stringify({ title: "Second Edit" });
    scheduler.notifyEdit();

    // 3. User makes a third edit while still in-flight
    snapshot = JSON.stringify({ title: "Third Edit" });
    scheduler.notifyEdit();

    // Still only 1 call in flight
    expect(onSave).toHaveBeenCalledTimes(1);

    // 4. Resolve the in-flight save
    resolveSave({ ok: true });
    await Promise.resolve(); // flush microtasks

    expect(scheduler.isInFlight()).toBe(false);

    // Follow-up was scheduled with 3s debounce
    expect(onSave).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(3000);

    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("stops after 3 retries with exponential backoff on failure", async () => {
    const snapshot = JSON.stringify({ title: "Dirty Draft" });
    const onSave = vi.fn().mockResolvedValue({ ok: false, error: "Network Error" });
    const onStatusChange = vi.fn();

    const scheduler = new AutosaveScheduler({
      getSnapshot: () => snapshot,
      isDraft: () => true,
      onSave,
      onStatusChange,
      debounceMs: 1000,
      retryDelays: [5000, 15000, 45000],
    });

    scheduler.setLastSavedSnapshot(JSON.stringify({ title: "Original" }));

    // Initial save
    scheduler.notifyEdit();
    vi.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledTimes(1); // 1st attempt fails

    // Retry 1: after 5s
    vi.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledTimes(2); // 2nd attempt fails

    // Retry 2: after 15s
    vi.advanceTimersByTime(15000);
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledTimes(3); // 3rd attempt fails

    // Retry 3: after 45s
    vi.advanceTimersByTime(45000);
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledTimes(4); // 4th attempt (3rd retry) fails

    // No further retries
    vi.advanceTimersByTime(100000);
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledTimes(4);
    expect(onStatusChange).toHaveBeenLastCalledWith("error", "Couldn't save · Retry");
  });

  it("blocks all saves when publishing starts", async () => {
    const snapshot = JSON.stringify({ title: "Ready to Publish" });
    const onSave = vi.fn().mockResolvedValue({ ok: true });

    const scheduler = new AutosaveScheduler({
      getSnapshot: () => snapshot,
      isDraft: () => true,
      onSave,
      debounceMs: 3000,
    });
    scheduler.setLastSavedSnapshot(JSON.stringify({ title: "Old" }));

    // User is waiting on debounce
    scheduler.notifyEdit();

    // User clicks Publish
    scheduler.block();

    vi.advanceTimersByTime(5000);
    expect(onSave).not.toHaveBeenCalled();

    // Any flush or edit is also blocked
    await scheduler.flush();
    scheduler.notifyEdit();
    vi.advanceTimersByTime(5000);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("never autosaves in published mode", async () => {
    const isDraft = false;
    let snapshot = JSON.stringify({ title: "Published creation" });
    const onSave = vi.fn().mockResolvedValue({ ok: true });

    const scheduler = new AutosaveScheduler({
      getSnapshot: () => snapshot,
      isDraft: () => isDraft,
      onSave,
      debounceMs: 3000,
    });

    snapshot = JSON.stringify({ title: "Published creation edited" });
    scheduler.notifyEdit();
    vi.advanceTimersByTime(5000);

    expect(onSave).not.toHaveBeenCalled();

    // But manual save works
    await scheduler.manualSave();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("manual");
  });
});
