import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import LegalPageLayout from '@/pages/legal/LegalPageLayout';
import LegalSections, { type LegalSection } from '@/pages/legal/LegalSections';
import { useDateLocale } from '@/hooks/useDateLocale';
import { LEGAL_LAST_UPDATED, SUPPORT_EMAIL } from '@/lib/legal';

const TermsPage = () => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const sections = t('legal.terms.sections', {
    returnObjects: true,
    email: SUPPORT_EMAIL,
  }) as LegalSection[];

  return (
    <LegalPageLayout title={t('legal.terms.title')}>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('legal.lastUpdated', {
          date: format(LEGAL_LAST_UPDATED, 'd MMMM yyyy', {
            locale: dateLocale,
          }),
        })}
      </p>
      <p className="mt-6 text-[15px] leading-relaxed text-foreground/85">
        {t('legal.terms.intro')}
      </p>
      <LegalSections sections={sections} />
    </LegalPageLayout>
  );
};

export default TermsPage;
