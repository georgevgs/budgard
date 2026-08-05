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
  const buttonId = `faq-question-${n}`;
  const answerId = `faq-answer-${n}`;
  const handleClick = () => {
    if (isOpen) {
      setOpenIndex(null);

      return;
    }
    setOpenIndex(index);
  };

  return (
    <div key={n}>
      <button
        id={buttonId}
        type="button"
        onClick={handleClick}
        aria-expanded={isOpen}
        aria-controls={answerId}
        className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-5 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-[15px] font-medium tracking-tight">
          {t(`landing.faq.q${n}.question`)}
        </span>
        <Plus aria-hidden="true" className={getIconClass(isOpen)} />
      </button>
      {renderAnswer(isOpen, t(`landing.faq.q${n}.answer`), answerId, buttonId)}
    </div>
  );
};

const renderAnswer = (
  isOpen: boolean,
  text: string,
  answerId: string,
  buttonId: string,
) => {
  if (!isOpen) return null;

  return (
    <div
      id={answerId}
      role="region"
      aria-labelledby={buttonId}
      className="px-5 sm:px-6 pb-5 -mt-1"
    >
      <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
        {text}
      </p>
    </div>
  );
};

const getIconClass = (isOpen: boolean): string => {
  const base =
    'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200';
  if (isOpen) {
    return cn(base, 'rotate-45');
  }

  return cn(base, 'rotate-0');
};
