import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  MoreVertical,
  Calendar,
  Clock,
  Repeat,
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, addWeeks, addMonths, addYears } from 'date-fns';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { RecurringExpenseFormData } from '@/lib/validations';
import RecurringExpenseForm from '@/components/recurring/RecurringExpenseForm';
import CategoryBadge from '@/components/categories/CategoryBadge';
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

// Helper to format frequency for display
function formatFrequency(frequency: string): string {
  const labels: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Every 2 weeks',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };
  return labels[frequency] || frequency;
}

const RecurringExpensesList = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<
    RecurringExpense | undefined
  >(undefined);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
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
    setOpenDropdownId(null);
    setSelectedExpense(expense);
    setTimeout(() => setIsFormOpen(true), 0);
  };

  const handleDeleteClick = (expenseId: string) => {
    setOpenDropdownId(null);
    setTimeout(() => setExpenseToDelete(expenseId), 0);
  };

  const handleDeleteExpense = async () => {
    if (expenseToDelete) {
      await deleteRecurringExpense(expenseToDelete);
      setExpenseToDelete(null);
    }
  };

  const handleToggle = async (expenseId: string, active: boolean) => {
    await toggleRecurringExpense(expenseId, active);
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recurring Expenses</h2>
            {activeExpenses.length > 0 && (
              <p className="text-sm text-muted-foreground">
                ~{formatCurrency(monthlyTotal)}/month from {activeExpenses.length} active
              </p>
            )}
          </div>
          <Button onClick={() => setIsFormOpen(true)} size="sm">
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
            const isOverdue = nextOccurrence && nextOccurrence <= new Date();

            return (
              <Card
                key={expense.id}
                className={`transition-opacity ${!expense.active ? 'opacity-60 bg-muted/30' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side - Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-medium truncate">
                          {expense.description}
                        </span>
                        {expense.category && (
                          <CategoryBadge category={expense.category} />
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {formatFrequency(expense.frequency)}
                        </Badge>
                        {!expense.active && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Paused
                          </Badge>
                        )}
                        {isOverdue && expense.active && (
                          <Badge variant="destructive" className="text-xs">
                            Due
                          </Badge>
                        )}
                      </div>

                      <div className="text-xl font-semibold mb-2">
                        {formatCurrency(expense.amount)}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            Started {format(new Date(expense.start_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {expense.end_date && (
                          <div className="flex items-center gap-1">
                            <span>
                              Ends {format(new Date(expense.end_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}
                        {nextOccurrence && expense.active && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              Next: {format(nextOccurrence, 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}
                        {expense.last_generated_date && (
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground/70">
                              Last: {format(new Date(expense.last_generated_date), 'MMM d')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side - Controls */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {expense.active ? 'Active' : 'Paused'}
                        </span>
                        <Switch
                          checked={expense.active}
                          onCheckedChange={(checked) =>
                            handleToggle(expense.id, checked)
                          }
                        />
                      </div>
                      <DropdownMenu
                        open={openDropdownId === expense.id}
                        onOpenChange={(open) =>
                          setOpenDropdownId(open ? expense.id : null)
                        }
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditExpense(expense)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(expense.id)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog
        open={isFormOpen}
        onOpenChange={() => {
          setIsFormOpen(false);
          setSelectedExpense(undefined);
        }}
        modal={false}
      >
        <DialogContent
          className="sm:max-w-[425px] p-0 overflow-hidden rounded-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <RecurringExpenseForm
            expense={selectedExpense}
            categories={categories}
            onSubmit={handleSubmit}
            onClose={() => {
              setIsFormOpen(false);
              setSelectedExpense(undefined);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={expenseToDelete !== null}
        onOpenChange={(open) => !open && setExpenseToDelete(null)}
      >
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring expense? This
              won&apos;t affect previously generated expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpense}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecurringExpensesList;
