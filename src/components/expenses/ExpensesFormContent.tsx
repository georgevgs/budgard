import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
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
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/Utils.ts";
import type { Category } from "@/types/Category.ts";

interface ExpenseFormContentProps {
    amount: string;
    setAmount: (value: string) => void;
    description: string;
    setDescription: (value: string) => void;
    categoryId: string;
    setCategoryId: (value: string) => void;
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    categories: Category[];
    loading: boolean;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    onClose: () => void;
    onAddCategory: () => void;
}

const ExpensesFormContent = ({
    amount,
    setAmount,
    description,
    setDescription,
    categoryId,
    setCategoryId,
    date,
    setDate,
    categories,
    loading,
    onSubmit,
    onClose,
    onAddCategory,
}: ExpenseFormContentProps) => {
    const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Prevent starting with space
        if (value === ' ' && !description) return;
        // Prevent multiple spaces
        if (value.includes('  ')) return;
        setDescription(value);
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    €
                </span>
                <Input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    step="0.01"
                    min="0"
                    className="pl-7"
                    disabled={loading}
                />
            </div>

            <Input
                type="text"
                placeholder="Description"
                value={description}
                onChange={handleDescriptionChange}
                required
                maxLength={100}
                disabled={loading}
            />

            <div className="flex gap-2">
                <Select
                    value={categoryId}
                    onValueChange={setCategoryId}
                    disabled={loading}
                >
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: category.color }}
                                    />
                                    {category.name}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={onAddCategory}
                    className="shrink-0"
                    disabled={loading}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                        disabled={loading}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        disabled={loading}
                    />
                </PopoverContent>
            </Popover>

            <div className="flex gap-3 justify-end">
                <Button
                    variant="outline"
                    onClick={onClose}
                    type="button"
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={loading || !date}
                >
                    {loading ? "Saving..." : "Save Expense"}
                </Button>
            </div>
        </form>
    );
};

export default ExpensesFormContent;