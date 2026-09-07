import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { BASE_TOKENS, THEMES } from '@/design/tokens';

const ROOT = path.resolve(__dirname, '../../..');

const read = (file: string): string => {
  return readFileSync(path.join(ROOT, file), 'utf8');
};

const SCROLLABLE_DIALOGS = [
  'src/pages/auth/components/LoginModal.tsx',
  'src/pages/budget/components/BudgetForm.tsx',
  'src/pages/landing/components/IosInstallModal.tsx',
  'src/pages/onboarding/OnboardingFlow.tsx',
  'src/pages/security/components/SetPinDialog.tsx',
] as const;

const ZERO_PADDING_ACTION_SHEETS = [
  'src/pages/categories/components/CategoryManager.tsx',
  'src/pages/debts/components/DebtForm.tsx',
  'src/pages/debts/components/DebtPaymentForm.tsx',
  'src/pages/goals/components/GoalForm.tsx',
  'src/pages/networth/components/AccountForm.tsx',
  'src/pages/networth/components/BalanceSnapshotForm.tsx',
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

  it('keeps the landing header visible in an iOS Home Screen web app', () => {
    const css = read('src/index.css');
    const header = read('src/pages/landing/components/Header.tsx');
    const loading = read('src/pages/landing/components/LandingLoading.tsx');
    const document = read('index.html');
    const manifest = read('public/manifest.json');

    expect(document).toContain('viewport-fit=cover');
    expect(document).toContain(
      'apple-mobile-web-app-status-bar-style" content="black-translucent',
    );
    expect(manifest).toContain('"display": "standalone"');
    expect(manifest).toContain('"screenshots"');
    expect(manifest).toContain('"form_factor": "narrow"');
    expect(css).toContain('.landing-header');
    expect(css).toContain('padding-top: env(safe-area-inset-top, 0px);');
    expect(css).toContain('env(safe-area-inset-left, 0px)');
    expect(css).toContain('env(safe-area-inset-right, 0px)');
    expect(header).toContain('landing-header sticky top-0');
    expect(loading).toContain('className="landing-header"');
  });

  it('uses swipe as the only mobile dialog chrome and keeps desktop close', () => {
    const css = read('src/index.css');
    const dialog = read('src/common/ui/dialog.tsx');

    expect(css).toMatch(
      /@media \(max-width: 639px\) \{\s+\[role='dialog'\]\[data-state\] > button:last-child \{\s+display: none;\s+\}\s+\}/,
    );
    expect(dialog).toContain('isEnabled: isMobile');
    expect(dialog).toContain('inline-flex h-10 w-10');
  });

  it.each(ZERO_PADDING_ACTION_SHEETS)(
    '%s keeps bottom actions above the device safe area',
    (file) => {
      const source = read(file);

      expect(source).toContain('safe-area-inset-bottom');
    },
  );

  it('keeps secondary tasks inside their parent sheet', () => {
    const accountSheet = read('src/pages/networth/components/AccountDetailSheet.tsx');
    const debtSheet = read('src/pages/debts/components/DebtDetailSheet.tsx');
    const incomeForm = read('src/pages/income/components/IncomeForm.tsx');
    const expenseCategory = read(
      'src/pages/expenses/components/ExpenseCategoryField.tsx',
    );

    expect(countDialogRoots(accountSheet)).toBe(1);
    expect(countDialogRoots(debtSheet)).toBe(1);
    expect(countDialogRoots(incomeForm)).toBe(0);
    expect(countDialogRoots(expenseCategory)).toBe(0);
  });

  // Both flush surfaces put their rim on an ::after so an opaque child cannot
  // paint over it: `.surface-card-flush` for the lists that are still one
  // card, `.tile-flush` for an Activity row, which since the bento redesign is
  // its own pill and has to clip its own swipe-to-delete reveal.
  it('paints flush surface rims above opaque child rows', () => {
    const css = read('src/index.css');
    const swipeableRow = read('src/pages/activity/components/SwipeableRow.tsx');
    const activityFeed = read('src/pages/activity/components/ActivityFeed.tsx');

    expect(css).toContain('.surface-card-flush::after');
    expect(css).toContain('.tile-flush::after');
    expect(css).toContain('pointer-events: none');
    expect(swipeableRow).toContain('tile-flush');
    expect(activityFeed).toContain('border-dashed border-border');
  });
});

// `DialogContent` and `DialogHeader` are not roots; the whitespace boundary
// keeps this count focused on actual nested modal state machines.
const countDialogRoots = (source: string): number => {
  return source.match(/<Dialog(?:\s|>)/g)?.length ?? 0;
};
