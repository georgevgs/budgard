import { describe, it, expect } from 'vitest';
import {
  getCsvPreviewData,
  usesSignedAmountConvention,
  suggestColumnMapping,
  parseExpensesCsv,
  mapRowsToExpenses,
  mapRowsToIncomes,
} from '@/lib/csvImport';
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

  it('detects negative amounts in the amount column', () => {
    const csv = 'Date,Description,Amount\n2026-01-01,Coffee,-3.50';
    expect(usesSignedAmountConvention(getCsvPreviewData(csv), 2)).toBe(true);
  });

  it('reports no negative amounts for normal CSVs', () => {
    const csv = 'Date,Description,Amount\n2026-01-01,Coffee,3.50';
    expect(usesSignedAmountConvention(getCsvPreviewData(csv), 2)).toBe(false);
  });

  it('ignores negatives that live in other columns', () => {
    // A running-balance column, or a "-5%" in a description, used to flip the
    // sign convention for the entire file.
    const csv = [
      'Date,Description,Amount,Balance',
      '2026-01-01,Coffee -5% off,3.50,-120.00',
      '2026-01-02,Lunch,12.00,-132.00',
    ].join('\n');
    expect(usesSignedAmountConvention(getCsvPreviewData(csv), 2)).toBe(false);
    expect(usesSignedAmountConvention(getCsvPreviewData(csv), 3)).toBe(true);
  });
});

// --- suggestColumnMapping ---

describe('suggestColumnMapping', () => {
  it('keeps the last header that matches a role, not the first', () => {
    // A bank statement that carries both a booking date and a value date
    // means the second one; the scan must not stop at the first hit.
    const preview = getCsvPreviewData(
      'Date,Value date,Description,Amount\n2026-01-01,2026-01-02,Coffee,3.50',
    );
    const mapping = suggestColumnMapping(preview);
    expect(mapping.dateColumn).toBe(1);
  });

  it('does not pick a repeated column whose values read as prose', () => {
    const long = 'a-very-long-cell-value-that-exceeds-thirty-characters';
    const preview = getCsvPreviewData(
      `A,B,C,D\n2026-01-01,Coffee,${long},3.50\n2026-01-02,Tea,${long},2.00`,
    );
    const mapping = suggestColumnMapping(preview);
    expect(mapping.categoryColumn).toBeNull();
  });

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
        isIncome: false,
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
        isIncome: false,
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
        isIncome: false,
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
        isIncome: false,
      },
    ];
    const result = mapRowsToExpenses(rows, categories, new Map());
    expect(result[0].category_id).toBeNull();
  });
});

describe('income row import', () => {
  const mapping = {
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 3,
    categoryColumn: 2,
  };

  it('keeps income rows in validRows when not skipping', () => {
    const csv =
      'Date,Description,Category,Amount\n2026-01-15,Salary,Food,500.00\n2026-01-16,Coffee,Food,-3.50';
    const result = parseExpensesCsv(csv, categories, mapping, false, true);
    expect(result.validRows).toHaveLength(2);
    expect(result.skippedIncomeCount).toBe(0);
    const salary = result.validRows.find((r) => r.description === 'Salary');
    expect(salary?.isIncome).toBe(true);
    const coffee = result.validRows.find((r) => r.description === 'Coffee');
    expect(coffee?.isIncome).toBe(false);
  });

  it('mapRowsToIncomes returns only income rows without a category', () => {
    const rows = [
      {
        date: '2026-01-15',
        description: 'Salary',
        categoryName: 'Food',
        amount: 500,
        rowNumber: 2,
        isIncome: true,
      },
      {
        date: '2026-01-16',
        description: 'Coffee',
        categoryName: 'Food',
        amount: 3.5,
        rowNumber: 3,
        isIncome: false,
      },
    ];
    const incomes = mapRowsToIncomes(rows);
    expect(incomes).toHaveLength(1);
    expect(incomes[0].description).toBe('Salary');
    expect(incomes[0].category_id).toBeNull();
  });

  it('mapRowsToExpenses excludes income rows', () => {
    const rows = [
      {
        date: '2026-01-15',
        description: 'Salary',
        categoryName: 'Food',
        amount: 500,
        rowNumber: 2,
        isIncome: true,
      },
      {
        date: '2026-01-16',
        description: 'Coffee',
        categoryName: 'Food',
        amount: 3.5,
        rowNumber: 3,
        isIncome: false,
      },
    ];
    const expenses = mapRowsToExpenses(rows, categories, new Map());
    expect(expenses).toHaveLength(1);
    expect(expenses[0].description).toBe('Coffee');
  });
});

// --- amount parsing ---

describe('amount parsing', () => {
  const CATEGORIES: Category[] = [];
  const MAPPING = {
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 2,
    categoryColumn: null,
  };

  // Quoted, so an amount containing a comma is one field rather than two.
  const parseOne = (amount: string, signed = false) => {
    const csv = `Date,Description,Amount\n2026-01-01,Thing,"${amount}"`;

    return parseExpensesCsv(csv, CATEGORIES, MAPPING, false, signed);
  };

  it('reads thousands separators instead of truncating them', () => {
    // "1,234" used to parseFloat to 1 and "1.234" to 1.23.
    expect(parseOne('1,234').validRows[0].amount).toBe(1234);
    expect(parseOne('1.234').validRows[0].amount).toBe(1234);
    expect(parseOne('1,234.56').validRows[0].amount).toBe(1234.56);
    expect(parseOne('1.234,56').validRows[0].amount).toBe(1234.56);
  });

  it('reads plain decimals in either convention', () => {
    expect(parseOne('12.50').validRows[0].amount).toBe(12.5);
    expect(parseOne('12,50').validRows[0].amount).toBe(12.5);
  });

  it('handles trailing-minus notation', () => {
    // Some bank exports write "1234.56-" and it used to parse as positive.
    const result = parseOne('1234.56-', true);
    expect(result.validRows[0].amount).toBe(1234.56);
    expect(result.skippedIncomeCount).toBe(0);
  });

  it('handles accounting parentheses', () => {
    const result = parseOne('(1,234.56)', true);
    expect(result.validRows[0].amount).toBe(1234.56);
  });

  it('keeps a refund negative when the file is not a bank statement', () => {
    // Budgard's own export writes -3.50 for a refund. Read as a magnitude it
    // came back as a +3.50 charge — a 7 euro swing per row.
    const result = parseOne('-3.50', false);
    expect(result.validRows[0].amount).toBe(-3.5);
  });

  it('treats a negative as an outgoing expense in a bank statement', () => {
    const result = parseOne('-3.50', true);
    expect(result.validRows[0].amount).toBe(3.5);
  });

  it('treats an unsigned amount as income only under the signed convention', () => {
    expect(parseOne('3.50', true).skippedIncomeCount).toBe(0);
    expect(parseOne('3.50', false).validRows[0].amount).toBe(3.5);
  });

  it('rejects a zero amount but not a negative one', () => {
    expect(parseOne('0').validRows).toHaveLength(0);
    expect(parseOne('-3.50').validRows).toHaveLength(1);
  });
});
