import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { Expense } from '@/types/Expense';
import ExpensesCard from '@/components/expenses/ExpensesCard';

interface ExpensesPaginationProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  searchQuery?: string;
}

const ITEMS_PER_PAGE = 5;

const ExpensesPagination = ({
  expenses,
  onEdit,
  onDelete,
  searchQuery,
}: ExpensesPaginationProps) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const prevLengthRef = useRef(expenses.length);

  useEffect(() => {
    if (expenses.length !== prevLengthRef.current) {
      setCurrentPage(1);
      prevLengthRef.current = expenses.length;
    }
  }, [expenses.length]);

  // Calculate pagination
  const totalItems = expenses.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const safePage = Math.min(currentPage, Math.max(totalPages, 1));
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentExpenses = expenses.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getVisiblePages = () => {
    const pages = [];
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

  return (
    <div className="space-y-4">
      {/* Expenses List */}
      <div className="grid gap-4">
        {currentExpenses.map((expense, index) => (
          <div
            key={expense.id}
            className="card-enter"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <ExpensesCard
              expense={expense}
              onEdit={onEdit}
              onDelete={onDelete}
              searchQuery={searchQuery}
            />
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalItems > ITEMS_PER_PAGE && (
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
                >
                  {t('pagination.previous')}
                </PaginationPrevious>
              </PaginationItem>

              {getVisiblePages().map((page, index) => (
                <PaginationItem key={page === 'ellipsis' ? `ellipsis-${index}` : page}>
                  {page === 'ellipsis' ? (
                    <PaginationEllipsis aria-label={t('pagination.more')} />
                  ) : (
                    <PaginationLink
                      onClick={() => handlePageChange(page as number)}
                      isActive={safePage === page}
                      className="cursor-pointer"
                      aria-label={t('pagination.page', { page })}
                    >
                      {page}
                    </PaginationLink>
                  )}
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
                >
                  {t('pagination.next')}
                </PaginationNext>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default ExpensesPagination;
