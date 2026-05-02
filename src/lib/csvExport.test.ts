import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildCategorySummaryCsv,
  buildCsv,
  buildTransactionsCsv,
  downloadExpensesAsCSV,
} from './csvExport';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import type { Tag } from '@/types/Tag';

const t = (key: string) => key;

const categories: Category[] = [
  {
    id: 'cat-1',
    name: 'Food',
    color: '#FF0000',
    icon: null,
    user_id: 'u1',
    created_at: '',
  },
  {
    id: 'cat-2',
    name: 'Transport',
    color: '#00FF00',
    icon: null,
    user_id: 'u1',
    created_at: '',
  },
];

const expenses: Expense[] = [
  {
    id: '1',
    amount: 3.5,
    description: 'Coffee',
    date: '2026-01-15',
    category_id: 'cat-1',
    user_id: 'u1',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '2',
    amount: 25,
    description: 'Bus pass',
    date: '2026-01-16',
    category_id: 'cat-2',
    user_id: 'u1',
    created_at: '2026-01-16T10:00:00Z',
  },
  {
    id: '3',
    amount: 100,
    description: 'No category',
    date: '2026-01-17',
    category_id: null,
    user_id: 'u1',
    created_at: '2026-01-17T10:00:00Z',
  },
];

describe('downloadExpensesAsCSV', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let capturedBlob: Blob | undefined;
  let clickedLink: HTMLAnchorElement | null;

  beforeEach(() => {
    capturedBlob = undefined;
    clickedLink = null;
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation((blob: Blob | MediaSource) => {
        capturedBlob = blob as Blob;
        return 'blob:test';
      });
    revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation((node) => {
        clickedLink = node as HTMLAnchorElement;
        return node;
      });
    removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation((node) => node);
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('creates a CSV blob and triggers download with correct filename', () => {
    downloadExpensesAsCSV({ expenses, categories, selectedMonth: '2026-01' });

    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(clickedLink?.getAttribute('download')).toBe(
      'expenses_January_2026.csv',
    );
  });

  it('does nothing when expenses array is empty', () => {
    downloadExpensesAsCSV({
      expenses: [],
      categories,
      selectedMonth: '2026-01',
    });
    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });

  it('generates CSV with correct mime type', () => {
    downloadExpensesAsCSV({
      expenses: [expenses[0]],
      categories,
      selectedMonth: '2026-01',
    });
    expect(capturedBlob).toBeDefined();
    expect(capturedBlob!.type).toBe('text/csv;charset=utf-8;');
  });

  it('revokes object URL after download', () => {
    downloadExpensesAsCSV({ expenses, categories, selectedMonth: '2026-01' });
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test');
  });
});

describe('buildCsv', () => {
  it('joins headers and rows with CRLF', () => {
    const csv = buildCsv(['A', 'B'], [
      ['1', '2'],
      ['3', '4'],
    ]);

    expect(csv).toBe('A,B\r\n1,2\r\n3,4');
  });

  it('escapes commas, quotes and newlines by wrapping in quotes', () => {
    const csv = buildCsv(['x'], [['a,b'], ['he said "hi"'], ['line1\nline2']]);
    const lines = csv.split('\r\n');

    expect(lines[1]).toBe('"a,b"');
    expect(lines[2]).toBe('"he said ""hi"""');
    expect(lines[3]).toBe('"line1\nline2"');
  });

  it('renders null and undefined cells as empty strings', () => {
    const csv = buildCsv(['x', 'y'], [[null, undefined]]);

    expect(csv).toBe('x,y\r\n,');
  });
});

describe('buildTransactionsCsv', () => {
  const tags: Tag[] = [
    { id: 'tag-1', name: 'Work', color: '#000', user_id: 'u1', created_at: '' },
  ];

  const transactions: Expense[] = [
    {
      id: 't1',
      amount: 1200,
      description: 'Salary',
      date: '2025-03-01',
      category_id: 'cat-1',
      user_id: 'u1',
      created_at: '',
      type: 'income',
    },
    {
      id: 't2',
      amount: 3.5,
      description: 'Coffee, Lavazza',
      date: '2025-03-02',
      category_id: 'cat-1',
      tag_id: 'tag-1',
      user_id: 'u1',
      created_at: '',
      type: 'expense',
    },
    {
      id: 't3',
      amount: 10,
      description: 'No category',
      date: '2025-03-03',
      category_id: null,
      user_id: 'u1',
      created_at: '',
      type: 'expense',
    },
  ];

  it('produces a header row plus one row per transaction', () => {
    const csv = buildTransactionsCsv(transactions, categories, tags, t);
    const lines = csv.split('\r\n');

    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe(
      'annualExport.csv.date,annualExport.csv.type,annualExport.csv.amount,annualExport.csv.category,annualExport.csv.description,annualExport.csv.tag',
    );
  });

  it('uses positive amount for income and negative for expense', () => {
    const csv = buildTransactionsCsv(transactions, categories, tags, t);
    const [, income, expense] = csv.split('\r\n');

    expect(income).toContain('1200.00');
    expect(income).not.toContain('-1200');
    expect(expense).toContain('-3.50');
  });

  it('looks up category and tag names by id, leaves blank when missing', () => {
    const csv = buildTransactionsCsv(transactions, categories, tags, t);
    const lines = csv.split('\r\n');

    expect(lines[1]).toContain('Food');
    expect(lines[2]).toContain('Work');
    // Third transaction: no category, no tag → trailing empties
    expect(lines[3]).toMatch(/,No category,$/);
  });

  it('escapes descriptions with commas', () => {
    const csv = buildTransactionsCsv(transactions, categories, tags, t);

    expect(csv).toContain('"Coffee, Lavazza"');
  });
});

describe('buildCategorySummaryCsv', () => {
  const transactions: Expense[] = [
    {
      id: 'i1',
      amount: 1000,
      description: 'Salary',
      date: '2025-01-01',
      category_id: 'cat-1',
      user_id: 'u1',
      created_at: '',
      type: 'income',
    },
    {
      id: 'i2',
      amount: 500,
      description: 'Side gig',
      date: '2025-01-02',
      category_id: 'cat-1',
      user_id: 'u1',
      created_at: '',
      type: 'income',
    },
    {
      id: 'e1',
      amount: 30,
      description: 'Lunch',
      date: '2025-01-03',
      category_id: 'cat-1',
      user_id: 'u1',
      created_at: '',
      type: 'expense',
    },
    {
      id: 'e2',
      amount: 100,
      description: 'Bus',
      date: '2025-01-04',
      category_id: 'cat-2',
      user_id: 'u1',
      created_at: '',
      type: 'expense',
    },
    {
      id: 'e3',
      amount: 5,
      description: 'Snack',
      date: '2025-01-05',
      category_id: null,
      user_id: 'u1',
      created_at: '',
      type: 'expense',
    },
  ];

  it('aggregates totals and counts by type + category', () => {
    const csv = buildCategorySummaryCsv(transactions, categories, t);
    const lines = csv.split('\r\n').slice(1);

    const incomeRow = lines.find(
      (l) => l.startsWith('annualExport.csv.income,Food'),
    );
    expect(incomeRow).toBe('annualExport.csv.income,Food,1500.00,2');
  });

  it('sorts income rows before expense rows, then by total descending', () => {
    const csv = buildCategorySummaryCsv(transactions, categories, t);
    const types = csv
      .split('\r\n')
      .slice(1)
      .map((l) => l.split(',')[0]);

    const firstExpenseIdx = types.indexOf('annualExport.csv.expense');
    const lastIncomeIdx = types.lastIndexOf('annualExport.csv.income');
    expect(lastIncomeIdx).toBeLessThan(firstExpenseIdx);

    // Within expenses, Transport (100) should come before Food (30)
    const expenseRows = csv
      .split('\r\n')
      .slice(1)
      .filter((l) => l.startsWith('annualExport.csv.expense,'));
    expect(expenseRows[0]).toContain('Transport');
    expect(expenseRows[1]).toContain('Food');
  });

  it('uses the uncategorized label when category is missing', () => {
    const csv = buildCategorySummaryCsv(transactions, categories, t);

    expect(csv).toContain('annualExport.csv.uncategorized');
  });
});
