import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";

type EmptyExpenseStateProps = {
    selectedMonth: string;
    onAddClick: () => void;
};

const EmptyExpenseState = ({ selectedMonth, onAddClick }: EmptyExpenseStateProps) => (
    <div className="text-center py-12 px-4 rounded-lg border-2 border-dashed">
        <h3 className="text-lg font-semibold mb-1">
            No expenses for {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
            Add your first expense for this month
        </p>
        <Button onClick={onAddClick} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
        </Button>
    </div>
);

export default EmptyExpenseState;