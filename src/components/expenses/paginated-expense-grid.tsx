import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ExpenseCard from "./expense-card";
import type { Expense } from "@/types/expense";

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: string) => void;
    totalItems: number;
    startItem: number;
    endItem: number;
}

const PaginationControls = ({
    currentPage,
    totalPages,
    pageSize,
    onPageChange,
    onPageSizeChange,
    totalItems,
    startItem,
    endItem,
}: PaginationControlsProps) => (
    <div className="flex items-center justify-between border-t pt-4 mt-4">
        {/* Left - Items count */}
        <p className="text-sm text-muted-foreground">
            {startItem}-{endItem} of {totalItems}
        </p>

        {/* Center - Page navigation */}
        <div className="flex items-center gap-3">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="h-8 w-8"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm">
                {currentPage} of {totalPages || 1}
            </span>

            <Button
                variant="ghost"
                size="icon"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="h-8 w-8"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>

        {/* Right - Items per page */}
        <Select
            value={pageSize.toString()}
            onValueChange={onPageSizeChange}
        >
            <SelectTrigger className="w-[70px]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="-1">All</SelectItem>
            </SelectContent>
        </Select>
    </div>
);

interface PaginatedExpenseGridProps {
    expenses: Expense[];
    onEdit: (expense: Expense) => void;
    onDelete: (id: string) => void;
}

const PaginatedExpenseGrid = ({
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
        <div className="space-y-4">
            <div className="grid gap-4">
                {paginatedExpenses.map((expense) => (
                    <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        onEdit={() => onEdit(expense)}
                        onDelete={() => onDelete(expense.id)}
                    />
                ))}
            </div>

            {totalItems > 0 && (
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
            )}
        </div>
    );
};

export default PaginatedExpenseGrid;