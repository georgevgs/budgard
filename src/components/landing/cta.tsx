import { Button } from "@/components/ui/button"

export function CTA() {
  return (
    <div className="bg-accent text-accent-foreground">
      <div className="container mx-auto px-4 py-16 md:py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to Take Control of Your Finances?
        </h2>
        <p className="text-lg mb-8 opacity-90 max-w-[600px] mx-auto">
          Join thousands of users who are already managing their expenses smarter with Bugard.
        </p>
        <Button size="lg" variant="secondary" className="hover:bg-white/90">
          Start Your Free Trial
        </Button>
      </div>
    </div>
  )
}
