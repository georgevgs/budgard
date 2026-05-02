import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import type { Tag } from '@/types/Tag';

const toastFn = vi.fn();

const dataState: {
  expenses: Expense[];
  incomes: Expense[];
  categories: Category[];
  tags: Tag[];
} = {
  expenses: [],
  incomes: [],
  categories: [],
  tags: [],
};

vi.mock('@/contexts/DataContext', () => ({
  useData: () => dataState,
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: toastFn }),
}));

import AnnualExportCard from './AnnualExportCard';

const category: Category = {
  id: 'cat-1',
  name: 'Food',
  color: '#FF0000',
  icon: null,
  user_id: 'u1',
  created_at: '',
};

const expense2025: Expense = {
  id: 'e1',
  amount: 12,
  description: 'Lunch',
  date: '2025-06-15',
  category_id: 'cat-1',
  user_id: 'u1',
  created_at: '',
  type: 'expense',
};

const income2025: Expense = {
  id: 'i1',
  amount: 1500,
  description: 'Salary',
  date: '2025-06-01',
  category_id: null,
  user_id: 'u1',
  created_at: '',
  type: 'income',
};

const expense2024: Expense = {
  ...expense2025,
  id: 'e2',
  date: '2024-06-15',
};

describe('AnnualExportCard', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let lastFilename: string | null;

  beforeEach(() => {
    lastFilename = null;
    dataState.expenses = [];
    dataState.incomes = [];
    dataState.categories = [category];
    dataState.tags = [];
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        lastFilename = this.getAttribute('download');
      });
  });

  afterEach(() => {
    createObjectURLSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('renders nothing when there are no transactions for the year', () => {
    dataState.expenses = [expense2024];
    const { container } = render(<AnnualExportCard selectedYear={2025} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders title, transaction count and both export buttons when populated', () => {
    dataState.expenses = [expense2025];
    dataState.incomes = [income2025];

    render(<AnnualExportCard selectedYear={2025} />);

    expect(screen.getByText(/annualExport\.title/)).toBeInTheDocument();
    expect(screen.getByText(/annualExport\.transactionCount/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /annualExport\.exportTransactions/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /annualExport\.exportSummary/ }),
    ).toBeInTheDocument();
  });

  it('downloads transactions CSV with year-stamped filename and shows toast', () => {
    dataState.expenses = [expense2025];
    dataState.incomes = [income2025];

    render(<AnnualExportCard selectedYear={2025} />);

    fireEvent.click(
      screen.getByRole('button', { name: /annualExport\.exportTransactions/ }),
    );

    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(lastFilename).toBe('budgard-2025-transactions.csv');
    expect(toastFn).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/annualExport\.exportedTitle/),
      }),
    );
  });

  it('downloads category summary CSV with year-stamped filename', () => {
    dataState.expenses = [expense2025];
    dataState.incomes = [income2025];

    render(<AnnualExportCard selectedYear={2025} />);

    fireEvent.click(
      screen.getByRole('button', { name: /annualExport\.exportSummary/ }),
    );

    expect(lastFilename).toBe('budgard-2025-summary.csv');
  });
});
