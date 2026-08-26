import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockToast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));

const data = vi.hoisted(() => ({ categories: [] as unknown[] }));
vi.mock('@/contexts/DataContext', () => ({
  useCategoriesData: () => ({ expenseCategories: data.categories }),
}));

const expenseOps = vi.hoisted(() => ({ handleBulkExpenseImport: vi.fn() }));
vi.mock('@/hooks/dataOps/useExpenseOps', () => ({
  useExpenseOps: () => expenseOps,
}));

const incomeOps = vi.hoisted(() => ({ handleBulkIncomeImport: vi.fn() }));
vi.mock('@/hooks/dataOps/useIncomeOps', () => ({
  useIncomeOps: () => incomeOps,
}));

import { useCsvImportFlow } from '@/hooks/expensesList/useCsvImportFlow';

// --- Fixtures ---

const CSV = [
  'Date,Description,Category,Amount',
  '2026-08-01,Coffee,Food,3.50',
  '2026-08-02,Tea,Unknown Cat,2.00',
].join('\n');

// `L` is QIF's category field — without it the file carries no taxonomy to
// reconcile and the unmatched-category assertions below would be vacuous.
const QIF = [
  '!Type:Bank',
  'D08/01/2026',
  'T-12.34',
  'PSupermarket',
  'LGroceries',
  '^',
].join('\n');

// Drives the flow the way the component does: through a file input event.
const dropFile = async (
  result: ReturnType<typeof render>,
  name: string,
  content: string,
) => {
  const file = new File([content], name, { type: 'text/plain' });
  await act(async () => {
    result.current.handleFileInput({
      target: { files: [file] },
    } as never);
  });
};

const onClose = vi.fn();
const render = () => renderHook(() => useCsvImportFlow(onClose)).result;

beforeEach(() => {
  vi.clearAllMocks();
  data.categories = [
    { id: 'c1', name: 'Food', type: 'expense' },
    { id: 'c2', name: 'Transport', type: 'expense' },
  ];
  expenseOps.handleBulkExpenseImport.mockResolvedValue(undefined);
  incomeOps.handleBulkIncomeImport.mockResolvedValue(undefined);
});

describe('accepting a file', () => {
  it('starts on the upload step', () => {
    expect(render().current.step).toBe('upload');
  });

  it('rejects a file type it cannot read', async () => {
    const r = render();

    await dropFile(r, 'photo.png', 'not a csv');

    expect(r.current.step).toBe('upload');
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('sends a CSV to the mapping step with a suggested mapping', async () => {
    const r = render();

    await dropFile(r, 'statement.csv', CSV);

    await waitFor(() => expect(r.current.step).toBe('mapping'));
    expect(r.current.csvPreview).not.toBeNull();
    // Headers are recognised rather than left at the defaults.
    expect(r.current.columnMapping.dateColumn).toBe(0);
    expect(r.current.columnMapping.descriptionColumn).toBe(1);
    expect(r.current.columnMapping.categoryColumn).toBe(2);
    expect(r.current.columnMapping.amountColumn).toBe(3);
  });

  it('skips mapping for a statement that describes its own fields', async () => {
    // OFX and QIF carry named fields, so there is nothing to map.
    const r = render();

    await dropFile(r, 'export.qif', QIF);

    await waitFor(() => expect(r.current.step).toBe('preview'));
    expect(r.current.validRows.length).toBeGreaterThan(0);
  });

  it('offers a statement own category names for mapping', async () => {
    // "Groceries" is the exporting app's taxonomy, not the user's (Food /
    // Transport), so it is surfaced for mapping rather than silently dropped.
    const r = render();

    await dropFile(r, 'export.qif', QIF);

    await waitFor(() => expect(r.current.step).toBe('preview'));
    expect(r.current.unmatchedCategories).toEqual(['Groceries']);
    expect(r.current.categoryMappings.get('Groceries')).toBeNull();
  });

  it('does not offer a statement category the user already has', async () => {
    const r = render();
    const matching = QIF.replace('LGroceries', 'LFood');

    await dropFile(r, 'export.qif', matching);

    await waitFor(() => expect(r.current.step).toBe('preview'));
    expect(r.current.unmatchedCategories).toEqual([]);
  });
});

describe('mapping to preview', () => {
  it('surfaces categories it could not match', async () => {
    const r = render();
    await dropFile(r, 'statement.csv', CSV);
    await waitFor(() => expect(r.current.step).toBe('mapping'));

    act(() => r.current.handleProceedToPreview());

    expect(r.current.step).toBe('preview');
    expect(r.current.unmatchedCategories).toContain('Unknown Cat');
    // Unmatched categories start as "skip" until the user picks one.
    expect(r.current.categoryMappings.get('Unknown Cat')).toBeNull();
  });

  it('lets the user assign an unmatched category', async () => {
    const r = render();
    await dropFile(r, 'statement.csv', CSV);
    await waitFor(() => expect(r.current.step).toBe('mapping'));
    act(() => r.current.handleProceedToPreview());

    act(() => r.current.handleCategoryMapping('Unknown Cat', 'c2'));

    expect(r.current.categoryMappings.get('Unknown Cat')).toBe('c2');
  });

  it('updates one mapped column without disturbing the others', async () => {
    const r = render();
    await dropFile(r, 'statement.csv', CSV);
    await waitFor(() => expect(r.current.step).toBe('mapping'));

    act(() => r.current.updateColumnMapping('amountColumn', 2));

    expect(r.current.columnMapping.amountColumn).toBe(2);
    expect(r.current.columnMapping.dateColumn).toBe(0);
  });
});

describe('importing', () => {
  const reachPreview = async () => {
    const r = render();
    await dropFile(r, 'statement.csv', CSV);
    await waitFor(() => expect(r.current.step).toBe('mapping'));
    act(() => r.current.handleProceedToPreview());

    return r;
  };

  it('writes the rows and closes on success', async () => {
    const r = await reachPreview();

    await act(async () => {
      await r.current.handleImport();
    });

    expect(expenseOps.handleBulkExpenseImport).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.any(String) }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('returns to preview with an error rather than closing on failure', async () => {
    // Closing would throw away everything the user just mapped.
    expenseOps.handleBulkExpenseImport.mockRejectedValue(new Error('down'));
    const r = await reachPreview();

    await act(async () => {
      await r.current.handleImport();
    });

    expect(r.current.step).toBe('preview');
    expect(r.current.importError).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call the income import when there is nothing to import', async () => {
    const r = await reachPreview();

    await act(async () => {
      await r.current.handleImport();
    });

    expect(incomeOps.handleBulkIncomeImport).not.toHaveBeenCalled();
  });

  it('clears the error when going back to mapping', async () => {
    expenseOps.handleBulkExpenseImport.mockRejectedValue(new Error('down'));
    const r = await reachPreview();
    await act(async () => {
      await r.current.handleImport();
    });
    expect(r.current.importError).toBeTruthy();

    act(() => r.current.handleBackToMapping());

    expect(r.current.importError).toBeNull();
    expect(r.current.step).toBe('mapping');
  });
});

describe('closing', () => {
  it('resets everything so the next open starts clean', async () => {
    const r = render();
    await dropFile(r, 'statement.csv', CSV);
    await waitFor(() => expect(r.current.step).toBe('mapping'));

    act(() => r.current.handleClose());

    expect(r.current.step).toBe('upload');
    expect(r.current.csvPreview).toBeNull();
    expect(r.current.validRows).toEqual([]);
    expect(r.current.unmatchedCategories).toEqual([]);
    expect(onClose).toHaveBeenCalled();
  });
});
