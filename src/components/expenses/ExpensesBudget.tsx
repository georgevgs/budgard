import {useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/hooks/useAuth";
import {useData} from "@/contexts/DataContext";
import {useDataOperations} from "@/hooks/useDataOperations";
import ExpensesBudgetList from "@/components/expenses/ExpensesBudgetList";
import ExpensesBudgetAddDialog from "@/components/expenses/ExpensesBudgetAddDialog";

const ExpensesBudget = () => {
    const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
    const {session} = useAuth();
    const {categories, expenses, budget, isLoading} = useData();
    const {handleBudgetUpdate} = useDataOperations();

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