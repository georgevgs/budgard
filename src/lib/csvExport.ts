import { format, parseISO } from 'date-fns';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import type { Tag } from '@/types/Tag';

export type CsvCell = string | number | null | undefined;

export type CsvRow = CsvCell[];

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type ExportOptions = {
  expenses: Expense[];
  categories: Category[];
  selectedMonth: string; // Format: "yyyy-MM"
};

export const buildCsv = (headers: string[], rows: CsvRow[]): string => {
  const lines = [headers.map(escapeCsvField).join(',')];

  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(','));
  }

  return lines.join('\r\n');
};

export const downloadCsv = (filename: string, csv: string): void => {
  // BOM helps Excel/Numbers detect UTF-8.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const buildTransactionsCsv = (
  transactions: Expense[],
  categories: Category[],
  tags: Tag[],
  t: TFunc,
): string => {
  const categoryById = new Map(categories.map((c) => [c.id, c.name]));
  const tagById = new Map(tags.map((tag) => [tag.id, tag.name]));

  const headers = [
    t('annualExport.csv.date'),
    t('annualExport.csv.type'),
    t('annualExport.csv.amount'),
    t('annualExport.csv.category'),
    t('annualExport.csv.description'),
    t('annualExport.csv.tag'),
  ];

  const rows = transactions.map((tx) => {
    return [
      format(parseISO(tx.date), 'yyyy-MM-dd'),
      transactionTypeLabel(tx, t),
      formatCsvAmount(signedAmount(tx)),
      lookupOrEmpty(tx.category_id, categoryById),
      tx.description,
      lookupOrEmpty(tx.tag_id, tagById),
    ];
  });

  return buildCsv(headers, rows);
};

export const buildCategorySummaryCsv = (
  transactions: Expense[],
  categories: Category[],
  t: TFunc,
): string => {
  type Bucket = {
    category: string;
    type: 'income' | 'expense';
    total: number;
    count: number;
  };

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const uncategorizedLabel = t('annualExport.csv.uncategorized');
  const buckets = new Map<string, Bucket>();

  for (const tx of transactions) {
    const txType = transactionType(tx);
    const categoryName = resolveCategoryName(
      tx.category_id,
      categoryById,
      uncategorizedLabel,
    );
    const key = `${txType}|${categoryName}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { category: categoryName, type: txType, total: 0, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.total += tx.amount;
    bucket.count += 1;
  }

  const headers = [
    t('annualExport.csv.type'),
    t('annualExport.csv.category'),
    t('annualExport.csv.total'),
    t('annualExport.csv.count'),
  ];

  const rows = Array.from(buckets.values())
    .sort(compareBuckets)
    .map((bucket) => [
      typeLabel(bucket.type, t),
      bucket.category,
      formatCsvAmount(bucket.total),
      bucket.count,
    ]);

  return buildCsv(headers, rows);
};

export const downloadExpensesAsCSV = ({
  expenses,
  categories,
  selectedMonth,
}: ExportOptions): void => {
  if (expenses.length === 0) return;

  const csv = generateMonthCsv(expenses, categories);
  const [year, month] = selectedMonth.split('-');
  const monthName = format(
    new Date(parseInt(year), parseInt(month) - 1),
    'MMMM',
  );
  const filename = `expenses_${monthName}_${year}.csv`;

  downloadCsv(filename, csv);
};

// --- Helpers ---

const generateMonthCsv = (
  expenses: Expense[],
  categories: Category[],
): string => {
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));
  const headers = ['Date', 'Description', 'Category', 'Amount'];

  const rows: CsvRow[] = expenses.map((expense) => {
    return [
      format(new Date(expense.date), 'yyyy-MM-dd'),
      expense.description,
      resolveExpenseCategoryName(expense.category_id, categoryMap),
      expense.amount.toFixed(2),
    ];
  });

  return buildCsv(headers, rows);
};

const escapeCsvField = (cell: CsvCell): string => {
  if (cell === null || cell === undefined) return '';

  const str = String(cell);
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
};

const transactionType = (tx: Expense): 'income' | 'expense' => {
  if (tx.type === 'income') return 'income';

  return 'expense';
};

const transactionTypeLabel = (tx: Expense, t: TFunc): string => {
  return typeLabel(transactionType(tx), t);
};

const typeLabel = (type: 'income' | 'expense', t: TFunc): string => {
  if (type === 'income') return t('annualExport.csv.income');

  return t('annualExport.csv.expense');
};

const signedAmount = (tx: Expense): number => {
  if (transactionType(tx) === 'income') return tx.amount;

  return -tx.amount;
};

const lookupOrEmpty = (
  id: string | null | undefined,
  byId: Map<string, string>,
): string => {
  if (!id) return '';

  return byId.get(id) ?? '';
};

const resolveCategoryName = (
  id: string | null | undefined,
  byId: Map<string, Category>,
  fallback: string,
): string => {
  if (!id) return fallback;
  const found = byId.get(id);
  if (!found) return fallback;

  return found.name;
};

const resolveExpenseCategoryName = (
  id: string | null | undefined,
  byId: Map<string, string>,
): string => {
  if (!id) return 'Uncategorized';

  return byId.get(id) ?? 'Uncategorized';
};

const compareBuckets = (
  a: { type: 'income' | 'expense'; total: number },
  b: { type: 'income' | 'expense'; total: number },
): number => {
  if (a.type !== b.type) {
    if (a.type === 'income') return -1;

    return 1;
  }

  return b.total - a.total;
};

const formatCsvAmount = (amount: number): string => {
  return amount.toFixed(2);
};
