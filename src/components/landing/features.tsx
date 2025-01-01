import { CircleDollarSign, PieChart, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: CircleDollarSign,
    title: "Easy Tracking",
    description: "Record your expenses quickly and efficiently",
  },
  {
    icon: PieChart,
    title: "Clear Overview",
    description: "See where your money goes at a glance",
  },
  {
    icon: Shield,
    title: "Secure Data",
    description: "Your financial data is always protected",
  },
];

const Features = () => {
  return (
      <div className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
                <div
                    key={feature.title}
                    className="flex flex-col items-center text-center p-6"
                >
                  <feature.icon className="h-12 w-12 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
            ))}
          </div>
        </div>
      </div>
  );
};

export default Features;