import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Repeat } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format, addWeeks, addMonths, addYears } from 'date-fns';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { RecurringExpenseFormData } from '@/lib/validations';
import RecurringExpenseForm from '@/components/recurring/RecurringExpenseForm';
import RecurringExpenseCard from '@/components/recurring/RecurringExpenseCard';
import { useAuth } from '@/contexts/AuthContext';
import { useDataOperations } from '@/hooks/useDataOperations';
import { formatCurrency, parseCurrencyInput } from '@/lib/utils';

// Helper to calculate next occurrence date
function calculateNextOccurrence(expense: RecurringExpense): Date | null {
  if (!expense.active) return null;
  if (expense.end_date && new Date(expense.end_date) < new Date()) return null;

  const fromDate = expense.last_generated_date
    ? new Date(expense.last_generated_date)
    : new Date(expense.start_date);

  // If we haven't generated yet and start date is in the future, use start date
  if (!expense.last_generated_date && new Date(expense.start_date) > new Date()) {
    return new Date(expense.start_date);
  }

  let nextDate: Date;
  switch (expense.frequency) {
    case 'weekly':
      nextDate = addWeeks(fromDate, 1);
      break;
    case 'biweekly':
      nextDate = addWeeks(fromDate, 2);
      break;
    case 'monthly':
      nextDate = addMonths(fromDate, 1);
      break;
    case 'quarterly':
      nextDate = addMonths(fromDate, 3);
      break;
    case 'yearly':
      nextDate = addYears(fromDate, 1);
      break;
    default:
      nextDate = addMonths(fromDate, 1);
  }

  // If we haven't generated anything yet, start from start_date
  if (!expense.last_generated_date) {
    return new Date(expense.start_date);
  }

  return nextDate;
}

const RecurringExpensesList = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<
    RecurringExpense | undefined
  >(undefined);
  const { recurringExpenses, categories, isLoading } = useData();
  const { session } = useAuth();
  const {
    handleRecurringExpenseSubmit: submitRecurringExpense,
    handleRecurringExpenseDelete: deleteRecurringExpense,
    handleRecurringExpenseToggle: toggleRecurringExpense,
  } = useDataOperations();

  const handleSubmit = async (values: RecurringExpenseFormData) => {
    if (!session?.user?.id) return;

    try {
      const expenseData: Partial<RecurringExpense> = {
        ...values,
        user_id: session.user.id,
        amount: parseCurrencyInput(values.amount),
        category_id:
          values.category_id === 'none' ? undefined : values.category_id,
        start_date: format(values.start_date, 'yyyy-MM-dd'),
        end_date: values.end_date
          ? format(values.end_date, 'yyyy-MM-dd')
          : undefined,
      };

      await submitRecurringExpense(expenseData, selectedExpense?.id);

      setIsFormOpen(false);
      setSelectedExpense(undefined);
    } catch {
      // Error handling is done in the hook
    }
  };

  const handleEditExpense = (expense: RecurringExpense) => {
    setSelectedExpense(expense);
    setIsFormOpen(true);
  };

  const handleToggle = async (expenseId: string, active: boolean) => {
    await toggleRecurringExpense(expenseId, active);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedExpense(undefined);
  };

  // Calculate summary stats
  const activeExpenses = recurringExpenses.filter((e) => e.active);
  const monthlyTotal = activeExpenses.reduce((sum, expense) => {
    let monthlyAmount = expense.amount;
    switch (expense.frequency) {
      case 'weekly':
        monthlyAmount = expense.amount * 4.33;
        break;
      case 'biweekly':
        monthlyAmount = expense.amount * 2.17;
        break;
      case 'quarterly':
        monthlyAmount = expense.amount / 3;
        break;
      case 'yearly':
        monthlyAmount = expense.amount / 12;
        break;
    }
    return sum + monthlyAmount;
  }, 0);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-muted-foreground mt-2">
          Loading recurring expenses...
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-4">
      {/* Header with summary */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Recurring Expenses</h2>
            {activeExpenses.length > 0 && (
              <p className="text-sm text-muted-foreground">
                ~{formatCurrency(monthlyTotal)} / month from {activeExpenses.length} active
              </p>
            )}
          </div>
          <Button onClick={() => setIsFormOpen(true)} size="sm" className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Recurring
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {recurringExpenses.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <Repeat className="h-12 w-12 text-muted-foreground/50" />
              <div>
                <p className="font-medium">No recurring expenses set up yet</p>
                <p className="text-sm text-muted-foreground">
                  Add recurring expenses like rent, subscriptions, or bills
                </p>
              </div>
              <Button onClick={() => setIsFormOpen(true)} variant="outline" className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Recurring Expense
              </Button>
            </div>
          </Card>
        ) : (
          recurringExpenses.map((expense) => {
            const nextOccurrence = calculateNextOccurrence(expense);
            const isOverdue = !!(nextOccurrence && nextOccurrence <= new Date());

            return (
              <RecurringExpenseCard
                key={expense.id}
                expense={expense}
                nextOccurrence={nextOccurrence}
                isOverdue={isOverdue}
                onEdit={handleEditExpense}
                onDelete={deleteRecurringExpense}
                onToggle={handleToggle}
              />
            );
          })
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0"
          onOpenChange={handleFormClose}
        >
          <RecurringExpenseForm
            expense={selectedExpense}
            categories={categories}
            onSubmit={handleSubmit}
            onClose={handleFormClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecurringExpensesList;
