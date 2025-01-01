import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Expense } from "@/types/expense";

type ExpenseFormProps = {
  open: boolean;
  onClose: () => void;
  expense?: Expense;
  onSuccess: () => void;
};

const ExpenseForm = ({ open, onClose, expense, onSuccess }: ExpenseFormProps) => {
  const [amount, setAmount] = useState(expense?.amount.toString() || "");
  const [description, setDescription] = useState(expense?.description || "");
  const [date, setDate] = useState<Date | undefined>(
      expense ? new Date(expense.date) : new Date()
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Update form values when expense changes
  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setDescription(expense.description);
      setDate(new Date(expense.date));
    } else {
      setAmount("");
      setDescription("");
      setDate(new Date());
    }
  }, [expense]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!date) return;
    setLoading(true);

    try {
      const formattedDate = format(date, "yyyy-MM-dd");

      if (expense) {
        const { error } = await supabase
            .from("expenses")
            .update({
              amount: parseFloat(amount),
              description,
              date: formattedDate,
            })
            .eq("id", expense.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert({
          amount: parseFloat(amount),
          description,
          date: formattedDate,
        });

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