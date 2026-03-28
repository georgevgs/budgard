import { describe, it, expect } from 'vitest';
import {
  getCsvPreviewData,
  suggestColumnMapping,
  parseExpensesCsv,
  mapRowsToExpenses,
} from './csvImport';
import type { Category } from '@/types/Category';

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

// --- getCsvPreviewData ---

describe('getCsvPreviewData', () => {
  it('detects comma delimiter', () => {
    const csv = 'Date,Description,Amount\n2026-01-01,Coffee,3.50';
    const preview = getCsvPreviewData(csv);
    expect(preview.delimiter).toBe(',');
  });

  it('detects semicolon delimiter', () => {
    const csv = 'Date;Description;Amount\n2026-01-01;Coffee;3,50';
    const preview = getCsvPreviewData(csv);
    expect(preview.delimiter).toBe(';');
  });

  it('extracts headers from first row', () => {
    const csv = 'Date,Description,Category,Amount\n2026-01-01,Test,Food,10';
    const preview = getCsvPreviewData(csv);
    expect(preview.headers).toEqual([
      'Date',
      'Description',
      'Category',
      'Amount',
    ]);
  });

  it('returns up to 5 sample rows', () => {
    const rows = Array.from(
      { length: 10 },
      (_, i) => `2026-01-0${i + 1},Item ${i},${i * 10}`,
    );
    const csv = 'Date,Description,Amount\n' + rows.join('\n');
    const preview = getCsvPreviewData(csv);
    expect(preview.sampleRows).toHaveLength(5);
  });

  it('counts total data rows excluding header', () => {
    const csv = 'Date,Description,Amount\n2026-01-01,A,10\n2026-01-02,B,20';
    const preview = getCsvPreviewData(csv);
    expect(preview.totalRows).toBe(2);
  });

  it('detects negative amounts in bank statements', () => {
    const csv = 'Date,Description,Amount\n2026-01-01,Coffee,-3.50';
    expect(getCsvPreviewData(csv).hasNegativeAmounts).toBe(true);
  });

  it('reports no negative amounts for normal CSVs', () => {
    const csv = 'Date,Description,Amount\n2026-01-01,Coffee,3.50';
    expect(getCsvPreviewData(csv).hasNegativeAmounts).toBe(false);
  });
});

// --- suggestColumnMapping ---

describe('suggestColumnMapping', () => {
  it('maps English headers correctly', () => {
    const preview = getCsvPreviewData(
      'Date,Description,Category,Amount\n2026-01-01,Coffee,Food,3.50',
    );
    const mapping = suggestColumnMapping(preview);
    expect(mapping.dateColumn).toBe(0);
    expect(mapping.descriptionColumn).toBe(1);
    expect(mapping.categoryColumn).toBe(2);
    expect(mapping.amountColumn).toBe(3);
  });

  it('maps Greek headers', () => {
    const preview = getCsvPreviewData(
      'ΗΜ/ΝΙΑ;ΠΕΡΙΓΡΑΦΗ;ΠΟΣΟ\n01/01/2026;Καφές;3,50',
    );
    const mapping = suggestColumnMapping(preview);
    expect(mapping.dateColumn).toBe(0);
    expect(mapping.descriptionColumn).toBe(1);
    expect(mapping.amountColumn).toBe(2);
  });

  it('detects category column from repeated short values', () => {
    const csv = [
      'Date,Details,Type,Amount',
      '2026-01-01,Coffee,Food,3.50',
      '2026-01-02,Bus,Food,2.00',
      '2026-01-03,Lunch,Food,8.00',
    ].join('\n');
    const preview = getCsvPreviewData(csv);
    const mapping = suggestColumnMapping(preview);
    // "Type" column has repeated "Food" values — should be detected as category
    expect(mapping.categoryColumn).toBe(2);
  });
});

// --- parseExpensesCsv ---

describe('parseExpensesCsv', () => {
  const mapping = {
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 3,
    categoryColumn: 2,
  };

  it('parses valid rows', () => {
    const csv = 'Date,Description,Category,Amount\n2026-01-15,Coffee,Food,3.50';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].description).toBe('Coffee');
    expect(result.validRows[0].amount).toBe(3.5);
    expect(result.validRows[0].date).toBe('2026-01-15');
  });

  it('parses European date format dd/MM/yyyy', () => {
    const csv = 'Date,Description,Category,Amount\n15/01/2026,Coffee,Food,3.50';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.validRows[0].date).toBe('2026-01-15');
  });

  it('parses European amount format with comma decimal', () => {
    const csv = 'Date;Description;Category;Amount\n2026-01-15;Coffee;Food;3,50';
    const result = parseExpensesCsv(csv, categories, {
      ...mapping,
    });
    expect(result.validRows[0].amount).toBe(3.5);
  });

  it('reports error for invalid date', () => {
    const csv = 'Date,Description,Category,Amount\nbad-date,Coffee,Food,3.50';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('date');
  });

  it('reports error for missing description', () => {
    const csv = 'Date,Description,Category,Amount\n2026-01-15,,Food,3.50';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.errors[0].field).toBe('description');
  });

  it('reports error for description over 100 characters', () => {
    const longDesc = 'a'.repeat(101);
    const csv = `Date,Description,Category,Amount\n2026-01-15,${longDesc},Food,3.50`;
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.errors[0].field).toBe('description');
  });

  it('reports error for invalid amount', () => {
    const csv = 'Date,Description,Category,Amount\n2026-01-15,Coffee,Food,abc';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.errors[0].field).toBe('amount');
  });

  it('reports error for amount over 1 million', () => {
    const csv =
      'Date,Description,Category,Amount\n2026-01-15,Coffee,Food,1000001';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.errors[0].field).toBe('amount');
  });

  it('tracks unmatched categories', () => {
    const csv =
      'Date,Description,Category,Amount\n2026-01-15,Coffee,Unknown,3.50';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.unmatchedCategories).toContain('Unknown');
  });

  it('treats empty category as uncategorized', () => {
    const csv = 'Date,Description,Category,Amount\n2026-01-15,Coffee,,3.50';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.validRows[0].categoryName).toBe('');
    expect(result.unmatchedCategories).toHaveLength(0);
  });

  it('skips income transactions in bank statement mode', () => {
    const csv =
      'Date,Description,Category,Amount\n2026-01-15,Salary,Food,+500.00';
    const result = parseExpensesCsv(csv, categories, mapping, true, false);
    // With treatPositiveAsIncome=false, explicit + is income
    expect(result.skippedIncomeCount).toBe(1);
    expect(result.validRows).toHaveLength(0);
  });

  it('treats negative amounts as expenses in bank statement mode', () => {
    const csv =
      'Date,Description,Category,Amount\n2026-01-15,Coffee,Food,-3.50';
    const result = parseExpensesCsv(csv, categories, mapping, true, true);
    expect(result.validRows[0].amount).toBe(3.5);
  });

  it('skips positive amounts as income in bank statement mode', () => {
    const csv =
      'Date,Description,Category,Amount\n2026-01-15,Salary,Food,500.00';
    const result = parseExpensesCsv(csv, categories, mapping, true, true);
    expect(result.skippedIncomeCount).toBe(1);
  });

  it('skips empty lines', () => {
    const csv =
      'Date,Description,Category,Amount\n\n2026-01-15,Coffee,Food,3.50\n\n';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.validRows).toHaveLength(1);
  });

  it('handles quoted CSV fields with commas', () => {
    const csv =
      'Date,Description,Category,Amount\n2026-01-15,"Coffee, large",Food,5.00';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.validRows[0].description).toBe('Coffee, large');
  });

  it('reports error for rows with too few columns', () => {
    const csv = 'Date,Description,Category,Amount\n2026-01-15,Coffee';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.errors[0].field).toBe('row');
  });

  it('parses US format amounts with comma thousands', () => {
    const csv =
      'Date,Description,Category,Amount\n2026-01-15,Rent,Food,"1,234.56"';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.validRows[0].amount).toBe(1234.56);
  });

  it('parses European format amounts with dot thousands', () => {
    const csv =
      'Date;Description;Category;Amount\n2026-01-15;Rent;Food;1.234,56';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.validRows[0].amount).toBe(1234.56);
  });

  it('strips currency symbols from amounts', () => {
    const csv =
      'Date,Description,Category,Amount\n2026-01-15,Coffee,Food,€3.50';
    const result = parseExpensesCsv(csv, categories, mapping);
    expect(result.validRows[0].amount).toBe(3.5);
  });
});

// --- mapRowsToExpenses ---

describe('mapRowsToExpenses', () => {
  it('maps rows to expense objects with category lookup', () => {
    const rows = [
      {
        date: '2026-01-15',
        description: 'Coffee',
        categoryName: 'Food',
        amount: 3.5,
        rowNumber: 2,
      },
    ];
    const result = mapRowsToExpenses(rows, categories, new Map());
    expect(result[0].category_id).toBe('cat-1');
    expect(result[0].amount).toBe(3.5);
  });

  it('uses manual category mapping over auto-lookup', () => {
    const rows = [
      {
        date: '2026-01-15',
        description: 'Coffee',
        categoryName: 'Drinks',
        amount: 3.5,
        rowNumber: 2,
      },
    ];
    const manualMap = new Map([['Drinks', 'cat-1']]);
    const result = mapRowsToExpenses(rows, categories, manualMap);
    expect(result[0].category_id).toBe('cat-1');
  });

  it('returns null category_id for unmatched categories', () => {
    const rows = [
      {
        date: '2026-01-15',
        description: 'Coffee',
        categoryName: 'Unknown',
        amount: 3.5,
        rowNumber: 2,
      },
    ];
    const result = mapRowsToExpenses(rows, categories, new Map());
    expect(result[0].category_id).toBeNull();
  });

  it('returns null category_id for empty category name', () => {
    const rows = [
      {
        date: '2026-01-15',
        description: 'Coffee',
        categoryName: '',
        amount: 3.5,
        rowNumber: 2,
      },
    ];
    const result = mapRowsToExpenses(rows, categories, new Map());
    expect(result[0].category_id).toBeNull();
  });
});
