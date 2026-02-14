import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoreVertical, Clock } from 'lucide-react';
import CategoryBadge from '@/components/categories/CategoryBadge';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import type { RecurringExpense } from '@/types/RecurringExpense';

const frequencyLabels: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

interface RecurringExpenseCardProps {
  expense: RecurringExpense;
  nextOccurrence: Date | null;
  isOverdue: boolean;
  onEdit: (expense: RecurringExpense) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}

const RecurringExpenseCard = ({
  expense,
  nextOccurrence,
  isOverdue,
  onEdit,
  onDelete,
  onToggle,
}: RecurringExpenseCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const blurActiveElement = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleEditClick = () => {
    blurActiveElement();
    setDropdownOpen(false);
    setTimeout(() => onEdit(expense), 0);
  };

  const handleDeleteClick = () => {
    blurActiveElement();
    setDropdownOpen(false);
    setTimeout(() => setShowDeleteDialog(true), 0);
  };

  return (
    <>
      <Card
        className={`transition-opacity ${!expense.active ? 'opacity-60 bg-muted/30' : ''}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left side - Main info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {expense.description}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {expense.category && (
                  <CategoryBadge category={expense.category} />
                )}
                <Badge variant="secondary" className="text-xs">
                  {frequencyLabels[expense.frequency] || expense.frequency}
                </Badge>
                {isOverdue && expense.active && (
                  <Badge variant="destructive" className="text-xs">
                    Due
                  </Badge>
                )}
              </div>
              <p className="text-base font-semibold mt-1">
                {formatCurrency(expense.amount)}
              </p>
              {nextOccurrence && expense.active && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Next: {format(nextOccurrence, 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={expense.active}
                onCheckedChange={(checked) => onToggle(expense.id, checked)}
                aria-label={`Toggle ${expense.description}`}
              />
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={handleEditClick}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDeleteClick}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          className="sm:max-w-[425px]"
          onOpenChange={setShowDeleteDialog}
        >
          <AlertDialogHeader data-draggable-area>
            <AlertDialogTitle>Delete Recurring Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring expense? This
              won&apos;t affect previously generated expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(expense.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RecurringExpenseCard;
