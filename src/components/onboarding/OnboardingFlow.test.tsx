import { describe, it, expect, vi, beforeEach } from 'vitest';
import { swatch } from '@/design/palette';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { shouldShowOnboarding } from '@/lib/onboarding';

// Mock useAuth
const mockSession = {
  user: { id: 'user-123' },
};
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: mockSession }),
}));

// Mock useData
vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({ defaultCurrency: 'EUR' }),
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
vi.mock('@/contexts/QuickAddContext', () => ({
  useQuickAdd: () => ({
    handleExpenseFormSubmit: mockHandleExpenseFormSubmit,
  }),
}));

const mockHandleBudgetUpdate = vi.fn();
const mockHandleCategoriesAddBulk = vi.fn();
vi.mock('@/hooks/dataOps/useBudgetOps', () => ({
  useBudgetOps: () => ({
    handleBudgetUpdate: mockHandleBudgetUpdate,
    handleCategoryBudgetUpsert: vi.fn(),
    handleCategoryBudgetDelete: vi.fn(),
  }),
}));
vi.mock('@/hooks/dataOps/useCategoryOps', () => ({
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
    expect(shouldShowOnboarding(false, 0, 0, null)).toBe(false);
  });

  it('returns false when already onboarded', () => {
    localStorage.setItem('budgard_onboarded', 'true');
    expect(shouldShowOnboarding(true, 0, 0, null)).toBe(false);
  });

  it('returns false when user has expenses', () => {
    expect(shouldShowOnboarding(true, 5, 0, null)).toBe(false);
  });

  it('returns false when user has categories', () => {
    expect(shouldShowOnboarding(true, 0, 3, null)).toBe(false);
  });

  it('returns false when user has a budget', () => {
    expect(shouldShowOnboarding(true, 0, 0, 1500)).toBe(false);
  });

  it('returns true for fresh user with no data', () => {
    expect(shouldShowOnboarding(true, 0, 0, null)).toBe(true);
  });

  it('resumes a started flow after setup data has been saved', () => {
    localStorage.setItem('budgard_onboarding_started', 'true');

    expect(shouldShowOnboarding(true, 0, 3, 1500)).toBe(true);
  });
});

// ─── OnboardingFlow ──────────────────────────────────────────────────────────

describe('OnboardingFlow', () => {
  it('renders the welcome step first', () => {
    renderFlow();
    expect(screen.getByText('onboarding.welcomeTitle')).toBeInTheDocument();
  });

  it('navigates to budget step from welcome', () => {
    renderFlow();
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    expect(screen.getByText('onboarding.budgetTitle')).toBeInTheDocument();
  });

  it('navigates to categories step when skipping budget', () => {
    renderFlow();
    // Welcome -> Budget
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    // Budget -> Categories (skip)
    fireEvent.click(screen.getByText('onboarding.skip'));
    expect(screen.getByText('onboarding.categoriesTitle')).toBeInTheDocument();
  });

  it('renders category buttons with translation keys', () => {
    renderFlow();
    // Welcome -> Budget -> Categories
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));

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
    // Welcome -> Budget -> Categories
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));

    const foodButton = screen
      .getByText('onboarding.presetCategories.food')
      .closest('button')!;

    // Food is selected by default (index 0) — deselect it
    fireEvent.click(foodButton);
    expect(foodButton.className).toContain('border-border/50');

    // Select it again
    fireEvent.click(foodButton);
    expect(foodButton.className).toContain('border-primary-ink');
  });

  it('creates categories with translated names on continue', async () => {
    mockHandleCategoriesAddBulk.mockResolvedValue(undefined);

    renderFlow();
    // Welcome -> Budget -> Categories
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));
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
  });

  it('skips category creation when none selected', async () => {
    renderFlow();
    // Welcome -> Budget -> Categories
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));

    // Deselect the 4 default-selected categories (indices 0-3)
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

  it('asks for a real expense on the final step', () => {
    renderFlow();
    // Welcome -> Budget -> Categories -> First expense
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));
    fireEvent.click(screen.getByText('onboarding.skip'));

    expect(
      screen.getByText('onboarding.firstExpenseTitle'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'onboarding.saveFirstExpense' }),
    ).toBeDisabled();
  });

  it('sets onboarded flag when the first expense is deferred', () => {
    const onComplete = vi.fn();
    renderFlow(onComplete);

    // Welcome -> Budget -> Categories -> First expense
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));
    fireEvent.click(screen.getByText('onboarding.skip'));

    fireEvent.click(screen.getByText('onboarding.exploreFirst'));

    expect(localStorage.getItem('budgard_onboarded')).toBe('true');
    expect(onComplete).toHaveBeenCalled();
  });

  it('saves the first expense before revealing Today', () => {
    const onComplete = vi.fn();
    renderFlow(onComplete);
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));
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
    expect(localStorage.getItem('budgard_onboarded')).toBe('true');
    expect(onComplete).toHaveBeenCalled();
  });

  it('returns to the saved step when setup resumes', () => {
    localStorage.setItem('budgard_onboarding_step', '3');

    renderFlow();

    expect(
      screen.getByText('onboarding.firstExpenseTitle'),
    ).toBeInTheDocument();
  });
});
