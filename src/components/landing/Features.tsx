type Feature = {
  icon: string;
  iconAlt: string;
  title: string;
  description: string;
  delay: string;
};

const features: Feature[] = [
  {
    icon: '/icons/money-bag.png',
    iconAlt: 'Money bag',
    title: 'Easy Tracking',
    description: 'Record your expenses quickly and efficiently',
    delay: '0',
  },
  {
    icon: '/icons/bar-chart.png',
    iconAlt: 'Bar chart',
    title: 'Clear Overview',
    description: 'See where your money goes at a glance',
    delay: '100',
  },
  {
    icon: '/icons/shield.png',
    iconAlt: 'Shield',
    title: 'Secure Data',
    description: 'Your financial data is always protected',
    delay: '200',
  },
];

const Features = () => {
  return (
    <div className="relative px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group flex flex-col items-center text-center p-6 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/20 transition-all duration-300 hover:bg-accent/40 animate-fade-up"
              style={{ animationDelay: `${feature.delay}ms` }}
            >
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl transition-opacity duration-500 opacity-0 group-hover:opacity-100" />
                <img
                  src={feature.icon}
                  alt={feature.iconAlt}
                  className="relative h-16 w-16 animate-float drop-shadow-md transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <h3 className="text-base font-semibold mb-1.5 transition-colors duration-300 group-hover:text-primary">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
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
