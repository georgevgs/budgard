import { useTranslation } from 'react-i18next';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import type { LucideIcon } from 'lucide-react';

type Feature = {
  Icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  delay: string;
  accentClass: string;
};

const features: Feature[] = [
  {
    Icon: Wallet,
    titleKey: 'landing.features.easyTracking.title',
    descriptionKey: 'landing.features.easyTracking.description',
    delay: '0',
    accentClass: 'from-primary/20 to-primary/5',
  },
  {
    Icon: BarChart3,
    titleKey: 'landing.features.clearOverview.title',
    descriptionKey: 'landing.features.clearOverview.description',
    delay: '100',
    accentClass: 'from-blue-500/20 to-blue-500/5',
  },
  {
    Icon: ShieldCheck,
    titleKey: 'landing.features.secureData.title',
    descriptionKey: 'landing.features.secureData.description',
    delay: '200',
    accentClass: 'from-emerald-500/20 to-emerald-500/5',
  },
];

const Features = () => {
  const { t } = useTranslation();

  return (
    <section className="relative px-4 pb-24">
      {renderSectionHeader(t)}
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {features.map((feature) => renderFeatureCard(feature, t))}
        </div>
      </div>
    </section>
  );
};

export default Features;

// ─── Render helpers ───────────────────────────────────────────────────────────

type TranslateFn = (key: string) => string;

const renderSectionHeader = (t: TranslateFn) => (
  <div className="text-center mb-12 max-w-2xl mx-auto">
    <div className="inline-flex items-center px-3 py-1 rounded-full border border-border/50 bg-muted/30 text-xs font-medium text-muted-foreground mb-4">
      {t('landing.features.sectionTag')}
    </div>
    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
      {t('landing.features.sectionTitle')}
    </h2>
    <p className="mt-3 text-muted-foreground text-sm sm:text-base">
      {t('landing.features.sectionSubtitle')}
    </p>
  </div>
);

const renderFeatureCard = (feature: Feature, t: TranslateFn) => (
  <div
    key={feature.titleKey}
    className="group relative flex flex-col p-6 rounded-2xl bg-card/60 border border-border/50 backdrop-blur-sm transition-all duration-300 hover:border-border hover:bg-card/80 hover:shadow-md animate-fade-up overflow-hidden"
    style={{ animationDelay: `${feature.delay}ms` }}
  >
    {/* Top gradient accent bar */}
    <div
      className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${feature.accentClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
    />

    {/* Icon */}
    <div className="mb-5">
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.accentClass} border border-border/40 flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
      >
        <feature.Icon className="h-5 w-5 text-foreground/80" />
      </div>
    </div>

    <h3 className="text-base font-semibold mb-2 transition-colors duration-300 group-hover:text-primary">
      {t(feature.titleKey)}
    </h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      {t(feature.descriptionKey)}
    </p>
  </div>
);
