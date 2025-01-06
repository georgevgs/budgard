import type { Expense } from "@/types/Expense";
import ExpensesCard from "@/components/expenses/ExpensesCard.tsx";

interface ExpensesGridProps {
    expenses: Expense[];
    onEdit: (expense: Expense) => void;
    onDelete: (id: string) => void;
}

const ExpensesGrid = ({ expenses, onEdit, onDelete }: ExpensesGridProps) => (
    <div className="grid gap-4 pb-6">
        {expenses.map((expense) => (
            <ExpensesCard
                key={expense.id}
                expense={expense}
                onEdit={() => onEdit(expense)}
                onDelete={() => onDelete(expense.id)}
            />
        ))}
    </div>
);

export default ExpensesGrid;
