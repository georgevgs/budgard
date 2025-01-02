import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import type { Expense } from "@/types/expense";
import ExpenseHeader from "@/components/expenses/expense-header.tsx";
import ExpenseTabs from "@/components/expenses/expense-tabs.tsx";
import MonthlyOverview from "@/components/expenses/expense-monthly-overview.tsx";
import ExpenseLoadingState from "@/components/expenses/expense-loading.tsx";
import EmptyExpenseState from "@/components/expenses/expense-empty.tsx";
import ExpenseGrid from "@/components/expenses/expense-grid.tsx";
import ExpenseForm from "@/components/expenses/expense-form.tsx";

const ExpenseList = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentMonth = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const { toast } = useToast();

  const fetchExpenses = async (): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
          .from("expenses")
          .select(`*, category:categories(*)`)
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

  const filteredExpenses = expenses.filter(
      (expense) => format(new Date(expense.date), "yyyy-MM") === selectedMonth
  );

  const monthlyTotal = filteredExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
  );

  return (
      <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
        <ExpenseHeader onAddClick={() => setShowForm(true)} />

        <div className="space-y-4">
          <ExpenseTabs
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
          />
          <MonthlyOverview
              monthlyTotal={monthlyTotal}
              selectedMonth={selectedMonth}
              currentMonth={currentMonth}
              onCurrentMonthClick={() => setSelectedMonth(currentMonth)}
          />
        </div>

        <div className="space-y-4">
          {loading ? (
              <ExpenseLoadingState />
          ) : filteredExpenses.length === 0 ? (
              <EmptyExpenseState
                  selectedMonth={selectedMonth}
                  onAddClick={() => setShowForm(true)}
              />
          ) : (
              <ExpenseGrid
                  expenses={filteredExpenses}
                  onEdit={(expense) => {
                    setSelectedExpense(expense);
                    setShowForm(true);
                  }}
                  onDelete={handleDelete}
              />
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