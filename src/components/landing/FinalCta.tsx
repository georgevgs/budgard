import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Reveal from '@/components/landing/Reveal';

type Props = {
  onGetStarted: () => void;
};

const FinalCta = ({ onGetStarted }: Props) => {
  const { t } = useTranslation();

  return (
    <section className="relative bg-primary text-primary-foreground overflow-hidden">
      {renderSheen()}
      <div className="relative max-w-4xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
        <Reveal>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.04]">
            {t('landing.finalCta.heading')}
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-5 text-base sm:text-lg text-primary-foreground/85 max-w-xl mx-auto">
            {t('landing.finalCta.body')}
          </p>
        </Reveal>
        <Reveal delay={220}>
          <Button
            size="lg"
            onClick={onGetStarted}
            className="mt-8 group rounded-full px-8 h-12 bg-background text-foreground hover:bg-background/90"
          >
            {t('landing.finalCta.cta')}
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Reveal>
      </div>
    </section>
  );
};

export default FinalCta;

// The page ends on the accent at full strength rather than on near-black —
// the last thing you scroll to is the brand, the way a drinks can is the
// colour before it is anything else. The sheen keeps the band from reading as
// a flat rectangle of paint.
const renderSheen = () => (
  <div
    aria-hidden
    className="absolute inset-0 pointer-events-none"
    style={{
      backgroundImage:
        'radial-gradient(70% 90% at 50% -20%, hsl(0 0% 100% / 0.22), transparent 62%), radial-gradient(60% 70% at 82% 110%, hsl(0 0% 0% / 0.18), transparent 60%)',
    }}
  />
);
