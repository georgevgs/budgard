import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Plus } from "lucide-react";
import type { Expense } from "@/types/expense";
import ExpenseForm from "./expense-form";
import ExpenseCard from "./expense-card";

const ExpenseList = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchExpenses = async (): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
          .from("expenses")
          .select(`
          *,
          category:categories(*)
        `)
          .order("date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
      fetchExpenses();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  return (
      <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage your expenses
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {/* Expenses List */}
        <div className="space-y-4">
          {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Loading expenses...</p>
              </div>
          ) : expenses.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-lg border-2 border-dashed">
                <h3 className="text-lg font-semibold mb-1">No expenses yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first expense to start tracking your spending
                </p>
                <Button onClick={() => setShowForm(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Expense
                </Button>
              </div>
          ) : (
              <div className="grid gap-4">
                {expenses.map((expense) => (
                    <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        onEdit={() => {
                          setSelectedExpense(expense);
                          setShowForm(true);
                        }}
                        onDelete={() => handleDelete(expense.id)}
                    />
                ))}
              </div>
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