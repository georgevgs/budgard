import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';

const AboutSection = () => {
  const { t } = useTranslation();

  return (
    <section className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {t('settings.about.title')}
      </p>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('settings.about.version')}
            </span>
            <span className="text-sm tabular-nums">{__APP_VERSION__}</span>
          </div>
          <p className="text-xs text-muted-foreground text-center pt-1 border-t">
            {t('settings.about.madeWith')}
          </p>
        </CardContent>
      </Card>
    </section>
  );
};

export default AboutSection;
