import {useState, useMemo} from "react";
import {format} from "date-fns";
import type {Expense} from "@/types/Expense";

interface UseExpensesFilterProps {
    expenses: Expense[];
    selectedMonth: string;
}

interface UseExpensesFilterReturn {
    filteredExpenses: Expense[];
    search: string;
    selectedCategoryId: string | null;
    setSearch: (value: string) => void;
    setSelectedCategoryId: (value: string | null) => void;
    handleFilterChange: (search: string, categoryId: string | null) => void;
    handleClearFilters: () => void;
    hasActiveFilters: boolean;
}

export const useExpensesFilter = ({
    expenses,
    selectedMonth
}: UseExpensesFilterProps): UseExpensesFilterReturn => {
    const [search, setSearch] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    const filteredExpenses = useMemo(() => {
        return expenses
            .filter((expense) => {
                const matchesMonth = format(new Date(expense.date), "yyyy-MM") === selectedMonth;
                const matchesSearch = search
                    ? expense.description.toLowerCase().includes(search.toLowerCase())
                    : true;
                const matchesCategory = selectedCategoryId
                    ? expense.category_id === selectedCategoryId
                    : true;

                return matchesMonth && matchesSearch && matchesCategory;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, selectedMonth, search, selectedCategoryId]);

    const handleFilterChange = (newSearch: string, categoryId: string | null) => {
        setSearch(newSearch);
        setSelectedCategoryId(categoryId);
    };

    const handleClearFilters = () => {
        setSearch("");
        setSelectedCategoryId(null);
    };

    const hasActiveFilters = search.length > 0 || selectedCategoryId !== null;

    return {
        filteredExpenses,
        search,
        selectedCategoryId,
        setSearch,
        setSelectedCategoryId,
        handleFilterChange,
        handleClearFilters,
        hasActiveFilters,
    };
};