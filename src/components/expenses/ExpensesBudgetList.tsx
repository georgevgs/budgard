import {useData} from "@/contexts/DataContext";
import {Progress} from "@/components/ui/progress";
import {TrendingDown, TrendingUp} from "lucide-react";
import {cn} from "@/lib/utils";

const ExpensesBudgetList = () => {
    const {budget, expenses, isInitialized} = useData();

    if (!isInitialized || !budget) {
        return (
            <div className="text-center text-muted-foreground py-4">
                No budget set up yet
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
                <span className="text-sm font-medium">Monthly Budget</span>
                <span className="text-sm text-muted-foreground">
                    €{monthlyExpenses.toFixed(2)} / €{budget.amount.toFixed(2)}
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
                        {isOverBudget ? "Over Budget" : "Under Budget"}
                    </span>
                </div>
                <span className={cn(
                    "text-sm font-semibold",
                    isOverBudget ? "text-destructive" : "text-primary"
                )}>
                    €{Math.abs(remainingBudget).toFixed(2)}
                </span>
            </div>
        </div>
    );
};

export default ExpensesBudgetList;