import { useTranslation } from 'react-i18next';

type Feature = {
  icon: string;
  iconAltKey: string;
  titleKey: string;
  descriptionKey: string;
  delay: string;
};

const features: Feature[] = [
  {
    icon: '/icons/money-bag.png',
    iconAltKey: 'landing.features.easyTracking.iconAlt',
    titleKey: 'landing.features.easyTracking.title',
    descriptionKey: 'landing.features.easyTracking.description',
    delay: '0',
  },
  {
    icon: '/icons/bar-chart.png',
    iconAltKey: 'landing.features.clearOverview.iconAlt',
    titleKey: 'landing.features.clearOverview.title',
    descriptionKey: 'landing.features.clearOverview.description',
    delay: '100',
  },
  {
    icon: '/icons/shield.png',
    iconAltKey: 'landing.features.secureData.iconAlt',
    titleKey: 'landing.features.secureData.title',
    descriptionKey: 'landing.features.secureData.description',
    delay: '200',
  },
];

const Features = () => {
  const { t } = useTranslation();

  return (
    <div className="relative px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.titleKey}
              className="group flex flex-col items-center text-center p-6 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/20 transition-all duration-300 hover:bg-accent/40 animate-fade-up"
              style={{ animationDelay: `${feature.delay}ms` }}
            >
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl transition-opacity duration-500 opacity-0 group-hover:opacity-100" />
                <div className="transition-transform duration-300 group-hover:scale-110">
                  <img
                    src={feature.icon}
                    alt={t(feature.iconAltKey)}
                    className="h-16 w-16 animate-float drop-shadow-md"
                  />
                </div>
              </div>
              <h3 className="text-base font-semibold mb-1.5 transition-colors duration-300 group-hover:text-primary">
                {t(feature.titleKey)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(feature.descriptionKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
