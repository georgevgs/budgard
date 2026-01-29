import { Button } from '@/components/ui/button';
import { ArrowRight, LineChart, WalletCards, Shield } from 'lucide-react';

type HeroProps = {
  onGetStarted: () => void;
};

const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <div className=" relative overflow-hidden pt-12 pb-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)] -z-10" />

      <div className="relative px-4 pt-12 mx-auto max-w-7xl">
        <div className="text-center space-y-6 animate-fade-up">
          {/* Stats Section */}
          <div className="flex justify-center gap-4 mb-8">
            <div className="animate-float delay-100">
              <LineChart className="w-8 h-8 text-primary/80" />
            </div>
            <div className="animate-float delay-200">
              <WalletCards className="w-8 h-8 text-primary/80" />
            </div>
            <div className="animate-float delay-300">
              <Shield className="w-8 h-8 text-primary/80" />
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
        </div>
      </div>
    </div>
  );
};

export default Hero;
