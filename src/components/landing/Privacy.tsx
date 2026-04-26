import { useTranslation } from 'react-i18next';
import SectionShell from '@/components/landing/SectionShell';
import EyebrowLabel from '@/components/landing/EyebrowLabel';
import Reveal from '@/components/landing/Reveal';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Server from 'lucide-react/dist/esm/icons/server';
import type { LucideIcon } from 'lucide-react';

type Tx = (key: string) => string;
type Pillar = { Icon: LucideIcon; titleKey: string; bodyKey: string };

const Privacy = () => {
  const { t } = useTranslation();

  return (
    <SectionShell tone="muted">
      <div className="max-w-3xl">
        <Reveal>
          <EyebrowLabel>{t('landing.privacy.eyebrow')}</EyebrowLabel>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
            {t('landing.privacy.heading')}
          </h2>
          <p className="mt-5 text-base text-muted-foreground leading-relaxed max-w-xl">
            {t('landing.privacy.body')}
          </p>
        </Reveal>
      </div>
      <div className="mt-12 grid sm:grid-cols-3 gap-4">
        {pillars().map((p, i) => (
          <Reveal key={p.titleKey} delay={i * 100}>
            {renderPillar(p, t)}
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
};

export default Privacy;

const pillars = (): Pillar[] => [
  {
    Icon: Server,
    titleKey: 'landing.privacy.pillar1.title',
    bodyKey: 'landing.privacy.pillar1.body',
  },
  {
    Icon: EyeOff,
    titleKey: 'landing.privacy.pillar2.title',
    bodyKey: 'landing.privacy.pillar2.body',
  },
  {
    Icon: ShieldCheck,
    titleKey: 'landing.privacy.pillar3.title',
    bodyKey: 'landing.privacy.pillar3.body',
  },
];

const renderPillar = (p: Pillar, t: Tx) => (
  <div className="rounded-2xl border border-border/60 bg-background p-6">
    <p.Icon className="h-5 w-5 text-foreground/70" />
    <h3 className="mt-4 text-base font-semibold tracking-tight">
      {t(p.titleKey)}
    </h3>
    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
      {t(p.bodyKey)}
    </p>
  </div>
);
