import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Expense } from "@/types/expense";

type ExpenseFormProps = {
  open: boolean;
  onClose: () => void;
  expense?: Expense;
  onSuccess: () => void;
};

const ExpenseForm = ({ open, onClose, expense, onSuccess }: ExpenseFormProps)=> {
  const [amount, setAmount] = useState(expense?.amount.toString() || "");
  const [description, setDescription] = useState(expense?.description || "");
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      if (expense) {
        const { error } = await supabase
            .from("expenses")
            .update({
              amount: parseFloat(amount),
              description,
              date,
            })
            .eq("id", expense.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert({
          amount: parseFloat(amount),
          description,
          date,
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{expense ? "Edit" : "Add"} Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                step="0.01"
            />
            <Input
                type="text"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
            />
            <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Loading..." : expense ? "Update" : "Add"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
  );
};

export default ExpenseForm;