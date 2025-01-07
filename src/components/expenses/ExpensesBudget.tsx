import {useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import type {Category} from "@/types/Category";
import type {Expense} from "@/types/Expense";
import type {Budget} from "@/types/Budget";
import ExpensesBudgetList from "@/components/expenses/ExpensesBudgetList";
import ExpensesBudgetAddDialog from "@/components/expenses/ExpensesBudgetAddDialog";
import type {DataOperations} from "@/hooks/useOptimizedData";
import {Session} from "@supabase/supabase-js";

interface ExpensesBudgetProps {
    categories: Category[];
    expenses: Expense[];
    budget: Budget | null;
    isLoading: boolean;
    operations: DataOperations;
    session: Session | null;
}

const ExpensesBudget = ({
    categories,
    expenses,
    budget,
    isLoading,
    operations,
    session // Destructure session
}: ExpensesBudgetProps) => {
    const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
    const {handleBudgetUpdate} = operations;

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Budget Tracker</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-4">
                        Loading budget information...
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Budget Tracker</CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddBudgetOpen(true)}
                        >
                            {budget ? "Edit Budget" : "Set Budget"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ExpensesBudgetList
                        budget={budget}
                        categories={categories}
                        expenses={expenses}
                    />
                </CardContent>
            </Card>

            <ExpensesBudgetAddDialog
                isOpen={isAddBudgetOpen}
                onOpenChange={setIsAddBudgetOpen}
                onAddBudget={handleBudgetUpdate}
                existingBudget={budget}
                session={session}
            />
        </div>
    );
};

export default ExpensesBudget;