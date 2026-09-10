type NetworkConnection = EventTarget & {
  saveData?: boolean;
  effectiveType?: string;
};

type ResourceNavigator = Navigator & {
  connection?: NetworkConnection;
  deviceMemory?: number;
};

// These hints only govern speculative work. Tapping a feature always loads it.
export const canRunBackgroundWork = (): boolean => {
  const device = navigator as ResourceNavigator;
  if (document.visibilityState === 'hidden' || !device.onLine) {
    return false;
  }
  if (device.connection?.saveData) {
    return false;
  }
  if (
    ['slow-2g', '2g', '3g'].includes(device.connection?.effectiveType ?? '')
  ) {
    return false;
  }
  if (device.deviceMemory !== undefined && device.deviceMemory <= 4) {
    return false;
  }
  if (device.hardwareConcurrency > 0 && device.hardwareConcurrency <= 2) {
    return false;
  }

  return true;
};

// One import per idle opportunity avoids evaluating every prefetched screen
// in the same burst. Resume a paused queue when the tab/network is usable.
export const scheduleBackgroundWork = (
  tasks: ReadonlyArray<() => Promise<unknown>>,
): (() => void) => {
  const connection = (navigator as ResourceNavigator).connection;
  let next = 0;
  let isDisposed = false;
  let isRunning = false;
  let cancelScheduled: (() => void) | null = null;

  const run = () => {
    cancelScheduled = null;
    if (isDisposed || !canRunBackgroundWork()) {
      return;
    }
    const task = tasks[next++];
    isRunning = true;
    void task()
      .catch(() => {})
      .finally(() => {
        isRunning = false;
        schedule();
      });
  };

  const schedule = () => {
    if (
      isDisposed ||
      isRunning ||
      cancelScheduled ||
      next >= tasks.length ||
      !canRunBackgroundWork()
    ) {
      return;
    }
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      cancelScheduled = () => window.cancelIdleCallback(id);

      return;
    }
    const id = window.setTimeout(run, 2000);
    cancelScheduled = () => window.clearTimeout(id);
  };

  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('online', schedule);
  connection?.addEventListener('change', schedule);
  schedule();

  return () => {
    isDisposed = true;
    cancelScheduled?.();
    document.removeEventListener('visibilitychange', schedule);
    window.removeEventListener('online', schedule);
    connection?.removeEventListener('change', schedule);
  };
};
