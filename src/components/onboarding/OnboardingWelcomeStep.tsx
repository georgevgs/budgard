import { useTranslation } from 'react-i18next';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  onNext: () => void;
};

const OnboardingWelcomeStep = ({ onNext }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Wallet className="h-8 w-8 text-primary-ink" />
      </div>

      <DialogHeader>
        <DialogTitle className="text-xl">
          {t('onboarding.welcomeTitle')}
        </DialogTitle>
        <DialogDescription>
          {t('onboarding.welcomeDescription')}
        </DialogDescription>
      </DialogHeader>

      <Button className="w-full" size="lg" onClick={onNext}>
        {t('onboarding.getStarted')}
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
};

export default OnboardingWelcomeStep;
