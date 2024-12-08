import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus } from "lucide-react"
import { ExpenseCard } from "./expense-card"

const recentExpenses = [
  {
    id: 1,
    title: "Grocery Shopping",
    amount: 156.78,
    date: "2024-03-20",
    category: "Groceries"
  },
  {
    id: 2,
    title: "Netflix Subscription",
    amount: 15.99,
    date: "2024-03-19",
    category: "Entertainment"
  },
  {
    id: 3,
    title: "Gas Station",
    amount: 45.23,
    date: "2024-03-18",
    category: "Transportation"
  },
  {
    id: 4,
    title: "Restaurant",
    amount: 89.50,
    date: "2024-03-17",
    category: "Dining"
  }
]

export function RecentExpenses() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Recent Expenses</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>
      <ScrollArea className="h-[400px] pr-4">
        <div className="grid gap-4">
          {recentExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              title={expense.title}
              amount={expense.amount}
              date={expense.date}
              category={expense.category}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}