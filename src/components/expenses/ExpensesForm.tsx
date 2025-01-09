import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {DialogTitle, DialogDescription, DialogHeader} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Calendar} from "@/components/ui/calendar";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {CalendarIcon} from "lucide-react";
import {format} from "date-fns";
import {cn, formatCurrencyInput, parseCurrencyInput} from "@/lib/utils";
import {useAuth} from "@/hooks/useAuth";
import {useDataOperations} from "@/hooks/useDataOperations";
import {expenseSchema, type ExpenseFormData} from "@/lib/validations";
import type {Expense} from "@/types/Expense";
import type {Category} from "@/types/Category";

interface ExpensesFormProps {
    expense?: Expense;
    categories: Category[];
    onClose: () => void;
}

const ExpensesForm = ({
    expense,
    categories,
    onClose,
}: ExpensesFormProps) => {
    const {session} = useAuth();
    const {handleExpenseSubmit} = useDataOperations();

    const form = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            amount: expense ? formatCurrencyInput(expense.amount.toString()) : "",
            description: expense?.description || "",
            category_id: expense?.category_id || "none",
            date: expense ? new Date(expense.date) : new Date(),
        },
    });

    const handleSubmit = async (values: ExpenseFormData) => {
        if (!session?.user?.id) return;

        try {
            const expenseData: Partial<Expense> = {
                amount: parseCurrencyInput(values.amount),
                description: values.description,
                category_id: values.category_id === "none" ? undefined : values.category_id,
                date: format(values.date, "yyyy-MM-dd"),
                user_id: session.user.id
            };

            await handleExpenseSubmit(expenseData, expense?.id);
            onClose();
        } catch {
            // Error is handled by parent
        }
    };

    return (
        <div className="p-6">
            <DialogHeader>
                <DialogTitle>{expense ? "Edit" : "Add"} Expense</DialogTitle>
                <DialogDescription>
                    Fill in the details for your expense. All fields except category are required.
                </DialogDescription>
            </DialogHeader>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({field}) => (
                            <FormItem>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        €
                                    </span>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0,00"
                                            value={field.value}
                                            onChange={(e) => {
                                                const formatted = formatCurrencyInput(e.target.value);
                                                field.onChange(formatted);
                                            }}
                                            className="pl-7"
                                        />
                                    </FormControl>
                                </div>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="description"
                        render={({field}) => (
                            <FormItem>
                                <FormControl>
                                    <Input
                                        placeholder="Description"
                                        {...field}
                                        className="overflow-ellipsis"
                                    />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="category_id"
                        render={({field}) => (
                            <FormItem>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a category"/>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent position="popper" className="max-h-[300px]">
                                        <SelectItem value="none">No category</SelectItem>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{backgroundColor: category.color}}
                                                    />
                                                    {category.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="date"
                        render={({field}) => (
                            <FormItem className="flex flex-col">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4"/>
                                                {field.value ? (
                                                    format(field.value, "MMMM d, yyyy")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={false}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />

                    <div className="flex gap-3 justify-end pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.formState.isSubmitting}
                        >
                            {form.formState.isSubmitting ? "Saving..." : "Save Expense"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
};

export default ExpensesForm;