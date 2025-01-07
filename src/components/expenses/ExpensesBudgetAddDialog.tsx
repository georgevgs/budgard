import {useEffect} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {useAuth} from "@/contexts/AuthContext";
import {useData} from "@/contexts/DataContext";
import {useDataOperations} from "@/hooks/useDataOperations";
import {budgetSchema, type BudgetFormData} from "@/lib/validations";
import type {Budget} from "@/types/Budget";

interface ExpensesBudgetAddDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    existingBudget: Budget | null;
}

const ExpensesBudgetAddDialog = ({
    isOpen,
    onOpenChange,
    existingBudget,
}: ExpensesBudgetAddDialogProps) => {
    const {session} = useAuth();
    const {isInitialized} = useData();
    const {handleBudgetUpdate} = useDataOperations();

    const form = useForm<BudgetFormData>({
        resolver: zodResolver(budgetSchema),
        defaultValues: {
            amount: existingBudget?.amount.toString() || "",
        },
    });

    // Reset form when dialog opens/closes or when existingBudget changes
    useEffect(() => {
        if (isOpen) {
            form.reset({
                amount: existingBudget?.amount.toString() || "",
            });
        }
    }, [isOpen, existingBudget, form]);

    const handleSubmit = async (values: BudgetFormData) => {
        if (!session?.user?.id || !isInitialized) return;

        try {
            const success = await handleBudgetUpdate({
                id: existingBudget?.id,
                amount: parseFloat(values.amount),
                user_id: session.user.id
            });

            if (success) {
                onOpenChange(false);
            }
        } catch (error) {
            console.error("Budget submission error:", error);
        }
    };

    // Prevent interactions if data isn't initialized
    const isDisabled = form.formState.isSubmitting || !isInitialized;

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
                    <DialogDescription id="budget-form-description">
                        {existingBudget
                            ? `Your current budget is €${existingBudget.amount.toFixed(2)}. Enter a new amount to update it.`
                            : "Set your monthly budget amount"}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({field}) => (
                                <FormItem>
                                    <div className="grid gap-2">
                                        <span className="text-sm font-medium">Budget Amount</span>
                                        <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        €
                      </span>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    inputMode="decimal"
                                                    placeholder="Enter total monthly budget"
                                                    {...field}
                                                    className="pl-7"
                                                    min="0"
                                                    step="0.01"
                                                    disabled={isDisabled}
                                                    aria-label="Monthly budget amount"
                                                />
                                            </FormControl>
                                        </div>
                                    </div>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isDisabled}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isDisabled || !form.formState.isDirty}
                            >
                                {form.formState.isSubmitting
                                    ? "Saving..."
                                    : existingBudget
                                        ? "Update Budget"
                                        : "Set Budget"
                                }
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default ExpensesBudgetAddDialog;