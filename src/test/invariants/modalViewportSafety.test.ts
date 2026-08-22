import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { BASE_TOKENS, THEMES } from '@/design/tokens';

const ROOT = path.resolve(__dirname, '../../..');

const read = (file: string): string => {
  return readFileSync(path.join(ROOT, file), 'utf8');
};

const SCROLLABLE_DIALOGS = [
  'src/components/auth/LoginModal.tsx',
  'src/components/budget/BudgetForm.tsx',
  'src/components/landing/IosInstallModal.tsx',
  'src/components/onboarding/OnboardingFlow.tsx',
  'src/components/security/SetPinDialog.tsx',
] as const;

const FORM_DIALOGS_WITH_VISIBLE_CLOSE = [
  'src/components/debts/DebtsView.tsx',
  'src/components/expenses/QuickAddSheet.tsx',
  'src/components/income/IncomeFormDialog.tsx',
  'src/components/layout/FormsManager.tsx',
  'src/components/networth/NetWorthView.tsx',
] as const;

const ZERO_PADDING_ACTION_SHEETS = [
  'src/components/categories/CategoryManager.tsx',
  'src/components/debts/DebtForm.tsx',
  'src/components/debts/DebtPaymentForm.tsx',
  'src/components/goals/GoalForm.tsx',
  'src/components/networth/AccountForm.tsx',
  'src/components/networth/BalanceSnapshotForm.tsx',
] as const;

describe('modal viewport safety', () => {
  it('keeps routine scrims contextual instead of opaque', () => {
    expect(BASE_TOKENS['--modal-scrim-opacity']).toBe('0.48');

    for (const theme of THEMES) {
      expect(theme.tokens['--modal-scrim']).toBeTruthy();
    }
  });

  it('caps alert dialogs and keeps their content reachable', () => {
    const css = read('src/index.css');

    expect(css).toContain("[role='alertdialog']");
    expect(css).toContain('max-height: 85dvh');
    expect(css).toContain('overflow-y: auto');
  });

  it.each(SCROLLABLE_DIALOGS)(
    '%s provides an internal scroll region',
    (file) => {
      const source = read(file);

      expect(source).toContain('min-h-0');
      expect(source).toContain('overflow-y-auto');
      expect(source).toContain('overscroll-contain');
    },
  );

  it('offsets top toasts below the device safe area', () => {
    const css = read('src/index.css');

    expect(css).toContain(
      'top: calc(env(safe-area-inset-top, 0px) + 1rem) !important;',
    );
  });

  it.each(FORM_DIALOGS_WITH_VISIBLE_CLOSE)(
    '%s keeps its explicit close affordance visible',
    (file) => {
      const source = read(file);

      expect(source).not.toContain('[&>button]:hidden');
    },
  );

  it.each(ZERO_PADDING_ACTION_SHEETS)(
    '%s keeps bottom actions above the device safe area',
    (file) => {
      const source = read(file);

      expect(source).toContain('safe-area-inset-bottom');
    },
  );

  it('keeps secondary tasks inside their parent sheet', () => {
    const accountSheet = read('src/components/networth/AccountDetailSheet.tsx');
    const debtSheet = read('src/components/debts/DebtDetailSheet.tsx');
    const incomeForm = read('src/components/income/IncomeForm.tsx');
    const expenseCategory = read(
      'src/components/expenses/ExpenseCategoryField.tsx',
    );

    expect(countDialogRoots(accountSheet)).toBe(1);
    expect(countDialogRoots(debtSheet)).toBe(1);
    expect(countDialogRoots(incomeForm)).toBe(0);
    expect(countDialogRoots(expenseCategory)).toBe(0);
  });

  it('paints flush card rims above opaque child rows', () => {
    const css = read('src/index.css');
    const activityFeed = read('src/components/activity/ActivityFeed.tsx');

    expect(css).toContain('.surface-card-flush::after');
    expect(css).toContain('pointer-events: none');
    expect(activityFeed).toContain('divide-y divide-border/50');
    expect(activityFeed).toContain('border-dashed border-border');
  });
});

// `DialogContent` and `DialogHeader` are not roots; the whitespace boundary
// keeps this count focused on actual nested modal state machines.
const countDialogRoots = (source: string): number => {
  return source.match(/<Dialog(?:\s|>)/g)?.length ?? 0;
};
