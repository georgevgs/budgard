import { useExpenses } from '@/hooks/useExpenses';
import { Button } from '@/components/ui/button';
import { Trash2, PencilLine } from 'lucide-react';

export function ExpenseList() {
    const { expenses, loading, error, deleteExpense } = useExpenses();

    if (loading) {
        return <div className="text-center py-4">Loading expenses...</div>;
    }

    if (error) {
        return <div className="text-red-500 py-4">Error: {error}</div>;
    }

    if (expenses.length === 0) {
        return <div className="text-center text-gray-500 py-4">No expenses yet. Add some!</div>;
    }

    return (
        <div className="space-y-4">
            {expenses.map((expense) => (
                <div
                    key={expense.id}
                    className="bg-white shadow rounded-lg p-4 flex justify-between items-center"
                >
                    <div>
                        <h3 className="font-medium">{expense.description}</h3>
                        <div className="text-sm text-gray-500">
                            <span className="capitalize">{expense.category}</span> •{' '}
                            {new Date(expense.created_at).toLocaleDateString()}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-medium">${expense.amount.toFixed(2)}</span>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    // TODO: Implement edit functionality
                                }}
                            >
                                <PencilLine className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this expense?')) {
                                        deleteExpense(expense.id);
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}