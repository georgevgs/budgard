import {useState} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {Plus, MoreVertical, Calendar} from "lucide-react";
import {useData} from "@/contexts/DataContext";
import {Dialog, DialogContent} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {format} from "date-fns";
import type {RecurringExpense} from "@/types/RecurringExpense";
import type {RecurringExpenseFormData} from "@/lib/validations";
import RecurringExpenseForm from "@/components/recurring/RecurringExpenseForm";
import CategoryBadge from "@/components/categories/CategoryBadge";
import {useAuth} from "@/contexts/AuthContext";
import {useDataOperations} from "@/hooks/useDataOperations";
import {parseCurrencyInput} from "@/lib/utils";

const RecurringExpensesList = () => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<RecurringExpense | undefined>(undefined);
    const {recurringExpenses, categories, isLoading} = useData();
    const {session} = useAuth();
    const {
        handleRecurringExpenseSubmit: submitRecurringExpense,
        handleRecurringExpenseDelete: deleteRecurringExpense
    } = useDataOperations();

    const handleSubmit = async (values: RecurringExpenseFormData) => {
        if (!session?.user?.id) return;

        try {
            const expenseData: Partial<RecurringExpense> = {
                ...values,
                user_id: session.user.id,
                amount: parseCurrencyInput(values.amount),
                category_id: values.category_id === "none" ? undefined : values.category_id,
                start_date: format(values.start_date, "yyyy-MM-dd"),
                end_date: values.end_date ? format(values.end_date, "yyyy-MM-dd") : undefined
            };

            await submitRecurringExpense(expenseData, selectedExpense?.id);

            setIsFormOpen(false);
            setSelectedExpense(undefined);
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    const handleEditExpense = (expense: RecurringExpense) => {
        setSelectedExpense(expense);
        setIsFormOpen(true);
    };

    const handleDeleteExpense = async (expenseId: string) => {
        await deleteRecurringExpense(expenseId);
    };

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div
                    className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"/>
                <p className="text-sm text-muted-foreground mt-2">Loading recurring expenses...</p>
            </div>
        );
    }

    return (
        <div className="container max-w-4xl mx-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recurring Expenses</h2>
                <Button onClick={() => setIsFormOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2"/>
                    Add Recurring
                </Button>
            </div>

            <div className="grid gap-4">
                {recurringExpenses.length === 0 ? (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground mb-4">
                            No recurring expenses set up yet
                        </p>
                        <Button onClick={() => setIsFormOpen(true)} variant="outline">
                            <Plus className="h-4 w-4 mr-2"/>
                            Add Your First Recurring Expense
                        </Button>
                    </Card>
                ) : (
                    recurringExpenses.map((expense) => (
                        <Card key={expense.id} className={`p-4 ${!expense.active ? "opacity-60" : ""}`}>
                            <CardContent className="flex items-center justify-between p-0">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium">{expense.description}</span>
                                        {expense.category && (
                                            <CategoryBadge category={expense.category}/>
                                        )}
                                        {!expense.active && (
                                            <span className="text-xs text-muted-foreground">(Paused)</span>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <div>€{expense.amount.toFixed(2)} • {expense.frequency}</div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3"/>
                                            <span>
                                                Starts {format(new Date(expense.start_date), "MMM d, yyyy")}
                                                {expense.end_date && ` • Ends ${format(new Date(expense.end_date), "MMM d, yyyy")}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4"/>
                                            <span className="sr-only">Open menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEditExpense(expense)}>
                                            Edit
                                        </DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem
                                                    onSelect={(e) => e.preventDefault()}
                                                    className="text-destructive"
                                                >
                                                    Delete
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="sm:max-w-[425px]">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Recurring Expense</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete this recurring expense?
                                                        This won't affect previously generated expenses.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDeleteExpense(expense.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Dialog
                open={isFormOpen}
                onOpenChange={() => {
                    setIsFormOpen(false);
                    setSelectedExpense(undefined);
                }}
            >
                <DialogContent
                    className="sm:max-w-[425px] p-0 overflow-hidden rounded-lg"
                    onOpenAutoFocus={(e) => e.preventDefault()}
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
        </div>
    );
};

export default RecurringExpensesList;