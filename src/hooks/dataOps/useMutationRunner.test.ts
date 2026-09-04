import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));

const mockShowErrorToast = vi.fn();
vi.mock('@/hooks/dataOps/useShowErrorToast', () => ({
  useShowErrorToast: () => mockShowErrorToast,
}));

const mockHaptics = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  selection: vi.fn(),
}));
vi.mock('@/lib/haptics', () => ({ haptics: mockHaptics }));

const mockSentry = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock('@/lib/sentry', () => mockSentry);

import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';

const renderRunner = () => renderHook(() => useMutationRunner()).result;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useMutationRunner', () => {
  it('runs the happy path in order: start, optimistic, perform, commit, toast', async () => {
    const order: string[] = [];
    const runner = renderRunner();

    await act(async () => {
      await runner.current({
        operation: 'createThing',
        errorMessage: 'failed',
        successMessage: 'created',
        onStart: () => order.push('start'),
        optimistic: () => {
          order.push('optimistic');

          return () => order.push('rollback');
        },
        perform: async () => {
          order.push('perform');

          return { id: 'saved-1' };
        },
        commit: (saved) => {
          order.push(`commit:${saved.id}`);
        },
      });
    });

    expect(order).toEqual(['start', 'optimistic', 'perform', 'commit:saved-1']);
    expect(mockHaptics.success).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'success',
      title: 'created',
    });
  });

  it('rolls back, reports, and rethrows when the write fails', async () => {
    const rollback = vi.fn();
    const runner = renderRunner();

    await act(async () => {
      await expect(
        runner.current({
          operation: 'createThing',
          errorMessage: 'could not save',
          optimistic: () => rollback,
          perform: async () => {
            throw new Error('boom');
          },
        }),
      ).rejects.toThrow('boom');
    });

    expect(rollback).toHaveBeenCalledTimes(1);
    expect(mockHaptics.error).toHaveBeenCalled();
    expect(mockSentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      { tags: { operation: 'createThing' } },
    );
    expect(mockShowErrorToast).toHaveBeenCalledWith(
      'could not save',
      expect.any(Function),
    );
    // A failed write must not also claim success.
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('does not commit or toast when the write fails', async () => {
    const commit = vi.fn();
    const runner = renderRunner();

    await act(async () => {
      await expect(
        runner.current({
          operation: 'op',
          errorMessage: 'e',
          successMessage: 'should not appear',
          perform: async () => {
            throw new Error('nope');
          },
          commit,
        }),
      ).rejects.toThrow();
    });

    expect(commit).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('retry re-runs the optimistic pass, not just the write', async () => {
    // By the time the user taps "Try again" the rollback has already undone
    // the optimistic change, so a retry that skipped it would show nothing.
    const order: string[] = [];
    let attempt = 0;
    const runner = renderRunner();

    await act(async () => {
      await expect(
        runner.current({
          operation: 'op',
          errorMessage: 'e',
          optimistic: () => {
            order.push('optimistic');

            return () => order.push('rollback');
          },
          perform: async () => {
            attempt += 1;
            order.push(`perform:${attempt}`);
            throw new Error('down');
          },
        }),
      ).rejects.toThrow();
    });

    const retry = mockShowErrorToast.mock.calls[0][1] as () => void;
    await act(async () => {
      retry();
      await Promise.resolve();
    });

    expect(order).toEqual([
      'optimistic',
      'perform:1',
      'rollback',
      'optimistic',
      'perform:2',
      'rollback',
    ]);
  });

  it('a retry that throws does not become an unhandled rejection', async () => {
    const runner = renderRunner();
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    await act(async () => {
      await expect(
        runner.current({
          operation: 'op',
          errorMessage: 'e',
          perform: async () => {
            throw new Error('down');
          },
        }),
      ).rejects.toThrow();
    });

    const retry = mockShowErrorToast.mock.calls[0][1] as () => void;
    await act(async () => {
      retry();
      await Promise.resolve();
      await Promise.resolve();
    });

    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('skips everything when skip is set', async () => {
    const perform = vi.fn();
    const optimistic = vi.fn();
    const onStart = vi.fn();
    const runner = renderRunner();

    await act(async () => {
      await runner.current({
        operation: 'op',
        errorMessage: 'e',
        skip: true,
        onStart,
        optimistic,
        perform,
      });
    });

    expect(onStart).not.toHaveBeenCalled();
    expect(optimistic).not.toHaveBeenCalled();
    expect(perform).not.toHaveBeenCalled();
  });

  it('stays silent when no successMessage is given', async () => {
    const runner = renderRunner();

    await act(async () => {
      await runner.current({
        operation: 'op',
        errorMessage: 'e',
        perform: async () => undefined,
      });
    });

    expect(mockToast).not.toHaveBeenCalled();
    expect(mockHaptics.success).toHaveBeenCalled();
  });

  it('uses the selection haptic when asked', async () => {
    const runner = renderRunner();

    await act(async () => {
      await runner.current({
        operation: 'op',
        errorMessage: 'e',
        successHaptic: 'selection',
        perform: async () => undefined,
      });
    });

    expect(mockHaptics.selection).toHaveBeenCalled();
    expect(mockHaptics.success).not.toHaveBeenCalled();
  });

  it('fires no success haptic when told none', async () => {
    const runner = renderRunner();

    await act(async () => {
      await runner.current({
        operation: 'op',
        errorMessage: 'e',
        successHaptic: 'none',
        perform: async () => undefined,
      });
    });

    expect(mockHaptics.success).not.toHaveBeenCalled();
    expect(mockHaptics.selection).not.toHaveBeenCalled();
  });

  it('offers no retry when the mutation is marked non-retryable', async () => {
    const runner = renderRunner();

    await act(async () => {
      await expect(
        runner.current({
          operation: 'deleteAccount',
          errorMessage: 'could not delete',
          retryable: false,
          perform: async () => {
            throw new Error('down');
          },
        }),
      ).rejects.toThrow();
    });

    // One argument only — no "Try again" action.
    expect(mockShowErrorToast).toHaveBeenCalledWith('could not delete');
  });

  it('resolves quietly when the offline fallback takes the error', async () => {
    const rollback = vi.fn();
    const runner = renderRunner();

    await act(async () => {
      // Resolves rather than throwing — the write is queued, not lost.
      await runner.current({
        operation: 'createThing',
        errorMessage: 'e',
        optimistic: () => rollback,
        offlineFallback: async () => true,
        perform: async () => {
          throw new Error('offline');
        },
      });
    });

    // The queued write stays on screen, so nothing is rolled back or reported.
    expect(rollback).not.toHaveBeenCalled();
    expect(mockHaptics.error).not.toHaveBeenCalled();
    expect(mockSentry.captureException).not.toHaveBeenCalled();
    expect(mockShowErrorToast).not.toHaveBeenCalled();
  });

  it('falls through to normal error handling when the fallback declines', async () => {
    const rollback = vi.fn();
    const runner = renderRunner();

    await act(async () => {
      await expect(
        runner.current({
          operation: 'createThing',
          errorMessage: 'e',
          optimistic: () => rollback,
          offlineFallback: async () => false,
          perform: async () => {
            throw new Error('real failure');
          },
        }),
      ).rejects.toThrow('real failure');
    });

    expect(rollback).toHaveBeenCalled();
    expect(mockShowErrorToast).toHaveBeenCalled();
  });

  it('works with no optimistic pass at all (server-first writes)', async () => {
    const runner = renderRunner();

    await act(async () => {
      await expect(
        runner.current({
          operation: 'op',
          errorMessage: 'e',
          perform: async () => {
            throw new Error('down');
          },
        }),
      ).rejects.toThrow();
    });

    // No rollback to run, but everything else still happens.
    expect(mockHaptics.error).toHaveBeenCalled();
    expect(mockShowErrorToast).toHaveBeenCalled();
  });
});
