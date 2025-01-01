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
import type { Expense } from "@/types/expense";

type ExpenseCardProps = {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
};

const ExpenseCard = ({ expense, onEdit, onDelete }: ExpenseCardProps) => {
  return (
      <Card>
        <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {expense.description}
            </p>
            <p className="text-sm text-muted-foreground">
              {new Date(expense.date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <p className="font-bold text-lg">
              ${expense.amount.toFixed(2)}
            </p>
            <div className="flex gap-2">
              <Button
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                  className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
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
                    <AlertDialogAction onClick={onDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
  );
};

export default ExpenseCard;