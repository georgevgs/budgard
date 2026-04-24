import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useMemo } from 'react';
import { el, enUS } from 'date-fns/locale';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { groupExpensesByDate } from '@/lib/dateGrouping';
import type { Expense } from '@/types/Expense';
import ExpensesCard from '@/components/expenses/ExpensesCard';

type Props = {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onSaveAsTemplate?: (expense: Expense) => void;
  searchQuery?: string;
  showFullDate?: boolean;
};

const ITEMS_PER_PAGE = 10;

const ExpensesPagination = ({
  expenses,
  onEdit,
  onDelete,
  onSaveAsTemplate,
  searchQuery,
  showFullDate,
}: Props) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const [currentPage, setCurrentPage] = useState(1);
  const prevLengthRef = useRef(expenses.length);

  useEffect(() => {
    if (expenses.length !== prevLengthRef.current) {
      setCurrentPage(1);
      prevLengthRef.current = expenses.length;
    }
  }, [expenses.length]);

  // Paginate first, then group
  const totalItems = expenses.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const safePage = Math.min(currentPage, Math.max(totalPages, 1));
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentExpenses = expenses.slice(startIndex, endIndex);

  const dateGroups = useMemo(
    () => groupExpensesByDate(currentExpenses, dateLocale, t, showFullDate),
    [currentExpenses, dateLocale, t, showFullDate],
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-2">
      {/* Date-grouped expenses */}
      {dateGroups.map((group) => (
        <div key={group.date}>
          <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/80 backdrop-blur-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {group.label}
            </p>
          </div>
          <div className="grid gap-3">
            {group.expenses.map((expense, index) => (
              <div
                key={expense.id}
                className="card-enter"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <ExpensesCard
                  expense={expense}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onSaveAsTemplate={onSaveAsTemplate}
                  searchQuery={searchQuery}
                  showFullDate={showFullDate}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {renderPaginationControls(
        totalItems,
        currentPage,
        totalPages,
        safePage,
        handlePageChange,
        t,
      )}
    </div>
  );
};

export default ExpensesPagination;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const getVisiblePages = (
  currentPage: number,
  totalPages: number,
): (number | 'ellipsis')[] => {
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);

    return pages;
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      'ellipsis',
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    'ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis',
    totalPages,
  ];
};

const renderPageItem = (
  page: number | 'ellipsis',
  safePage: number,
  handlePageChange: (page: number) => void,
  t: TranslateFunction,
) => {
  if (page === 'ellipsis') {
    return <PaginationEllipsis aria-label={t('pagination.more')} />;
  }

  return (
    <PaginationLink
      onClick={() => handlePageChange(page)}
      isActive={safePage === page}
      className="cursor-pointer"
      aria-label={t('pagination.page', { page })}
    >
      {page}
    </PaginationLink>
  );
};

const renderPaginationControls = (
  totalItems: number,
  currentPage: number,
  totalPages: number,
  safePage: number,
  handlePageChange: (page: number) => void,
  t: TranslateFunction,
) => {
  if (totalItems <= ITEMS_PER_PAGE) return null;

  return (
    <div className="py-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => handlePageChange(currentPage - 1)}
              className={
                currentPage <= 1
                  ? 'pointer-events-none opacity-50'
                  : 'cursor-pointer'
              }
              aria-label={t('pagination.previous')}
              aria-disabled={currentPage <= 1}
              tabIndex={currentPage <= 1 ? -1 : undefined}
            >
              {t('pagination.previous')}
            </PaginationPrevious>
          </PaginationItem>

          {getVisiblePages(currentPage, totalPages).map((page, index) => (
            <PaginationItem
              key={page === 'ellipsis' ? `ellipsis-${index}` : page}
            >
              {renderPageItem(page, safePage, handlePageChange, t)}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => handlePageChange(currentPage + 1)}
              className={
                currentPage >= totalPages
                  ? 'pointer-events-none opacity-50'
                  : 'cursor-pointer'
              }
              aria-label={t('pagination.next')}
              aria-disabled={currentPage >= totalPages}
              tabIndex={currentPage >= totalPages ? -1 : undefined}
            >
              {t('pagination.next')}
            </PaginationNext>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
