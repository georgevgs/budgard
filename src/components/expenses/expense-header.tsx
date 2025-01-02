import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type ExpenseHeaderProps = {
    onAddClick: () => void;
};

const ExpenseHeader = ({ onAddClick }: ExpenseHeaderProps) => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            <p className="text-sm text-muted-foreground">
                Track and manage your expenses
            </p>
        </div>
        <Button onClick={onAddClick} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
        </Button>
    </div>
);

export default ExpenseHeader;