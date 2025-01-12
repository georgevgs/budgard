import {Switch} from "@/components/ui/switch";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {MoreVertical} from "lucide-react";
import CategoryBadge from "@/components/categories/CategoryBadge";
import {format} from "date-fns";
import type {RecurringExpense} from "@/types/RecurringExpense";

const frequencyLabels = {
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly"
} as const;

interface RecurringExpenseCardProps {
    expense: RecurringExpense;
    onEdit: (expense: RecurringExpense) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string, active: boolean) => void;
}

const RecurringExpenseCard = ({
    expense,
    onEdit,
    onDelete,
    onToggle
}: RecurringExpenseCardProps) => {
    return (
        <Card className="rounded-lg transition-colors hover:bg-accent">
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-base truncate">
                                {expense.description}
                            </p>
                            {expense.category && (
                                <CategoryBadge category={expense.category}/>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{frequencyLabels[expense.frequency]}</span>
                            <span>•</span>
                            <span>€{expense.amount.toFixed(2)}</span>
                            {expense.end_date && (
                                <>
                                    <span>•</span>
                                    <span>Until {format(new Date(expense.end_date), "MMM d, yyyy")}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Switch
                            checked={expense.active}
                            onCheckedChange={(checked) => onToggle(expense.id, checked)}
                            aria-label={`Toggle ${expense.description} recurring expense`}
                        />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                    <MoreVertical className="h-4 w-4"/>
                                    <span className="sr-only">Open menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                                <DropdownMenuItem onClick={() => onEdit(expense)}>
                                    Edit
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                            onSelect={(e) => e.preventDefault()}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            Delete
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="sm:max-w-[400px] rounded-lg">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Recurring Expense</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete this recurring expense?
                                                This will not delete previously created expenses.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="flex flex-row justify-end gap-2">
                                            <AlertDialogAction
                                                onClick={() => onDelete(expense.id)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1"
                                            >
                                                Delete
                                            </AlertDialogAction>
                                            <AlertDialogCancel className="mt-0 flex-1">
                                                Cancel
                                            </AlertDialogCancel>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default RecurringExpenseCard;