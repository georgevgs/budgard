import {useMemo} from "react";
import {Card, CardContent} from "@/components/ui/card";
import type {Expense} from "@/types/Expense";
import type {Category} from "@/types/Category";

interface ExpensesDashboardProps {
    expenses: Expense[];
    categories: Category[];
}

const ExpensesDashboard = ({expenses, categories}: ExpensesDashboardProps) => {
    const categoryData = useMemo(() => {
        // Group expenses by category
        const categoryExpenses = expenses.reduce<Record<string, Expense[]>>((acc, expense) => {
            const categoryId = expense.category_id;
            if (!categoryId) return acc;

            if (!acc[categoryId]) {
                acc[categoryId] = [];
            }
            acc[categoryId].push(expense);
            return acc;
        }, {});

        // Calculate total
        const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

        // Map categories to their data
        return categories
            .map(category => {
                const categoryExpenseList = categoryExpenses[category.id] || [];
                const amount = categoryExpenseList.reduce((sum, expense) => sum + expense.amount, 0);
                const percentage = total > 0 ? (amount / total) * 100 : 0;

                return {
                    name: category.name,
                    amount,
                    percentage,
                    color: category.color
                };
            })
            .filter(cat => cat.amount > 0)
            .sort((a, b) => b.amount - a.amount);
    }, [expenses, categories]);

    if (categoryData.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="w-full space-y-3">
                    {categoryData.map((category) => (
                        <div key={category.name} className="flex items-center gap-4">
                            <div
                                className="w-3 h-3 rounded-sm shrink-0"
                                style={{backgroundColor: category.color}}
                            />
                            <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                                <div className="flex gap-2 items-baseline min-w-0">
                                    <span className="text-sm font-medium truncate">
                                        {category.name}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {category.percentage.toFixed(0)}%
                                    </span>
                                </div>
                                <span className="text-sm font-medium shrink-0">
                                    €{category.amount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default ExpensesDashboard;