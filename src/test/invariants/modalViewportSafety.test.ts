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
});

// `DialogContent` and `DialogHeader` are not roots; the whitespace boundary
// keeps this count focused on actual nested modal state machines.
const countDialogRoots = (source: string): number => {
  return source.match(/<Dialog(?:\s|>)/g)?.length ?? 0;
};
