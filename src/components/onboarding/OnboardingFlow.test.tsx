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
const mockSetMonthlyBudget = vi.fn();
const mockSetCategories = vi.fn();
vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({
    setMonthlyBudget: mockSetMonthlyBudget,
    setCategories: mockSetCategories,
  }),
}));

// Mock dataService
const mockCreateCategory = vi.fn();
const mockUpsertBudget = vi.fn();
vi.mock('@/services/dataService', () => ({
  dataService: {
    createCategory: (...args: unknown[]) => mockCreateCategory(...args),
    upsertBudget: (...args: unknown[]) => mockUpsertBudget(...args),
  },
}));

beforeEach(() => {
  localStorage.clear();
  mockCreateCategory.mockReset();
  mockUpsertBudget.mockReset();
  mockSetMonthlyBudget.mockReset();
  mockSetCategories.mockReset();
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
  it('renders the budget step first', () => {
    render(<OnboardingFlow isOpen onComplete={vi.fn()} />);
    expect(screen.getByText('onboarding.budgetTitle')).toBeInTheDocument();
  });

  it('navigates to categories step when skipping budget', () => {
    render(<OnboardingFlow isOpen onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText('onboarding.skip'));
    expect(screen.getByText('onboarding.categoriesTitle')).toBeInTheDocument();
  });

  it('renders category buttons with translation keys', () => {
    render(<OnboardingFlow isOpen onComplete={vi.fn()} />);
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
    const mockCategory = {
      id: 'cat-1',
      name: 'onboarding.presetCategories.food',
      color: '#22c55e',
      icon: '🍔',
    };
    mockCreateCategory.mockResolvedValue(mockCategory);

    render(<OnboardingFlow isOpen onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText('onboarding.skip'));

    fireEvent.click(screen.getByText('onboarding.next'));

    await waitFor(() => {
      expect(mockCreateCategory).toHaveBeenCalled();
    });

    // Verify translated name key is passed (mock t() returns the key as-is)
    const firstCall = mockCreateCategory.mock.calls[0][0];
    expect(firstCall.name).toBe('onboarding.presetCategories.food');
    expect(firstCall.color).toBe('#22c55e');
    expect(firstCall.icon).toBe('🍔');
    expect(firstCall.user_id).toBe('user-123');
  });

  it('skips category creation when none selected', async () => {
    render(<OnboardingFlow isOpen onComplete={vi.fn()} />);
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
      expect(screen.getByText('onboarding.doneTitle')).toBeInTheDocument();
    });

    expect(mockCreateCategory).not.toHaveBeenCalled();
  });

  it('sets onboarded flag and calls onComplete on final step', () => {
    const onComplete = vi.fn();
    render(<OnboardingFlow isOpen onComplete={onComplete} />);

    // Skip to categories
    fireEvent.click(screen.getByText('onboarding.skip'));
    // Skip to done
    fireEvent.click(screen.getByText('onboarding.skip'));

    // Click start tracking
    fireEvent.click(screen.getByText('onboarding.startTracking'));

    expect(localStorage.getItem('budgard_onboarded')).toBe('true');
    expect(onComplete).toHaveBeenCalled();
  });
});
