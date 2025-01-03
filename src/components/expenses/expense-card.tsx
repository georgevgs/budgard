import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Trash2, Edit } from "lucide-react";
import CategoryBadge from "@/components/categories/category-badge";
import type { Expense } from "@/types/expense";

type ExpenseCardProps = {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
};

const ExpenseCard = ({ expense, onEdit, onDelete }: ExpenseCardProps) => {
  return (
      <Card className="group hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <CardContent className="px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-base text-foreground truncate">
                  {expense.description}
                </p>
                {expense.category && (
                    <CategoryBadge category={expense.category} />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(expense.date).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-lg font-semibold text-foreground whitespace-nowrap">
                {expense.amount.toFixed(2)}€
              </p>
              <div className="flex gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEdit}
                    className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this expense? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                          onClick={onDelete}
                          className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
  );
};

export default ExpenseCard;