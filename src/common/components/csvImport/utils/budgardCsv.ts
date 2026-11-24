const BUDGARD_CSV_FORMATS = [
  {
    headers: ['date', 'type', 'amount', 'category', 'description', 'tags'],
    income: 'income',
    expense: 'expense',
    uncategorized: 'uncategorized',
  },
  {
    headers: [
      'ημερομηνια',
      'τυπος',
      'ποσο',
      'κατηγορια',
      'περιγραφη',
      'ετικετες',
    ],
    income: 'εσοδο',
    expense: 'εξοδο',
    uncategorized: 'χωρις κατηγορια',
  },
];

export type BudgardCsvFormat = (typeof BUDGARD_CSV_FORMATS)[number];
export type BudgardCsvType = 'income' | 'expense';

export const BUDGARD_CSV_TYPE_COLUMN = 1;

export const getBudgardCsvFormatOrNull = (
  headers: string[],
): BudgardCsvFormat | null => {
  const normalized = headers.map(normalize);

  return (
    BUDGARD_CSV_FORMATS.find(
      (format) =>
        format.headers.length === normalized.length &&
        format.headers.every((header, index) => header === normalized[index]),
    ) ?? null
  );
};

export const getBudgardCsvTypeOrNull = (
  rawType: string,
  format: BudgardCsvFormat | null,
): BudgardCsvType | null => {
  if (null === format) {
    return null;
  }

  const type = normalize(rawType);
  if (format.income === type) {
    return 'income';
  } else if (format.expense === type) {
    return 'expense';
  } else {
    return null;
  }
};

export const isBudgardCsvUncategorized = (
  category: string,
  format: BudgardCsvFormat | null,
): boolean => null !== format && format.uncategorized === normalize(category);

const normalize = (text: string): string =>
  text.trim().normalize('NFD').toLowerCase().replace(/\p{M}/gu, '');
