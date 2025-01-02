import type { Expense } from "@/types/expense";
import ExpenseCard from "./expense-card";

type ExpenseGridProps = {
    expenses: Expense[];
    onEdit: (expense: Expense) => void;
    onDelete: (id: string) => void;
};

const ExpenseGrid = ({ expenses, onEdit, onDelete }: ExpenseGridProps) => (
    <div className="grid gap-4">
        {expenses.map((expense) => (
            <ExpenseCard
                key={expense.id}
                expense={expense}
                onEdit={() => onEdit(expense)}
                onDelete={() => onDelete(expense.id)}
            />
        ))}
    </div>
);

export default ExpenseGrid;