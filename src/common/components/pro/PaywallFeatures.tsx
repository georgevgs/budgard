import { useTranslation } from 'react-i18next';
import ObjectTile from '@/common/components/common/ObjectTile/ObjectTile';

type Feature = {
  key: string;
  emoji: string;
};

// Array order is display order; keys are stable i18n ids (pro.features.*).
const FEATURES: Feature[] = [
  { key: 'f1', emoji: '📊' },
  { key: 'f2', emoji: '🎯' },
  { key: 'f3', emoji: '🗓️' },
  { key: 'f4', emoji: '📈' },
  { key: 'f7', emoji: '💰' },
  { key: 'f8', emoji: '📉' },
  { key: 'f5', emoji: '📄' },
  { key: 'f6', emoji: '✨' },
];

export const PaywallFeatures = () => {
  const { t } = useTranslation();

  return (
    <ul className="space-y-2.5">
      {FEATURES.map((feature) =>
        renderFeature(feature, t(`pro.features.${feature.key}`)),
      )}
    </ul>
  );
};

const renderFeature = ({ key, emoji }: Feature, label: string) => (
  <li key={key} className="flex items-center gap-3">
    <ObjectTile emoji={emoji} className="h-8 w-8" />
    <span className="text-sm text-foreground/90">{label}</span>
  </li>
);
