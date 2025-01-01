import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Expense } from "@/types/expense";
import type { Category } from "@/types/category";
import {fetchCategories} from "@/lib/categories.ts";

type ExpenseFormProps = {
  open: boolean;
  onClose: () => void;
  expense?: Expense;
  onSuccess: () => void;
};

const ExpenseForm = ({ open, onClose, expense, onSuccess }: ExpenseFormProps) => {
  const [amount, setAmount] = useState(expense?.amount.toString() || "");
  const [description, setDescription] = useState(expense?.description || "");
  const [categoryId, setCategoryId] = useState(expense?.category_id || "none");
  const [date, setDate] = useState<Date | undefined>(
      expense ? new Date(expense.date) : new Date()
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch categories when form opens
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch categories",
          variant: "destructive",
        });
      }
    };

    if (open) {
      loadCategories();
    }
  }, [open]);

  // Update form values when expense changes
  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setDescription(expense.description);
      setCategoryId(expense.category_id || "none");
      setDate(new Date(expense.date));
    } else {
      setAmount("");
      setDescription("");
      setCategoryId("");
      setDate(new Date());
    }
  }, [expense]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!date) return;
    setLoading(true);

    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      const expenseData = {
        amount: parseFloat(amount),
        description,
        category_id: categoryId === "none" ? null : categoryId,
        date: formattedDate,
      };

      if (expense) {
        const { error } = await supabase
            .from("expenses")
            .update(expenseData)
            .eq("id", expense.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
            .from("expenses")
            .insert(expenseData);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Expense ${expense ? "updated" : "added"} successfully`,
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${expense ? "update" : "add"} expense`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] p-6 rounded-lg [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>{expense ? "Edit" : "Add"} Expense</DialogTitle>
            <DialogDescription>
              Fill in the details for your expense. All fields except category are required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              />
            </div>
            <Input
                type="text"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
            />
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2 font-medium">
                        {category.name}
                      </div>
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                    )}
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
                />
              </PopoverContent>
            </Popover>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !date}>
                {loading ? "Saving..." : expense ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
  );
};

export default ExpenseForm;