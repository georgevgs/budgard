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
      <Card className="group hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Left side - Date, Description and Category */}
            <div className="flex-grow space-y-1.5">
              <div className="flex items-center gap-2">
                <p className="font-medium text-lg text-foreground line-clamp-1">
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

            {/* Right side - Amount and Actions */}
            <div className="flex flex-row md:flex-row items-center justify-between md:justify-end gap-4">
              <p className="text-xl font-semibold text-foreground whitespace-nowrap">
                ${expense.amount.toFixed(2)}
              </p>
              <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onEdit}
                    className="h-9 px-2.5"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-2.5 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Delete</span>
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