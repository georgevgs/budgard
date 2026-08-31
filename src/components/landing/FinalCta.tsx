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
    <section className="bg-background">
      <div className="landing-gutter mx-auto max-w-6xl py-20 sm:py-28">
        <Reveal>
          <div className="tile-ink px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="type-slab text-4xl leading-[1.04] sm:text-5xl md:text-6xl">
              {t('landing.finalCta.heading')}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed opacity-70 sm:text-lg">
              {t('landing.finalCta.body')}
            </p>
            <Button
              size="lg"
              onClick={onGetStarted}
              className="mt-8 h-12 rounded-full bg-background px-8 text-foreground hover:bg-background/90"
            >
              {t('landing.finalCta.cta')}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default FinalCta;
