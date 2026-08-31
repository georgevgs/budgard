import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  FREE_ACCOUNT_LIMIT,
  FREE_CATEGORY_LIMIT,
  FREE_RECURRING_EXPENSE_LIMIT,
} from '@/lib/proLimits';

const mockToast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useToast', () => ({ toast: mockToast }));

const mockOpenUpgrade = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/UpgradeDialogContext', () => ({
  useUpgradeDialog: () => ({ openUpgrade: mockOpenUpgrade }),
}));

const plan = vi.hoisted(() => ({ isPro: false }));
vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ isPro: plan.isPro }),
}));

import { useProGate } from '@/hooks/pro/useProGate';
import { PRO_GATES } from '@/lib/proGates';

const renderGate = () => renderHook(() => useProGate()).result;

beforeEach(() => {
  vi.clearAllMocks();
  plan.isPro = false;
});

describe('useProGate on the free plan', () => {
  it.each([
    ['categories', FREE_CATEGORY_LIMIT],
    ['recurringExpenses', FREE_RECURRING_EXPENSE_LIMIT],
    ['accounts', FREE_ACCOUNT_LIMIT],
    ['tagsPerExpense', 1],
  ] as const)('allows %s below the cap and blocks at it', (gate, limit) => {
    const { allow } = renderGate().current;

    expect(allow(gate, 0)).toBe(true);
    expect(allow(gate, limit - 1)).toBe(true);
    expect(allow(gate, limit)).toBe(false);
    expect(allow(gate, limit + 5)).toBe(false);
  });

  it('explains the cap and opens the upgrade flow when blocking', () => {
    const { allow } = renderGate().current;

    expect(allow('categories', FREE_CATEGORY_LIMIT)).toBe(false);
    expect(mockToast).toHaveBeenCalledWith({
      title: expect.stringContaining('categoryLimit'),
    });
    expect(mockOpenUpgrade).toHaveBeenCalled();
  });

  it('passes the limit into the message so the copy can name it', () => {
    const { allow } = renderGate().current;

    allow('accounts', FREE_ACCOUNT_LIMIT);
    // The global i18n test mock interpolates {{limit}} into the key.
    expect(mockToast).toHaveBeenCalledWith({
      title: expect.any(String),
    });
  });

  it('blocks a Pro-only feature outright, with no count involved', () => {
    const { allow } = renderGate().current;

    expect(allow('receiptScan')).toBe(false);
    expect(allow('csvExport')).toBe(false);
    expect(allow('categoryBudgets')).toBe(false);
    expect(mockOpenUpgrade).toHaveBeenCalledTimes(3);
  });

  it('names the blocked feature before opening a Pro-only upsell', () => {
    // The upgrade dialog is generic ("Upgrade to Pro") and never says what the
    // user just tried, so the gate has to.
    const { allow } = renderGate().current;

    allow('receiptScan');

    expect(mockToast).toHaveBeenCalledWith({
      title: 'pro.gate.receiptScan',
    });
    expect(mockOpenUpgrade).toHaveBeenCalled();
  });

  it('gives every gate something to say', () => {
    // A gate that opens the paywall silently leaves the user to infer why.
    for (const [name, gate] of Object.entries(PRO_GATES)) {
      expect(
        'messageKey' in gate && Boolean(gate.messageKey),
        `${name} has no messageKey`,
      ).toBe(true);
    }
  });

  it('runs onBlock before the upsell so a popover can get out of the way', () => {
    const order: string[] = [];
    mockOpenUpgrade.mockImplementation(() => order.push('upgrade'));
    const { allow } = renderGate().current;

    allow('tagsPerExpense', 1, { onBlock: () => order.push('onBlock') });

    expect(order).toEqual(['onBlock', 'upgrade']);
  });

  it('does not run onBlock when the action is allowed', () => {
    const onBlock = vi.fn();
    const { allow } = renderGate().current;

    expect(allow('tagsPerExpense', 0, { onBlock })).toBe(true);
    expect(onBlock).not.toHaveBeenCalled();
  });
});

describe('useProGate on Pro', () => {
  beforeEach(() => {
    plan.isPro = true;
  });

  it('allows everything, cap or not, and never upsells', () => {
    const { allow, isPro } = renderGate().current;

    expect(isPro).toBe(true);
    expect(allow('categories', 9999)).toBe(true);
    expect(allow('accounts', 9999)).toBe(true);
    expect(allow('tagsPerExpense', 9999)).toBe(true);
    expect(allow('receiptScan')).toBe(true);
    expect(allow('csvExport')).toBe(true);
    expect(mockOpenUpgrade).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });
});
