import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionShell from '@/components/landing/SectionShell';
import EyebrowLabel from '@/components/landing/EyebrowLabel';
import Reveal from '@/components/landing/Reveal';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { cn } from '@/lib/utils';

type Tx = (key: string) => string;

const QUESTION_KEYS = [1, 2, 3, 4, 5, 6] as const;

const Faq = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <SectionShell id="faq" tone="muted">
      <Reveal>
        <div className="text-center max-w-2xl mx-auto">
          <EyebrowLabel>{t('landing.faq.eyebrow')}</EyebrowLabel>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
            {t('landing.faq.heading')}
          </h2>
        </div>
      </Reveal>
      <div className="mt-12 max-w-2xl mx-auto divide-y divide-border/60 rounded-2xl border border-border/60 bg-background overflow-hidden">
        {QUESTION_KEYS.map((n, i) =>
          renderItem(n, i, openIndex, setOpenIndex, t),
        )}
      </div>
    </SectionShell>
  );
};

export default Faq;

const renderItem = (
  n: number,
  index: number,
  openIndex: number | null,
  setOpenIndex: (i: number | null) => void,
  t: Tx,
) => {
  const isOpen = openIndex === index;
  const handleClick = () => setOpenIndex(isOpen ? null : index);

  return (
    <div key={n}>
      <button
        type="button"
        onClick={handleClick}
        className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-5 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-[15px] font-medium tracking-tight">
          {t(`landing.faq.q${n}.question`)}
        </span>
        <Plus
          className={cn(
            'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
            isOpen ? 'rotate-45' : 'rotate-0',
          )}
        />
      </button>
      {renderAnswer(isOpen, t(`landing.faq.q${n}.answer`))}
    </div>
  );
};

const renderAnswer = (isOpen: boolean, text: string) => {
  if (!isOpen) return null;

  return (
    <div className="px-5 sm:px-6 pb-5 -mt-1">
      <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
        {text}
      </p>
    </div>
  );
};
