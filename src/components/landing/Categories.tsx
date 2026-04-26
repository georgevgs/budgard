import { useTranslation } from 'react-i18next';
import SectionShell from '@/components/landing/SectionShell';
import EyebrowLabel from '@/components/landing/EyebrowLabel';
import Reveal from '@/components/landing/Reveal';

type Tx = (key: string) => string;
type Tile = { key: string; emoji: string; color: string };

const Categories = () => {
  const { t } = useTranslation();

  return (
    <SectionShell tone="default">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <Reveal>{renderCopy(t)}</Reveal>
        <Reveal delay={120}>{renderGrid(t)}</Reveal>
      </div>
    </SectionShell>
  );
};

export default Categories;

const renderCopy = (t: Tx) => (
  <div>
    <EyebrowLabel>{t('landing.categories.eyebrow')}</EyebrowLabel>
    <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
      {t('landing.categories.heading')}
    </h2>
    <p className="mt-5 text-base text-muted-foreground leading-relaxed max-w-md">
      {t('landing.categories.body')}
    </p>
    <ul className="mt-6 space-y-2.5 text-sm text-foreground/80">
      <li className="flex items-start gap-2.5">
        <span className="mt-2 w-1 h-1 rounded-full bg-primary shrink-0" />
        <span>{t('landing.categories.point1')}</span>
      </li>
      <li className="flex items-start gap-2.5">
        <span className="mt-2 w-1 h-1 rounded-full bg-primary shrink-0" />
        <span>{t('landing.categories.point2')}</span>
      </li>
      <li className="flex items-start gap-2.5">
        <span className="mt-2 w-1 h-1 rounded-full bg-primary shrink-0" />
        <span>{t('landing.categories.point3')}</span>
      </li>
    </ul>
  </div>
);

const renderGrid = (t: Tx) => (
  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto lg:max-w-none">
    {tiles().map((tile) => renderTile(tile, t))}
  </div>
);

const tiles = (): Tile[] => [
  { key: 'housing', emoji: '🏠', color: 'hsl(24 90% 55%)' },
  { key: 'food', emoji: '🥗', color: 'hsl(142 70% 45%)' },
  { key: 'transport', emoji: '🚇', color: 'hsl(280 60% 60%)' },
  { key: 'subs', emoji: '📺', color: 'hsl(220 70% 55%)' },
  { key: 'health', emoji: '💊', color: 'hsl(340 75% 55%)' },
  { key: 'fun', emoji: '🎟️', color: 'hsl(48 90% 55%)' },
  { key: 'travel', emoji: '✈️', color: 'hsl(195 75% 50%)' },
  { key: 'gifts', emoji: '🎁', color: 'hsl(0 70% 55%)' },
  { key: 'pets', emoji: '🐾', color: 'hsl(160 60% 45%)' },
];

const renderTile = (tile: Tile, t: Tx) => (
  <div
    key={tile.key}
    className="aspect-square rounded-2xl border border-border/60 bg-card flex flex-col items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 hover:border-border"
  >
    <span
      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
      style={{ backgroundColor: `${tile.color}1f` }}
    >
      {tile.emoji}
    </span>
    <span className="text-[11px] font-medium text-foreground/80">
      {t(`landing.categories.tile.${tile.key}`)}
    </span>
  </div>
);
