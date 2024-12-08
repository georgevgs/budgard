import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { ArrowDownIcon, ArrowUpIcon, CreditCard, Wallet } from "lucide-react"

interface ExpenseSummaryProps {
  totalExpenses: number
  monthlyBudget: number
  remainingBudget: number
}

export function ExpenseSummary({ totalExpenses, monthlyBudget, remainingBudget }: ExpenseSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          <div className="flex items-center pt-1 text-red-600">
            <ArrowUpIcon className="h-4 w-4" />
            <span className="text-xs">+12.5% from last month</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(monthlyBudget)}</div>
          <div className="text-xs text-muted-foreground pt-1">
            Budget for current month
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(remainingBudget)}</div>
          <div className="flex items-center pt-1 text-green-600">
            <ArrowDownIcon className="h-4 w-4" />
            <span className="text-xs">Save more, spend less!</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}