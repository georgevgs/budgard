import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import type { Expense } from "@/types/expense";
import type { Category } from "@/types/category";
import CategoryForm from "@/components/categories/category-form";
import ExpenseFormContent from "./expense-form-content";
import { cn } from "@/lib/utils";

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  expense?: Expense;
  categories: Category[];
  onCategoryAdd: (categoryData: Partial<Category>) => Promise<void>;
  onSubmit: (expenseData: Partial<Expense>, expenseId?: string) => Promise<void>;
}

const ExpenseForm = ({
  open,
  onClose,
  expense,
  categories,
  onCategoryAdd,
  onSubmit,
}: ExpenseFormProps) => {
  const [amount, setAmount] = useState(expense?.amount.toString() || "");
  const [description, setDescription] = useState(expense?.description || "");
  const [categoryId, setCategoryId] = useState(expense?.category_id || "");
  const [date, setDate] = useState<Date | undefined>(
      expense ? new Date(expense.date) : new Date()
  );
  const [loading, setLoading] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!date || loading) return;

    const trimmedDescription = description.trim();
    if (!trimmedDescription) return;

    setLoading(true);

    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      const expenseData: Partial<Expense> = {
        amount: parseFloat(amount),
        description: trimmedDescription,
        category_id: categoryId || undefined,
        date: formattedDate,
      };

      await onSubmit(expenseData, expense?.id);

      // Clear form on success (only if not editing)
      if (!expense) {
        setAmount("");
        setDescription("");
        setCategoryId("");
        setDate(new Date());
      }

      onClose();
    } catch {
      // Error is handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = useCallback(async (categoryData: Partial<Category>) => {
    try {
      // This will now handle both the API call and updating local state
      await onCategoryAdd(categoryData);
      setShowCategoryForm(false);
    } catch (error) {
      // Error is handled by parent
    }
  }, [onCategoryAdd]);

  return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden [&>button]:hidden rounded-lg">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>{expense ? "Edit" : "Add"} Expense</DialogTitle>
              <DialogDescription>
                Fill in the details for your expense. All fields except category are required.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="relative h-80">
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
                  onSubmit={handleCategorySubmit}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
  );
};

export default ExpenseForm;