import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import type { Expense } from "@/types/expense";
import type { Category } from "@/types/category";
import { fetchCategories } from "@/lib/categories";
import CategoryForm from "@/components/categories/category-form.tsx";
import ExpenseFormContent from "./expense-form-content";
import {cn} from "@/lib/utils.ts";

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  expense?: Expense;
  onSuccess: () => void;
}

const ExpenseForm = ({
  open,
  onClose,
  expense,
  onSuccess
}: ExpenseFormProps) => {
  const [amount, setAmount] = useState(expense?.amount.toString() || "");
  const [description, setDescription] = useState(expense?.description || "");
  const [categoryId, setCategoryId] = useState(expense?.category_id || "");
  const [date, setDate] = useState<Date | undefined>(
      expense ? new Date(expense.date) : new Date()
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setDescription(expense.description);
      setCategoryId(expense.category_id || "");
      setDate(new Date(expense.date));
    } else {
      setAmount("");
      setDescription("");
      setCategoryId("");
      setDate(new Date());
    }
  }, [expense]);

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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!date) return;
    setLoading(true);

    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      const expenseData = {
        amount: parseFloat(amount),
        description,
        category_id: categoryId || null,
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

  const handleCategorySuccess = (newCategory: Category) => {
    setCategories((prev) => [...prev, newCategory]);
    setCategoryId(newCategory.id);
    setShowCategoryForm(false);
  };

  return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden [&>button]:hidden">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>{expense ? "Edit" : "Add"} Expense</DialogTitle>
              <DialogDescription>
                Fill in the details for your expense. All fields except category are required.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="relative h-[480px]">
            <div
                className={cn(
                    "absolute inset-0 transition-transform duration-300 ease-in-out px-6 pb-6",
                    showCategoryForm ? "-translate-x-full" : "translate-x-0"
                )}
            >
              <ExpenseFormContent
                  amount={amount}
                  setAmount={setAmount}
                  description={description}
                  setDescription={setDescription}
                  categoryId={categoryId}
                  setCategoryId={setCategoryId}
                  date={date}
                  setDate={setDate}
                  categories={categories}
                  loading={loading}
                  onSubmit={handleSubmit}
                  onClose={onClose}
                  onAddCategory={() => setShowCategoryForm(true)}
              />
            </div>

            <div
                className={cn(
                    "absolute inset-0 transition-transform duration-300 ease-in-out px-6 pb-6",
                    showCategoryForm ? "translate-x-0" : "translate-x-full"
                )}
            >
              <CategoryForm
                  onBack={() => setShowCategoryForm(false)}
                  onSuccess={handleCategorySuccess}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
  );
};

export default ExpenseForm;