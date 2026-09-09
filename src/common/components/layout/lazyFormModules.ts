import { lazyWithRetry } from '@/constants/lazyWithRetry';
import type { FormsManagerProps } from '@/common/components/layout/FormsManager';
import type { IncomeFormDialogProps } from '@/pages/income/components/IncomeFormDialog';

// The full expense and income forms, split out of the authenticated shell.
//
// QuickAddProvider mounts on every authenticated screen, so anything it
// imports statically is downloaded and parsed before the first tile paints.
// These two drag in react-hook-form, the Zod feature schemas and the date
// picker — roughly 31 kB gzip of the startup graph — for dialogs that only
// appear behind "More details", an edit, or the income button. The quick-add
// sheet is deliberately NOT here: two taps and a number is the thing this app
// is fastest at, and it must never wait on a chunk.
//
// prefetchFormModules runs on idle after the shell mounts, so in practice the
// chunk is already in memory by the time anyone opens a form; the lazy
// boundary is what keeps it off the critical path, not what defers it forever.

export const FormsManager = lazyWithRetry<FormsManagerProps>(() =>
  import('@/common/components/layout/FormsManager').then((module) => ({
    default: module.FormsManager,
  })),
);

export const IncomeFormDialog = lazyWithRetry<IncomeFormDialogProps>(() =>
  import('@/pages/income/components/IncomeFormDialog').then((module) => ({
    default: module.IncomeFormDialog,
  })),
);

export const prefetchFormModules = (): void => {
  const swallow = () => {};
  import('@/common/components/layout/FormsManager').catch(swallow);
  import('@/pages/income/components/IncomeFormDialog').catch(swallow);
};
