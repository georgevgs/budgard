import { useTranslation } from 'react-i18next';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Emoji3D from '@/common/components/common/Emoji3D/Emoji3D';
import { Button } from '@/common/ui/button';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/common/ui/dialog';

type OnboardingWelcomeStepProps = {
  onNext: () => void;
};

export const OnboardingWelcomeStep = ({
  onNext,
}: OnboardingWelcomeStepProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 text-center">
      <Emoji3D emoji="👛" className="mx-auto h-16 w-16" />

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
