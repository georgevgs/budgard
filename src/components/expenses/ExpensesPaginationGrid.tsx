import { useState } from 'react';
import PaginationControls from '@/components/layout/PaginationControls';
import ExpensesGrid from '@/components/expenses/ExpensesGrid';
import type { Expense } from "@/types/Expense";

interface PaginatedExpenseGridProps {
    expenses: Expense[];
    onEdit: (expense: Expense) => void;
    onDelete: (id: string) => void;
}

const ExpensesPaginationGrid = ({
    expenses,
    onEdit,
    onDelete
}: PaginatedExpenseGridProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    // Calculate pagination
    const totalItems = expenses.length;
    const totalPages = pageSize === -1 ? 1 : Math.ceil(totalItems / pageSize);

    // Calculate start and end items for current page
    const startItem = pageSize === -1 ? 1 : (currentPage - 1) * pageSize + 1;
    const endItem = pageSize === -1 ? totalItems : Math.min(currentPage * pageSize, totalItems);

    // Get paginated data
    const paginatedExpenses = pageSize === -1
        ? expenses
        : expenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Handle page size change
    const handlePageSizeChange = (newSize: string) => {
        const size = parseInt(newSize);
        setPageSize(size);
        setCurrentPage(1); // Reset to first page when changing page size
    };

    // Ensure current page is valid after items change
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
    }

    return (
        <div className="flex flex-col h-full">
            <div className="overflow-y-auto flex-1 min-h-0">
                <ExpensesGrid
                    expenses={paginatedExpenses}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            </div>

            {totalItems > 0 && (
                <div className="pb-12 md:pb-4">
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={handlePageSizeChange}
                        totalItems={totalItems}
                        startItem={startItem}
                        endItem={endItem}
                    />
                </div>
            )}
        </div>
    );
};

export default ExpensesPaginationGrid;