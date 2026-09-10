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
// Forms are prefetched individually at idle on capable devices/connections.
// Data Saver and constrained devices fetch them when the user opens them.

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

export const formPrefetches = [
  () => import('@/common/components/layout/FormsManager'),
  () => import('@/pages/income/components/IncomeFormDialog'),
];
