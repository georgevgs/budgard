import { useCallback } from 'react';
import * as Sentry from '@/lib/sentry';
import { useToast } from '@/hooks/useToast';
import { haptics } from '@/lib/haptics';
import { useShowErrorToast } from '@/hooks/dataOps/useShowErrorToast';

// Every optimistic write in the app is the same shell: guard, apply the change
// locally, call the service, reconcile with what came back — and on failure put
// the state back, report it, and offer the user a retry that re-runs the whole
// thing. That shell was written out ~60 times across the dataOps hooks. It
// lives here once; the hooks describe only what differs.
//
// The retry deliberately re-runs the optimistic pass too: by the time the user
// taps "Try again" the rollback has already happened, so the mutation has to
// start from the top to look right.

// Undoes an optimistic change. Returned by `optimistic` so the runner can put
// state back exactly as it was when the write fails.
export type Rollback = () => void;

export type MutationSpec<TSaved> = {
  // Names the write for Sentry, e.g. 'createGoal'.
  operation: string;
  // Already translated. Shown with a "Try again" action.
  errorMessage: string;
  // Already translated. Omit for writes that should not announce themselves —
  // an edit that visibly updates the row does not need a toast on top.
  successMessage?: string;
  // Skip the write entirely. The `isInitialized` guard, mostly.
  skip?: boolean;
  // Runs before the optimistic pass — `haptics.warning()` for destructive ops.
  onStart?: () => void;
  // Defaults to 'success'. 'none' for writes the user did not explicitly
  // trigger, or where the UI change is its own confirmation.
  successHaptic?: 'success' | 'selection' | 'none';
  // Defaults to true. Set false where an automatic retry would be wrong —
  // deleting an account is not something to offer a one-tap re-run of.
  retryable?: boolean;
  // Applies the optimistic change and returns its undo.
  optimistic?: () => Rollback;
  // The write itself.
  perform: () => Promise<TSaved>;
  // Last chance to handle a failure before it is treated as an error: the
  // transaction hooks use this to queue the write for replay when the device
  // is offline. Return true to say it was handled — the runner then resolves
  // quietly, keeping whatever the fallback put on screen, instead of rolling
  // back and reporting.
  offlineFallback?: (error: unknown) => Promise<boolean>;
  // Reconciles local state with what the server returned. May be async when
  // reconciling needs a follow-up read; the success toast waits for it, so the
  // "saved" message never lands before the numbers it refers to.
  commit?: (saved: TSaved) => void | Promise<void>;
};

export const useMutationRunner = () => {
  const { toast } = useToast();
  const showErrorToast = useShowErrorToast();

  return useCallback(
    <TSaved>(spec: MutationSpec<TSaved>): Promise<TSaved | undefined> => {
      // Returns whatever the write returned, so callers that need the saved
      // row (a new tag's id, say) can await it. `undefined` only when skipped.
      const run = async (): Promise<TSaved | undefined> => {
        if (spec.skip) {
          return undefined;
        }

        spec.onStart?.();
        const rollback = spec.optimistic?.();

        try {
          const saved = await spec.perform();

          // The buzz fires on the write landing, not on the reconcile — the
          // user should feel the save immediately, not a round-trip later.
          fireSuccessHaptic(spec.successHaptic);
          await spec.commit?.(saved);

          if (spec.successMessage) {
            toast({ variant: 'success', title: spec.successMessage });
          }

          return saved;
        } catch (error) {
          if (spec.offlineFallback) {
            const handled = await spec.offlineFallback(error);
            if (handled) {
              return undefined;
            }
          }

          haptics.error();
          rollback?.();
          Sentry.captureException(error, {
            tags: { operation: spec.operation },
          });
          if (spec.retryable === false) {
            showErrorToast(spec.errorMessage);
          } else {
            showErrorToast(spec.errorMessage, () => {
              void run().catch(() => undefined);
            });
          }

          throw error;
        }
      };

      return run();
    },
    [showErrorToast, toast],
  );
};

// --- Helpers ---

const fireSuccessHaptic = (
  kind: MutationSpec<unknown>['successHaptic'],
): void => {
  if (kind === 'none') {
    return;
  }

  if (kind === 'selection') {
    haptics.selection();

    return;
  }

  haptics.success();
};
