import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Edit } from 'lucide-react';
import type { Expense } from '@/types/expense';

interface ExpenseCardProps {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
}

export function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-4">
        <div className="flex-1">
          <p className="font-medium">{expense.description}</p>
          <p className="text-sm text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <p className="font-bold flex-1 sm:flex-none">${expense.amount.toFixed(2)}</p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}