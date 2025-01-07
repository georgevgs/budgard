import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import type {Budget} from "@/types/Budget";

interface ExpensesBudgetAddDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAddBudget: (budgetAmount: string) => Promise<void>;
    existingBudget?: Budget;
}

const ExpensesBudgetAddDialog = ({
    isOpen,
    onOpenChange,
    onAddBudget,
    existingBudget
}: ExpensesBudgetAddDialogProps) => {
    const [budgetAmount, setBudgetAmount] = useState<string>(
        existingBudget ? existingBudget.amount.toString() : ""
    );

    const handleSubmit = async () => {
        if (!budgetAmount) return;

        await onAddBudget(budgetAmount);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[425px] rounded-lg"
                aria-describedby="budget-form-description"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>
                        {existingBudget ? "Edit Budget" : "Set Budget"}
                    </DialogTitle>
                    <DialogDescription>
                        Set your monthly budget amount
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {/* Budget Amount Input */}
                    <div className="grid gap-2">
                        <span className="text-sm font-medium">Budget Amount</span>
                        <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            €
                        </span>
                            <Input
                                type="number"
                                placeholder="Enter total monthly budget"
                                value={budgetAmount}
                                onChange={(e) => setBudgetAmount(e.target.value)}
                                className="pl-7"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={!budgetAmount}>
                            {existingBudget ? "Update Budget" : "Set Budget"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ExpensesBudgetAddDialog;