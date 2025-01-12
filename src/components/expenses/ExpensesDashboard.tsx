import {useTranslation} from "react-i18next";
import {useMemo} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {formatCurrency} from "@/lib/utils";
import type {Expense} from "@/types/Expense";
import type {Category} from "@/types/Category";

interface ExpensesDashboardProps {
    expenses: Expense[];
    categories: Category[];
}

const ExpensesDashboard = ({expenses, categories}: ExpensesDashboardProps) => {
    const {t} = useTranslation();

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

    const formatPercentage = (percentage: number): string => {
        if (percentage === 0) return t("dashboard.zeroPercent");
        if (percentage < 1) return t("dashboard.lessThanOnePercent");
        return t("dashboard.percent", {value: Math.round(percentage)});
    };

    if (categoryData.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="w-full space-y-3">
                    {categoryData.map((category) => (
                        <div
                            key={category.name}
                            className="flex items-center gap-4"
                            aria-label={t("dashboard.categoryBreakdown", {
                                name: category.name,
                                amount: formatCurrency(category.amount),
                                percent: formatPercentage(category.percentage)
                            })}
                        >
                            <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{backgroundColor: category.color}}
                                aria-hidden="true"
                            />
                            <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                                <div className="flex gap-2 items-baseline min-w-0">
                                    <span className="text-sm font-medium truncate">
                                        {category.name}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {formatPercentage(category.percentage)}
                                    </span>
                                </div>
                                <span className="text-sm font-medium shrink-0">
                                    {formatCurrency(category.amount)}
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