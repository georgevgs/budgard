import { Button } from '@/components/ui/button';
import { ArrowRight, Wallet, TrendingDown, CreditCard } from 'lucide-react';

type HeroProps = {
  onGetStarted: () => void;
};

const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <div className="relative overflow-hidden pt-12 pb-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)] -z-10" />

      <div className="relative px-4 pt-12 mx-auto max-w-7xl">
        <div className="text-center space-y-6 animate-fade-up">
          {/* Floating Icon Badges */}
          <div className="flex justify-center gap-4 mb-8">
            <div className="animate-float delay-100 flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div className="animate-float delay-200 flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 border border-primary/25 shadow-xl">
              <TrendingDown className="h-8 w-8 text-primary" />
            </div>
            <div className="animate-float delay-300 flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Track expenses with
            <span className="block mt-1 bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
              simplicity and ease
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground">
            A minimal and intuitive expense tracker that helps you manage your
            finances without the complexity. Start organizing your spending
            today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="group min-w-[200px] animate-fade-up delay-200"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground animate-fade-up delay-300">
            Free to use · No credit card required
          </p>

          {/* App Preview */}
          <div
            className="mt-4 mx-auto max-w-[300px] rounded-2xl border bg-card/90 backdrop-blur-sm shadow-2xl overflow-hidden animate-fade-up text-left"
            style={{ animationDelay: '400ms' }}
          >
            {renderPreviewHeader()}
            <div className="p-2">
              {renderPreviewExpense('Rent', 'Housing', '€800.00', '#6366f1')}
              {renderPreviewExpense('Groceries', 'Food', '€245.50', '#22c55e')}
              {renderPreviewExpense(
                'Netflix',
                'Subscriptions',
                '€12.99',
                '#f97316',
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderPreviewHeader = () => (
  <div className="px-4 pt-4 pb-3 border-b bg-muted/20">
    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
      February 2026
    </p>
    <p className="text-xl font-bold tabular-nums mt-0.5">€1,058.49</p>
    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full bg-primary" style={{ width: '53%' }} />
    </div>
    <p className="text-xs text-muted-foreground mt-1">53% of €2,000 budget</p>
  </div>
);

const renderPreviewExpense = (
  description: string,
  category: string,
  amount: string,
  color: string,
) => (
  <div
    key={description}
    className="flex items-center gap-3 px-2 py-2 rounded-lg"
  >
    <div
      className="w-1 h-8 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium truncate">{description}</p>
      <p className="text-xs text-muted-foreground">{category}</p>
    </div>
    <p className="text-xs font-semibold tabular-nums">{amount}</p>
  </div>
);

export default Hero;
