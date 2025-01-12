import {useEffect} from "react";
import {useTranslation} from "react-i18next";
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
import {formatCurrency, formatCurrencyInput, parseCurrencyInput} from "@/lib/utils";
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
    const {t} = useTranslation();
    const {session} = useAuth();
    const {isInitialized} = useData();
    const {handleBudgetUpdate} = useDataOperations();

    const form = useForm<BudgetFormData>({
        resolver: zodResolver(budgetSchema),
        defaultValues: {
            amount: existingBudget ? formatCurrencyInput(existingBudget.amount.toString()) : "",
        },
    });

    useEffect(() => {
        if (isOpen) {
            form.reset({
                amount: existingBudget ? formatCurrencyInput(existingBudget.amount.toString()) : "",
            });
        }
    }, [isOpen, existingBudget, form]);

    const handleSubmit = async (values: BudgetFormData) => {
        if (!session?.user?.id || !isInitialized) return;

        try {
            const success = await handleBudgetUpdate({
                id: existingBudget?.id,
                amount: parseCurrencyInput(values.amount),
                user_id: session.user.id
            });

            if (success) {
                onOpenChange(false);
            }
        } catch (error) {
            console.error("Budget submission error:", error);
        }
    };

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
                        {existingBudget ? t("budget.editBudget") : t("budget.setBudget")}
                    </DialogTitle>
                    <DialogDescription id="budget-form-description">
                        {existingBudget
                            ? t("budget.updateDescription", {
                                amount: formatCurrency(existingBudget.amount)
                            })
                            : t("budget.setDescription")}
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
                                        <span className="text-sm font-medium">
                                            {t("budget.amountLabel")}
                                        </span>
                                        <div className="relative">
                                            <span
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                €
                                            </span>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder={t("budget.amountPlaceholder")}
                                                    value={field.value}
                                                    onChange={(e) => {
                                                        const formatted = formatCurrencyInput(e.target.value);
                                                        field.onChange(formatted);
                                                    }}
                                                    className="pl-7"
                                                    disabled={isDisabled}
                                                    aria-label={t("budget.amountAriaLabel")}
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
                                {t("common.cancel")}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isDisabled || !form.formState.isDirty}
                            >
                                {form.formState.isSubmitting
                                    ? t("common.saving")
                                    : existingBudget
                                        ? t("budget.updateButton")
                                        : t("budget.setButton")
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