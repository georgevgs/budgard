import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

type HeroProps = {
    onGetStarted: () => void;
};

const Hero = ({ onGetStarted }: HeroProps) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
                Track expenses with
                <span className="block">simplicity and ease</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl">
                A minimal and intuitive expense tracker that helps you manage your finances without the complexity.
            </p>
            <Button
                size="lg"
                className="mt-8"
                onClick={onGetStarted}
            >
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
};

export default Hero;