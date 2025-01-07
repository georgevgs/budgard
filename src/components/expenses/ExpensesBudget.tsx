import {useState, useEffect} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {supabase} from "@/lib/supabase";
import {useToast} from "@/hooks/useToast";
import type {Category} from "@/types/Category";
import type {Expense} from "@/types/Expense";
import ExpensesBudgetList from "@/components/expenses/ExpensesBudgetList";
import ExpensesBudgetAddDialog from "@/components/expenses/ExpensesBudgetAddDialog";

interface Budget {
    id?: string;
    amount: number;
    user_id: string;
    created_at?: string;
}

interface ExpensesBudgetProps {
    categories: Category[];
    expenses: Expense[];
}

const ExpensesBudget = ({categories, expenses}: ExpensesBudgetProps) => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
    const {toast} = useToast();

    // Fetch existing budgets
    useEffect(() => {
        const fetchBudgets = async () => {
            try {
                const {data, error} = await supabase
                    .from("budgets")
                    .select("*");

                if (error) throw error;
                setBudgets(data || []);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to load budgets",
                    variant: "destructive"
                });
            }
        };

        fetchBudgets();
    }, [toast]);

    const handleAddBudget = async (budgetAmount: string) => {
        try {
            const {data, error} = await supabase
                .from("budgets")
                .upsert({
                    amount: parseFloat(budgetAmount),
                    user_id: (await supabase.auth.getUser()).data.user?.id
                })
                .select();

            if (error) throw error;

            // Replace existing budget (as only one is allowed per user)
            setBudgets(data || []);

            setIsAddBudgetOpen(false);

            toast({
                title: "Success",
                description: "Budget set successfully"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to set budget",
                variant: "destructive"
            });
        }
    };

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
                            {budgets.length > 0 ? "Edit Budget" : "Set Budget"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ExpensesBudgetList
                        budgets={budgets}
                        categories={categories}
                        expenses={expenses}
                    />
                </CardContent>
            </Card>

            {budgets.length > 0 && (
                <ExpensesBudgetAddDialog
                    isOpen={isAddBudgetOpen}
                    onOpenChange={setIsAddBudgetOpen}
                    onAddBudget={handleAddBudget}
                    existingBudget={budgets[0]}
                />
            )}
        </div>
    );
};

export default ExpensesBudget;