import { useMemo, useState } from 'react';
import { format, startOfQuarter, startOfYear, subDays } from 'date-fns';
import { useIncomesData } from '@/contexts/DataContext';
import { expenseHasTag } from '@/lib/expenseTags';
import { UNCATEGORIZED_VALUE } from '@/lib/expenseFilters';
import type { Expense } from '@/types/Expense';

export type ActivityKind = 'all' | 'expense' | 'income';

// One time control, not two. A month stepper sitting next to a separate
// "last 30 days" preset gives the user two overlapping answers to "when",
// so the presets live in the same select as the month and win outright —
// the stepper is only offered while the period is 'month'.
export type ActivityPeriod =
  | 'month'
  | 'last7'
  | 'last30'
  | 'last90'
  | 'thisQuarter'
  | 'thisYear'
  | 'all';

export const useActivityFeed = (expenses: Expense[]) => {
  const incomes = useIncomesData();
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), 'yyyy-MM'),
  );
  const [period, setPeriod] = useState<ActivityPeriod>('month');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<ActivityKind>('all');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const activity = useMemo(() => {
    const allRows = [
      ...expenses.map((row) => normalizeType(row, 'expense')),
      ...incomes.map((row) => normalizeType(row, 'income')),
    ].sort(compareNewestFirst);
    const periodRows = allRows.filter((row) =>
      isInPeriod(row, period, selectedMonth),
    );
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const matches = (row: Expense) =>
      matchesKind(row, kind) &&
      matchesTag(row, selectedTagId) &&
      matchesCategory(row, selectedCategoryId) &&
      matchesSearch(row, normalizedSearch);
    const filteredRows = periodRows.filter(matches);

    return {
      periodRows,
      filteredRows,
      // Drives the "nothing here — look everywhere?" escape hatch. Only worth
      // computing while the period is narrowed and the narrow view came back
      // empty, so the extra pass over full history stays off the hot path.
      matchesOutsidePeriod: countOutsidePeriod({
        allRows,
        periodRows,
        filteredRows,
        period,
        matches,
      }),
      expenseTotal: sumKind(filteredRows, 'expense'),
      incomeTotal: sumKind(filteredRows, 'income'),
    };
  }, [
    expenses,
    incomes,
    kind,
    period,
    search,
    selectedCategoryId,
    selectedMonth,
    selectedTagId,
  ]);

  return {
    ...activity,
    // The period control always holds a value, so it isn't a "filter" — only
    // the controls that can hide rows from within the chosen period count.
    hasActiveFilters:
      search.trim().length > 0 ||
      kind !== 'all' ||
      selectedTagId !== null ||
      selectedCategoryId !== null,
    selectedMonth,
    setSelectedMonth,
    period,
    setPeriod,
    // Names the CSV after what it actually contains, so two exports taken
    // under different periods don't collide in the downloads folder.
    exportScope: resolveExportScope(period, selectedMonth),
    search,
    setSearch,
    kind,
    setKind,
    selectedTagId,
    setSelectedTagId,
    selectedCategoryId,
    setSelectedCategoryId,
  };
};

// --- Helpers ---

const resolveExportScope = (
  period: ActivityPeriod,
  selectedMonth: string,
): string => {
  if (period === 'month') {
    return selectedMonth;
  }

  return period;
};

// The earliest date a period includes, as YYYY-MM-DD. Null means unbounded,
// which is what 'all' and 'month' use — 'month' matches on a prefix instead.
const getPeriodStart = (period: ActivityPeriod, now: Date): string | null => {
  if (period === 'last7') {
    return format(subDays(now, 6), 'yyyy-MM-dd');
  }
  if (period === 'last30') {
    return format(subDays(now, 29), 'yyyy-MM-dd');
  }
  if (period === 'last90') {
    return format(subDays(now, 89), 'yyyy-MM-dd');
  }
  if (period === 'thisQuarter') {
    return format(startOfQuarter(now), 'yyyy-MM-dd');
  }
  if (period === 'thisYear') {
    return format(startOfYear(now), 'yyyy-MM-dd');
  }

  return null;
};

const isInPeriod = (
  row: Expense,
  period: ActivityPeriod,
  selectedMonth: string,
): boolean => {
  if (period === 'all') {
    return true;
  }
  if (period === 'month') {
    return row.date.slice(0, 7) === selectedMonth;
  }

  const start = getPeriodStart(period, new Date());
  if (!start) {
    return true;
  }

  // Dates are YYYY-MM-DD, so a string compare is an ordering compare.
  return row.date >= start;
};

// True when the visible window covers less than everything the user has.
const isNarrowed = (period: ActivityPeriod): boolean => period !== 'all';

type OutsideArgs = {
  allRows: Expense[];
  periodRows: Expense[];
  filteredRows: Expense[];
  period: ActivityPeriod;
  matches: (row: Expense) => boolean;
};

const countOutsidePeriod = ({
  allRows,
  periodRows,
  filteredRows,
  period,
  matches,
}: OutsideArgs): number => {
  if (filteredRows.length > 0) {
    return 0;
  }
  if (!isNarrowed(period)) {
    return 0;
  }
  if (allRows.length === periodRows.length) {
    return 0;
  }

  return allRows.filter(matches).length;
};

const matchesKind = (row: Expense, kind: ActivityKind): boolean => {
  if (kind === 'all') {
    return true;
  }

  return row.type === kind;
};

const matchesTag = (row: Expense, selectedTagId: string | null): boolean => {
  if (!selectedTagId) {
    return true;
  }

  return expenseHasTag(row, selectedTagId);
};

const matchesCategory = (
  row: Expense,
  selectedCategoryId: string | null,
): boolean => {
  if (!selectedCategoryId) {
    return true;
  }
  if (selectedCategoryId === UNCATEGORIZED_VALUE) {
    return !row.category_id;
  }

  return row.category_id === selectedCategoryId;
};

const matchesSearch = (row: Expense, search: string): boolean => {
  if (search.length === 0) {
    return true;
  }
  if (row.description.toLocaleLowerCase().includes(search)) {
    return true;
  }
  if (row.category?.name.toLocaleLowerCase().includes(search)) {
    return true;
  }
  if (row.note?.toLocaleLowerCase().includes(search)) {
    return true;
  }
  if (matchesAmount(row, search)) {
    return true;
  }

  return doesTagMatch(row, search);
};

// People remember money as a number long after they have forgotten what they
// called it — "about 45 euros, sometime in spring". Both separators are
// accepted because the app formats with a comma and keyboards offer a dot.
const matchesAmount = (row: Expense, search: string): boolean => {
  const query = search.replace(/[^\d.,]/g, '').replace(',', '.');
  if (query.length === 0) {
    return false;
  }

  const amount = Math.abs(row.amount);

  return (
    amount.toFixed(2).startsWith(query) ||
    String(Math.round(amount)) === query.replace(/\.$/, '')
  );
};

const normalizeType = (row: Expense, type: 'expense' | 'income'): Expense => ({
  ...row,
  type,
});

const compareNewestFirst = (a: Expense, b: Expense): number => {
  const dateComparison = b.date.localeCompare(a.date);
  if (dateComparison !== 0) {
    return dateComparison;
  }

  return b.created_at.localeCompare(a.created_at);
};

const doesTagMatch = (row: Expense, search: string): boolean => {
  if (row.tag?.name.toLocaleLowerCase().includes(search)) {
    return true;
  }
  if (!row.extra_tags) {
    return false;
  }

  return row.extra_tags.some((tag) =>
    tag.name.toLocaleLowerCase().includes(search),
  );
};

// The period summary is a total, so an excluded row is left out of it —
// even though the row itself stays in the feed below, because it happened.
const sumKind = (rows: Expense[], kind: 'expense' | 'income'): number =>
  rows.reduce((sum, row) => {
    if (row.type !== kind) {
      return sum;
    }
    if (row.is_excluded) {
      return sum;
    }

    return sum + row.amount;
  }, 0);
