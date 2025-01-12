import {useTranslation} from "react-i18next";
import {useData} from "@/contexts/DataContext";
import {Progress} from "@/components/ui/progress";
import {TrendingDown, TrendingUp} from "lucide-react";
import {cn, formatCurrency} from "@/lib/utils";

const ExpensesBudgetList = () => {
    const {budget, expenses, isInitialized} = useData();
    const {t} = useTranslation();

    if (!isInitialized || !budget) {
        return (
            <div className="text-center text-muted-foreground py-4">
                {t("budget.noBudgetSet")}
            </div>
        );
    }

    // Calculate total expenses for the current month
    const monthlyExpenses = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
    );

    const progressPercentage = Math.min((monthlyExpenses / budget.amount) * 100, 100);
    const remainingBudget = budget.amount - monthlyExpenses;
    const isOverBudget = remainingBudget < 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("budget.monthlyBudget")}</span>
                <span className="text-sm text-muted-foreground">
                    {t("budget.budgetProgress", {
                        current: formatCurrency(monthlyExpenses),
                        total: formatCurrency(budget.amount)
                    })}
                </span>
            </div>
            <Progress
                value={progressPercentage}
                className={cn(
                    "h-2",
                    isOverBudget && "bg-destructive/50"
                )}
            />
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isOverBudget ? (
                        <TrendingUp className="h-5 w-5 text-destructive"/>
                    ) : (
                        <TrendingDown className="h-5 w-5 text-primary"/>
                    )}
                    <span className={cn(
                        "text-sm",
                        isOverBudget ? "text-destructive" : "text-primary"
                    )}>
                        {t(isOverBudget ? "budget.overBudget" : "budget.underBudget")}
                    </span>
                </div>
                <span className={cn(
                    "text-sm font-semibold",
                    isOverBudget ? "text-destructive" : "text-primary"
                )}>
                    {formatCurrency(Math.abs(remainingBudget))}
                </span>
            </div>
        </div>
    );
};

export default ExpensesBudgetList;