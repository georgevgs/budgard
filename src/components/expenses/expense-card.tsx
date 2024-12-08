import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { CalendarDays, CreditCard, DollarSign } from "lucide-react"

interface ExpenseCardProps {
  title: string
  amount: number
  date: string
  category: string
}

export function ExpenseCard({ title, amount, date, category }: ExpenseCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(amount)}</div>
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <CalendarDays className="mr-1 h-4 w-4" />
            {date}
          </div>
          <div className="flex items-center">
            <DollarSign className="mr-1 h-4 w-4" />
            {category}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}