import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {formatCurrency} from "@/lib/utils";
import type {Expense} from "@/types/Expense";

type ExpenseCardProps = {
    expense: Expense;
    onEdit: () => void;
    onDelete: () => void;
};

const ExpensesCard = ({expense, onEdit, onDelete}: ExpenseCardProps) => {
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
                        <p className="text-sm text-muted-foreground">
                            {new Date(expense.date).toLocaleDateString("de-DE", {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                            })}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <p className="text-lg font-semibold whitespace-nowrap">
                            {formatCurrency(expense.amount)}
                        </p>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                    <MoreVertical className="h-4 w-4"/>
                                    <span className="sr-only">Open actions menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                                <DropdownMenuItem onClick={onEdit}>
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
                                        <AlertDialogHeader className="mb-4">
                                            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete this expense?
                                                This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="flex flex-row justify-end gap-2">
                                            <AlertDialogAction
                                                onClick={onDelete}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1"
                                            >
                                                Delete
                                            </AlertDialogAction>
                                            <AlertDialogCancel className="mt-0 flex-1">Cancel</AlertDialogCancel>
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

export default ExpensesCard;