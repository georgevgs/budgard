import {useState, useEffect} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useToast} from "@/hooks/useToast";
import type {Budget} from "@/types/Budget";
import type {Session} from "@supabase/supabase-js";

interface ExpensesBudgetAddDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    existingBudget: Budget | null;
    onAddBudget: (budgetData: Partial<Budget> & { user_id: string }) => Promise<boolean>;
    session: Session | null;
}

const ExpensesBudgetAddDialog = ({
    isOpen,
    onOpenChange,
    existingBudget,
    onAddBudget,
    session
}: ExpensesBudgetAddDialogProps) => {
    const [budgetAmount, setBudgetAmount] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const {toast} = useToast();

    // Update budget amount when dialog opens with existing budget
    useEffect(() => {
        if (isOpen && existingBudget) {
            setBudgetAmount(existingBudget.amount.toString());
        } else if (!isOpen) {
            setBudgetAmount(""); // Reset when dialog closes
        }
    }, [isOpen, existingBudget]);

    const handleSubmit = async () => {
        if (!budgetAmount) return;

        setIsSubmitting(true);
        try {
            if (!session?.user?.id) {
                toast({
                    title: "Error",
                    description: "User session is required",
                    variant: "destructive"
                });
                return;
            }

            const success = await onAddBudget({
                id: existingBudget?.id,
                amount: parseFloat(budgetAmount),
                user_id: session.user.id
            });

            if (success) {
                onOpenChange(false);
            }
        } catch (error) {
            console.error("Budget submission error:", error);
        } finally {
            setIsSubmitting(false);
        }
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
                        {existingBudget
                            ? `Your current budget is €${existingBudget.amount.toFixed(2)}. Enter a new amount to update it.`
                            : "Set your monthly budget amount"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
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
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!budgetAmount || isSubmitting}
                        >
                            {isSubmitting
                                ? "Saving..."
                                : existingBudget
                                    ? "Update Budget"
                                    : "Set Budget"
                            }
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ExpensesBudgetAddDialog;