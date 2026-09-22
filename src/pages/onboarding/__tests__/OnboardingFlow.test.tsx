import { describe, it, expect, vi, beforeEach } from 'vitest';
import { swatch } from '@/design/palette';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OnboardingFlow from '@/pages/onboarding/OnboardingFlow';
import {
  readOnboardingStep,
  shouldShowOnboarding,
} from '@/pages/onboarding/utils/onboarding';

// Mock useAuth
const USER_ID = 'user-123';
const mockSession = {
  user: { id: USER_ID },
};
vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({ session: mockSession }),
}));

vi.mock('@/common/contexts/DataContext', () => ({
  useCategoriesData: () => ({ expenseCategories: [] }),
  useExpensesData: () => [],
  useDataConfig: () => ({
    isInitialized: true,
    monthlyBudget: null,
    defaultCurrency: 'EUR',
    defaultSavingsPct: null,
  }),
}));

const mockHandleExpenseFormSubmit = vi.fn();
vi.mock('@/common/contexts/QuickAddContext', () => ({
  useQuickAdd: () => ({
    handleExpenseFormSubmit: mockHandleExpenseFormSubmit,
  }),
}));

const mockHandleBudgetUpdate = vi.fn();
const mockHandleCategoriesAddBulk = vi.fn();
vi.mock('@/common/hooks/dataOps/useBudgetOps', () => ({
  useBudgetOps: () => ({
    handleBudgetUpdate: mockHandleBudgetUpdate,
    handleCategoryBudgetUpsert: vi.fn(),
    handleCategoryBudgetDelete: vi.fn(),
  }),
}));
vi.mock('@/common/hooks/dataOps/useCategoryOps', () => ({
  useCategoryOps: () => ({
    handleCategoryAdd: vi.fn(),
    handleCategoryUpdate: vi.fn(),
    handleCategoryDelete: vi.fn(),
    handleCategoriesAddBulk: mockHandleCategoriesAddBulk,
  }),
}));

beforeEach(() => {
  localStorage.clear();
  mockHandleBudgetUpdate.mockReset();
  mockHandleCategoriesAddBulk.mockReset();
  mockHandleExpenseFormSubmit.mockReset();
});

const renderFlow = (onComplete = vi.fn()) => {
  render(
    <MemoryRouter>
      <OnboardingFlow isOpen onComplete={onComplete} />
    </MemoryRouter>,
  );

  return onComplete;
};

// ─── shouldShowOnboarding ────────────────────────────────────────────────────

describe('shouldShowOnboarding', () => {
  it('returns false when not initialized', () => {
    expect(shouldShowOnboarding(USER_ID, false, 0, 0, null)).toBe(false);
  });

  it('returns false when already onboarded', () => {
    localStorage.setItem(`budgard_onboarded:${USER_ID}`, 'true');
    expect(shouldShowOnboarding(USER_ID, true, 0, 0, null)).toBe(false);
  });

  it('returns false when user has expenses', () => {
    expect(shouldShowOnboarding(USER_ID, true, 5, 0, null)).toBe(false);
  });

  it('returns false when user has categories', () => {
    expect(shouldShowOnboarding(USER_ID, true, 0, 3, null)).toBe(false);
  });

  it('returns false when user has a budget', () => {
    expect(shouldShowOnboarding(USER_ID, true, 0, 0, 1500)).toBe(false);
  });

  it('returns true for fresh user with no data', () => {
    expect(shouldShowOnboarding(USER_ID, true, 0, 0, null)).toBe(true);
  });

  it('resumes a started flow after setup data has been saved', () => {
    localStorage.setItem(`budgard_onboarding_started:${USER_ID}`, 'true');

    expect(shouldShowOnboarding(USER_ID, true, 0, 3, 1500)).toBe(true);
  });

  it('preserves the place of an expense-first flow already in progress', () => {
    localStorage.setItem(`budgard_onboarding_started:${USER_ID}`, 'true');
    localStorage.setItem(`budgard_onboarding_step:${USER_ID}`, '1');

    expect(readOnboardingStep(USER_ID)).toBe(2);
  });

  it('does not reuse another account onboarding state', () => {
    localStorage.setItem(`budgard_onboarded:${USER_ID}`, 'true');

    expect(shouldShowOnboarding('user-456', true, 0, 0, null)).toBe(true);
  });
});

// ─── OnboardingFlow ──────────────────────────────────────────────────────────

describe('OnboardingFlow', () => {
  it('renders the welcome step first', () => {
    renderFlow();
    expect(screen.getByText('onboarding.welcomeTitle')).toBeInTheDocument();
  });

  it('sets up useful categories before the first expense', () => {
    renderFlow();
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    expect(screen.getByText('onboarding.categoriesTitle')).toBeInTheDocument();
  });

  it('moves to the first expense when categories are deferred', () => {
    renderFlow();
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));

    expect(
      screen.getByText('onboarding.firstExpenseTitle'),
    ).toBeInTheDocument();
  });

  it('renders category buttons with translation keys', () => {
    renderFlow();
    fireEvent.click(screen.getByText('onboarding.getStarted'));

    expect(
      screen.getByText('onboarding.presetCategories.food'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('onboarding.presetCategories.housing'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('onboarding.presetCategories.utilities'),
    ).toBeInTheDocument();
  });

  it('toggles category selection on click', () => {
    renderFlow();
    fireEvent.click(screen.getByText('onboarding.getStarted'));

    const foodButton = screen
      .getByText('onboarding.presetCategories.food')
      .closest('button')!;

    fireEvent.click(foodButton);
    expect(foodButton.className).toContain('border-border/50');

    fireEvent.click(foodButton);
    expect(foodButton.className).toContain('border-primary-ink');
  });

  it('creates categories with translated names on continue', async () => {
    mockHandleCategoriesAddBulk.mockResolvedValue(undefined);

    renderFlow();
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.next'));

    await waitFor(() => {
      expect(mockHandleCategoriesAddBulk).toHaveBeenCalled();
    });

    const categories: {
      name: string;
      color: string;
      icon: string;
      user_id: string;
    }[] = mockHandleCategoriesAddBulk.mock.calls[0][0];
    const foodCategory = categories.find((c) => c.name.includes('food'));

    expect(foodCategory?.name).toBe('onboarding.presetCategories.food');
    expect(foodCategory?.color).toBe(swatch.mint);
    expect(foodCategory?.icon).toBe('🍔');
    expect(foodCategory?.user_id).toBe('user-123');
    expect(
      screen.getByText('onboarding.firstExpenseTitle'),
    ).toBeInTheDocument();
  });

  it('skips category creation when none selected', async () => {
    renderFlow();
    fireEvent.click(screen.getByText('onboarding.getStarted'));

    const categoryNames = ['food', 'housing', 'transport', 'entertainment'];
    for (const name of categoryNames) {
      const button = screen
        .getByText(`onboarding.presetCategories.${name}`)
        .closest('button')!;
      fireEvent.click(button);
    }

    fireEvent.click(screen.getByText('onboarding.next'));

    await waitFor(() => {
      expect(
        screen.getByText('onboarding.firstExpenseTitle'),
      ).toBeInTheDocument();
    });

    expect(mockHandleCategoriesAddBulk).not.toHaveBeenCalled();
  });

  it('does not complete onboarding when the first expense is deferred', () => {
    const onComplete = vi.fn();
    renderFlow(onComplete);

    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));
    fireEvent.click(screen.getByText('onboarding.exploreFirst'));

    expect(onComplete).not.toHaveBeenCalled();
    expect(localStorage.getItem(`budgard_onboarded:${USER_ID}`)).toBeNull();
  });

  it('saves the first expense after categories are available', () => {
    const onComplete = vi.fn();
    renderFlow(onComplete);
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));

    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'onboarding.saveFirstExpense' }),
    );

    expect(mockHandleExpenseFormSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 4, date: expect.any(String) }),
    );
    expect(screen.getByText('onboarding.budgetTitle')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('completes after the optional budget step is skipped', () => {
    const onComplete = vi.fn();
    renderFlow(onComplete);

    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));
    fireEvent.click(screen.getByText('onboarding.exploreFirst'));
    fireEvent.click(screen.getByText('onboarding.skip'));

    expect(localStorage.getItem(`budgard_onboarded:${USER_ID}`)).toBe('true');
    expect(onComplete).toHaveBeenCalled();
  });

  it('saves a budget and then completes onboarding', async () => {
    const onComplete = vi.fn();
    renderFlow(onComplete);
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));
    fireEvent.click(screen.getByText('onboarding.exploreFirst'));
    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'onboarding.budgetAmountLabel',
      }),
      { target: { value: '500' } },
    );
    fireEvent.click(screen.getByText('onboarding.next'));

    await waitFor(() => {
      expect(mockHandleBudgetUpdate).toHaveBeenCalledWith(500);
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('returns to the saved step when setup resumes', () => {
    localStorage.setItem(`budgard_onboarding_step:${USER_ID}`, '3');

    renderFlow();

    expect(screen.getByText('onboarding.budgetTitle')).toBeInTheDocument();
  });
});
