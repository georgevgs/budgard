import type {Category} from "@/types/Category";
import type {Budget} from "@/types/Budget";
import type {Expense} from "@/types/Expense";
import {Progress} from "@/components/ui/progress";
import {TrendingDown, TrendingUp} from "lucide-react";

interface ExpensesBudgetListProps {
    budget: Budget | null;
    categories: Category[];
    expenses: Expense[];
}

const ExpensesBudgetList = ({
    budget,
    expenses
}: ExpensesBudgetListProps) => {
    if (!budget) {
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
                className="h-2"
            />
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isOverBudget ? (
                        <TrendingUp className="h-5 w-5 text-destructive"/>
                    ) : (
                        <TrendingDown className="h-5 w-5 text-primary"/>
                    )}
                    <span className={`text-sm ${isOverBudget ? "text-destructive" : "text-primary"}`}>
                        {isOverBudget ? "Over Budget" : "Under Budget"}
                    </span>
                </div>
                <span className={`text-sm font-semibold ${isOverBudget ? "text-destructive" : "text-primary"}`}>
                    €{Math.abs(remainingBudget).toFixed(2)}
                </span>
            </div>
        </div>
    );
};

export default ExpensesBudgetList;