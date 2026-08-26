import {
  FREE_ACCOUNT_LIMIT,
  FREE_CATEGORY_LIMIT,
  FREE_RECURRING_EXPENSE_LIMIT,
} from '@/lib/proLimits';

// Everything the free plan limits, in one place. Before this existed the only
// way to answer "what exactly is gated?" was to grep for openUpgrade().
//
// Two kinds of gate:
//   - a CAP: allowed up to `limit`, then a toast naming the cap.
//   - PRO-ONLY: not available on the free plan at all.
// A gate with no `messageKey` opens the upgrade flow without saying anything
// first; see the note in useProGate.

export type CapGate = { limit: number; messageKey: string };
export type ProOnlyGate = { proOnly: true; messageKey?: string };

export const PRO_GATES = {
  categories: {
    limit: FREE_CATEGORY_LIMIT,
    messageKey: 'pro.gate.categoryLimit',
  },
  recurringExpenses: {
    limit: FREE_RECURRING_EXPENSE_LIMIT,
    messageKey: 'pro.gate.recurringLimit',
  },
  accounts: {
    limit: FREE_ACCOUNT_LIMIT,
    messageKey: 'pro.gate.accountLimit',
  },
  // One tag per expense on the free plan.
  tagsPerExpense: { limit: 1, messageKey: 'pro.gate.tagLimit' },

  // Pro-only. These currently open the upgrade dialog without a toast, which
  // is why they carry no messageKey — the dialog is the whole explanation.
  receiptScan: { proOnly: true },
  csvExport: { proOnly: true },
  categoryBudgets: { proOnly: true },
} as const satisfies Record<string, CapGate | ProOnlyGate>;

export type ProGateName = keyof typeof PRO_GATES;

// `satisfies` above guarantees every entry is one of these two, so widening
// the parameter here is safe and keeps the predicate legal.
export const isCapGate = (gate: CapGate | ProOnlyGate): gate is CapGate =>
  'limit' in gate;
