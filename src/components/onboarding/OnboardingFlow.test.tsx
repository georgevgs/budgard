import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingFlow, shouldShowOnboarding } from './OnboardingFlow';

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
  useDataConfig: () => ({
    isInitialized: true,
    monthlyBudget: null,
    defaultCurrency: 'EUR',
    defaultSavingsPct: null,
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
});

// ─── shouldShowOnboarding ────────────────────────────────────────────────────

describe('shouldShowOnboarding', () => {
  it('returns false when not initialized', () => {
    expect(shouldShowOnboarding(false, false, 0, 0, null)).toBe(false);
  });

  it('returns false when loading', () => {
    expect(shouldShowOnboarding(true, true, 0, 0, null)).toBe(false);
  });

  it('returns false when already onboarded', () => {
    localStorage.setItem('budgard_onboarded', 'true');
    expect(shouldShowOnboarding(true, false, 0, 0, null)).toBe(false);
  });

  it('returns false when user has expenses', () => {
    expect(shouldShowOnboarding(true, false, 5, 0, null)).toBe(false);
  });

  it('returns false when user has categories', () => {
    expect(shouldShowOnboarding(true, false, 0, 3, null)).toBe(false);
  });

  it('returns false when user has a budget', () => {
    expect(shouldShowOnboarding(true, false, 0, 0, 1500)).toBe(false);
  });

  it('returns true for fresh user with no data', () => {
    expect(shouldShowOnboarding(true, false, 0, 0, null)).toBe(true);
  });
});

// ─── OnboardingFlow ──────────────────────────────────────────────────────────

describe('OnboardingFlow', () => {
  it('renders the welcome step first', () => {
    render(<OnboardingFlow isOpen onComplete={vi.fn()} />);
    expect(screen.getByText('onboarding.welcomeTitle')).toBeInTheDocument();
  });

  it('navigates to budget step from welcome', () => {
    render(<OnboardingFlow isOpen onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    expect(screen.getByText('onboarding.budgetTitle')).toBeInTheDocument();
  });

  it('navigates to categories step when skipping budget', () => {
    render(<OnboardingFlow isOpen onComplete={vi.fn()} />);
    // Welcome -> Budget
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    // Budget -> Categories (skip)
    fireEvent.click(screen.getByText('onboarding.skip'));
    expect(screen.getByText('onboarding.categoriesTitle')).toBeInTheDocument();
  });

  it('renders category buttons with translation keys', () => {
    render(<OnboardingFlow isOpen onComplete={vi.fn()} />);
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
    render(<OnboardingFlow isOpen onComplete={vi.fn()} />);
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
    expect(foodButton.className).toContain('border-primary');
  });

  it('creates categories with translated names on continue', async () => {
    mockHandleCategoriesAddBulk.mockResolvedValue(undefined);

    render(<OnboardingFlow isOpen onComplete={vi.fn()} />);
    // Welcome -> Budget -> Categories
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));
    fireEvent.click(screen.getByText('onboarding.next'));

    await waitFor(() => {
      expect(mockHandleCategoriesAddBulk).toHaveBeenCalled();
    });

    const categories: { name: string; color: string; icon: string; user_id: string }[] =
      mockHandleCategoriesAddBulk.mock.calls[0][0];
    const foodCategory = categories.find((c) => c.name.includes('food'));

    expect(foodCategory?.name).toBe('onboarding.presetCategories.food');
    expect(foodCategory?.color).toBe('#22c55e');
    expect(foodCategory?.icon).toBe('🍔');
    expect(foodCategory?.user_id).toBe('user-123');
  });

  it('skips category creation when none selected', async () => {
    render(<OnboardingFlow isOpen onComplete={vi.fn()} />);
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
      expect(screen.getByText('onboarding.featuresTitle')).toBeInTheDocument();
    });

    expect(mockHandleCategoriesAddBulk).not.toHaveBeenCalled();
  });

  it('shows feature highlights on the final step', () => {
    render(<OnboardingFlow isOpen onComplete={vi.fn()} />);
    // Welcome -> Budget -> Categories -> Features
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));
    fireEvent.click(screen.getByText('onboarding.skip'));

    expect(screen.getByText('onboarding.featuresTitle')).toBeInTheDocument();
    expect(screen.getByText('onboarding.featureExpenses')).toBeInTheDocument();
    expect(screen.getByText('onboarding.featureRecurring')).toBeInTheDocument();
    expect(screen.getByText('onboarding.featureAnalytics')).toBeInTheDocument();
    expect(screen.getByText('onboarding.featureReceipts')).toBeInTheDocument();
  });

  it('sets onboarded flag and calls onComplete on final step', () => {
    const onComplete = vi.fn();
    render(<OnboardingFlow isOpen onComplete={onComplete} />);

    // Welcome -> Budget -> Categories -> Features
    fireEvent.click(screen.getByText('onboarding.getStarted'));
    fireEvent.click(screen.getByText('onboarding.skip'));
    fireEvent.click(screen.getByText('onboarding.skip'));

    // Click start tracking
    fireEvent.click(screen.getByText('onboarding.startTracking'));

    expect(localStorage.getItem('budgard_onboarded')).toBe('true');
    expect(onComplete).toHaveBeenCalled();
  });
});
