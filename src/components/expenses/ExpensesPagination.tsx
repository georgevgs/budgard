import { useState } from 'react';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import type { Expense } from "@/types/Expense";
import ExpensesCard from "@/components/expenses/ExpensesCard.tsx";

interface ExpensesPaginationProps {
    expenses: Expense[];
    onEdit: (expense: Expense) => void;
    onDelete: (id: string) => void;
}

const ITEMS_PER_PAGE = 5;

const ExpensesPagination = ({ expenses, onEdit, onDelete }: ExpensesPaginationProps) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Calculate pagination
    const totalItems = expenses.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
    const currentExpenses = expenses.slice(startIndex, endIndex);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // Smooth scroll to top
        document.getElementById('expenses-list')?.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Generate page numbers to display
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
            return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }

        return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
    };

    return (
        <div className="flex flex-col h-full">
            {/* Expenses List */}
            <div id="expenses-list" className="flex-1 overflow-y-auto min-h-0 pb-24">
                <div className="grid gap-4">
                    {currentExpenses.map((expense) => (
                        <ExpensesCard
                            key={expense.id}
                            expense={expense}
                            onEdit={() => onEdit(expense)}
                            onDelete={() => onDelete(expense.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Pagination Controls */}
            {totalItems > ITEMS_PER_PAGE && (
                <div className="fixed bottom-0 left-0 right-0 bg-background border-t md:static md:mt-4">
                    <div className="p-4">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                    />
                                </PaginationItem>

                                {getVisiblePages().map((page, index) => (
                                    <PaginationItem key={index}>
                                        {page === 'ellipsis' ? (
                                            <PaginationEllipsis />
                                        ) : (
                                            <PaginationLink
                                                onClick={() => handlePageChange(page as number)}
                                                isActive={currentPage === page}
                                                className="cursor-pointer"
                                            >
                                                {page}
                                            </PaginationLink>
                                        )}
                                    </PaginationItem>
                                ))}

                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpensesPagination;