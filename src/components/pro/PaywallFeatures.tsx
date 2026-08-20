import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import ChartPie from 'lucide-react/dist/esm/icons/chart-pie';
import Target from 'lucide-react/dist/esm/icons/target';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import FileDown from 'lucide-react/dist/esm/icons/file-down';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';

type FeatureIcon = ComponentType<{ className?: string }>;

type Feature = {
  key: string;
  Icon: FeatureIcon;
};

// Array order is display order; keys are stable i18n ids (pro.features.*).
const FEATURES: Feature[] = [
  { key: 'f1', Icon: ChartPie },
  { key: 'f2', Icon: Target },
  { key: 'f3', Icon: Repeat },
  { key: 'f4', Icon: TrendingUp },
  { key: 'f7', Icon: Wallet },
  { key: 'f8', Icon: TrendingDown },
  { key: 'f5', Icon: FileDown },
  { key: 'f6', Icon: Sparkles },
];

const PaywallFeatures = () => {
  const { t } = useTranslation();

  return (
    <ul className="space-y-2.5">
      {FEATURES.map((feature) =>
        renderFeature(feature, t(`pro.features.${feature.key}`)),
      )}
    </ul>
  );
};

export default PaywallFeatures;

// --- Helpers ---

const renderFeature = ({ key, Icon }: Feature, label: string) => (
  <li key={key} className="flex items-center gap-3">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-ink">
      <Icon className="h-4 w-4" />
    </span>
    <span className="text-sm text-foreground/90">{label}</span>
  </li>
);
