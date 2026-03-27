import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadExpensesAsCSV } from './csvExport';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

const categories: Category[] = [
  {
    id: 'cat-1',
    name: 'Food',
    color: '#FF0000',
    user_id: 'u1',
    created_at: '',
  },
  {
    id: 'cat-2',
    name: 'Transport',
    color: '#00FF00',
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
