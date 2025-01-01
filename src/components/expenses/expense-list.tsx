import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Plus } from "lucide-react";
import type { Expense } from "@/types/expense";
import ExpenseForm from "./expense-form";
import ExpenseCard from "./expense-card";

const ExpenseList = ()=> {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const fetchExpenses = async (): Promise<void> => {
    const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive",
      });
      return;
    }

    setExpenses(data);
  };

  const handleDelete = async (id: string): Promise<void> => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Expense deleted successfully",
    });
    fetchExpenses();
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  return (
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold">Expenses</h2>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>

        <div className="grid gap-4">
          {expenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No expenses yet. Add your first expense to get started!
              </div>
          ) : (
              expenses.map((expense) => (
                  <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      onEdit={() => {
                        setSelectedExpense(expense);
                        setShowForm(true);
                      }}
                      onDelete={() => handleDelete(expense.id)}
                  />
              ))
          )}
        </div>

        <ExpenseForm
            open={showForm}
            onClose={() => {
              setShowForm(false);
              setSelectedExpense(undefined);
            }}
            expense={selectedExpense}
            onSuccess={fetchExpenses}
        />
      </div>
  );
};

export default ExpenseList;