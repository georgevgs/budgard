import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart2, PieChart, Wallet, Shield } from "lucide-react"

const features = [
  {
    title: "Easy Tracking",
    description: "Log your expenses quickly and efficiently with our intuitive interface.",
    icon: BarChart2
  },
  {
    title: "Smart Budgeting",
    description: "Set and manage budgets with intelligent recommendations based on your spending.",
    icon: Wallet
  },
  {
    title: "Insightful Reports",
    description: "Visualize your spending patterns with detailed charts and analytics.",
    icon: PieChart
  },
  {
    title: "Secure Data",
    description: "Your financial data is protected with bank-level security encryption.",
    icon: Shield
  }
]

export function Features() {
  return (
    <div className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Bugard?</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="border-none">
              <CardHeader>
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-accent/10 mb-4">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
