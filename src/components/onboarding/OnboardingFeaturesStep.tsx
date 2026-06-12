import { useTranslation } from 'react-i18next';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import BarChart from 'lucide-react/dist/esm/icons/bar-chart';
import Camera from 'lucide-react/dist/esm/icons/camera';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const FEATURES = [
  { titleKey: 'featureExpenses', descKey: 'featureExpensesDesc', Icon: FileText },
  { titleKey: 'featureRecurring', descKey: 'featureRecurringDesc', Icon: Repeat },
  { titleKey: 'featureAnalytics', descKey: 'featureAnalyticsDesc', Icon: BarChart },
  { titleKey: 'featureReceipts', descKey: 'featureReceiptsDesc', Icon: Camera },
];

type Props = {
  onComplete: () => void;
};

const OnboardingFeaturesStep = ({ onComplete }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-xl">
          {t('onboarding.featuresTitle')}
        </DialogTitle>
        <DialogDescription>
          {t('onboarding.featuresDescription')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.titleKey}
            className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3"
          >
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <feature.Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t(`onboarding.${feature.titleKey}`)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(`onboarding.${feature.descKey}`)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Button className="w-full" size="lg" onClick={onComplete}>
        {t('onboarding.startTracking')}
      </Button>
    </div>
  );
};

export default OnboardingFeaturesStep;
