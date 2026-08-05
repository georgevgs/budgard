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
    <section className="relative bg-[#100a1f] text-white overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(720px 420px at 25% 110%, hsl(var(--primary) / 0.55), transparent 72%), radial-gradient(680px 360px at 78% 100%, hsl(var(--info) / 0.28), transparent 72%)',
        }}
      />
      <div className="relative max-w-4xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
        <Reveal>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.04]">
            {t('landing.finalCta.heading')}
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-5 text-base sm:text-lg text-white/70 max-w-xl mx-auto">
            {t('landing.finalCta.body')}
          </p>
        </Reveal>
        <Reveal delay={220}>
          <Button
            size="lg"
            onClick={onGetStarted}
            className="mt-8 group rounded-full px-8 h-12 bg-white text-[#171326] hover:bg-white/90 shadow-xl shadow-primary/30"
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
