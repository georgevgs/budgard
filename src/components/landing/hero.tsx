import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart2 } from "lucide-react"

export function Hero() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-16 md:py-24">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent mb-8">
        <BarChart2 className="w-8 h-8 text-accent-foreground" />
      </div>
      <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4">
        Track Your Expenses with <span className="text-accent">Bugard</span>
      </h1>
      <p className="text-xl text-muted-foreground max-w-[600px] mb-8">
        Simple, intuitive, and powerful expense tracking to help you take control of your finances.
      </p>
      <div className="flex gap-4">
        <Button size="lg" className="bg-accent hover:bg-accent/90">
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline">
          Learn More
        </Button>
      </div>
    </div>
  )
}
