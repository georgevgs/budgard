import { format } from 'date-fns';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

interface ExportOptions {
  expenses: Expense[];
  categories: Category[];
  selectedMonth: string; // Format: "yyyy-MM"
}

/**
 * Generates a CSV string from expenses data
 */
function generateCSV(expenses: Expense[], categories: Category[]): string {
  // Create category map for quick lookup
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

  // CSV header
  const headers = ['Date', 'Description', 'Category', 'Amount'];

  // CSV rows
  const rows = expenses.map((expense) => {
    const categoryName = expense.category_id
      ? categoryMap.get(expense.category_id) || 'Uncategorized'
      : 'Uncategorized';

    return [
      format(new Date(expense.date), 'yyyy-MM-dd'),
      // Escape double quotes and wrap in quotes if contains comma or quotes
      escapeCSVField(expense.description),
      escapeCSVField(categoryName),
      expense.amount.toFixed(2),
    ];
  });

  // Combine header and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Escapes a CSV field - wraps in quotes if contains comma, quotes, or newlines
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Downloads expenses as a CSV file
 */
export function downloadExpensesAsCSV({
  expenses,
  categories,
  selectedMonth,
}: ExportOptions): void {
  if (expenses.length === 0) return;

  const csvContent = generateCSV(expenses, categories);

  // Create blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // Format filename with month
  const [year, month] = selectedMonth.split('-');
  const monthName = format(
    new Date(parseInt(year), parseInt(month) - 1),
    'MMMM',
  );
  const filename = `expenses_${monthName}_${year}.csv`;

  // Create temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up URL object
  URL.revokeObjectURL(url);
}
