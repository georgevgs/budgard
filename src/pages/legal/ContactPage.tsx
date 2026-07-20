import { useTranslation } from 'react-i18next';
import Mail from 'lucide-react/dist/esm/icons/mail';
import { Button } from '@/components/ui/button';
import LegalPageLayout from '@/pages/legal/LegalPageLayout';
import { SUPPORT_EMAIL } from '@/lib/legal';

const ContactPage = () => {
  const { t } = useTranslation();

  return (
    <LegalPageLayout title={t('legal.contact.title')}>
      <p className="mt-6 text-[15px] leading-relaxed text-foreground/85">
        {t('legal.contact.lead')}
      </p>
      <Button asChild className="mt-6 rounded-full h-11">
        <a href={`mailto:${SUPPORT_EMAIL}`}>
          <Mail className="h-4 w-4 mr-2" />
          {t('legal.contact.emailCta', { email: SUPPORT_EMAIL })}
        </a>
      </Button>
      <p className="mt-3 text-sm text-muted-foreground">
        {t('legal.contact.responseNote')}
      </p>
      <div className="mt-10 space-y-3 text-sm text-muted-foreground">
        <p>{t('legal.contact.billingNote')}</p>
        <p>{t('legal.contact.privacyNote')}</p>
      </div>
    </LegalPageLayout>
  );
};

export default ContactPage;
