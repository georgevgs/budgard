import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canRunBackgroundWork,
  scheduleBackgroundWork,
} from '@/constants/backgroundWork';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const setDevice = (options: Record<string, unknown>) => {
  vi.stubGlobal('navigator', {
    onLine: true,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    ...options,
  });
};

describe('speculative background work', () => {
  it.each([
    { connection: { saveData: true } },
    { connection: { effectiveType: '3g' } },
    { connection: { effectiveType: '2g' } },
    { deviceMemory: 2 },
    { hardwareConcurrency: 2 },
    { onLine: false },
  ])('does not speculate on a constrained device: %j', (device) => {
    setDevice(device);
    expect(canRunBackgroundWork()).toBe(false);
  });

  it('allows missing optional hints and checks again before executing', async () => {
    expect(canRunBackgroundWork()).toBe(true);
    const task = vi.fn(async () => undefined);
    const cancel = scheduleBackgroundWork([task]);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await vi.advanceTimersByTimeAsync(4000);
    expect(task).not.toHaveBeenCalled();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(4000);
    expect(task).toHaveBeenCalledTimes(1);
    cancel();
  });

  it('spreads imports across idle periods and cancels remaining work on unmount', async () => {
    const first = vi.fn(async () => undefined);
    const second = vi.fn(async () => undefined);
    const cancel = scheduleBackgroundWork([first, second]);
    await vi.advanceTimersByTimeAsync(2000);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    cancel();
    await vi.advanceTimersByTimeAsync(6000);
    expect(second).not.toHaveBeenCalled();
  });

  it('resumes when Data Saver is disabled', async () => {
    const connection = Object.assign(new EventTarget(), { saveData: true });
    setDevice({ connection });
    const task = vi.fn(async () => undefined);
    const cancel = scheduleBackgroundWork([task]);
    await vi.advanceTimersByTimeAsync(6000);
    expect(task).not.toHaveBeenCalled();
    connection.saveData = false;
    connection.dispatchEvent(new Event('change'));
    await vi.advanceTimersByTimeAsync(2000);
    expect(task).toHaveBeenCalledTimes(1);
    cancel();
  });
});
