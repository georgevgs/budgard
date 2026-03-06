import { Trans, useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const BOLD_COMPONENTS = {
  strong: <span className="font-semibold text-foreground" />,
};

export const IosInstallModal = ({ open, onOpenChange }: Props) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-6">
        <DialogHeader>
          <DialogTitle>{t('landing.install.title')}</DialogTitle>
          <DialogDescription>
            {t('landing.install.description')}
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4 mt-2 pb-2">
          {renderStep(
            1,
            <ShareIcon />,
            <Trans
              i18nKey="landing.install.step1"
              components={BOLD_COMPONENTS}
            />,
          )}
          {renderStep(
            2,
            <ChevronDownIcon />,
            <Trans
              i18nKey="landing.install.step2"
              components={BOLD_COMPONENTS}
            />,
          )}
          {renderStep(
            3,
            <PlusSquareIcon />,
            <Trans
              i18nKey="landing.install.step3"
              components={BOLD_COMPONENTS}
            />,
          )}
          {renderStep(
            4,
            <CheckIcon />,
            <Trans
              i18nKey="landing.install.step4"
              components={BOLD_COMPONENTS}
            />,
          )}
        </ol>
      </DialogContent>
    </Dialog>
  );
};

const renderStep = (
  number: number,
  icon: React.ReactNode,
  label: React.ReactNode,
) => (
  <li key={number} className="flex items-start gap-4">
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0 mt-0.5">
      {number}
    </div>
    <div className="flex items-start gap-3 flex-1 min-w-0">
      <div className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-muted shrink-0">
        {icon}
      </div>
      <p className="text-sm text-muted-foreground leading-snug min-w-0 pt-2">{label}</p>
    </div>
  </li>
);

// Inline SVGs matching the actual iOS icons

const ShareIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-primary"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-primary"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const PlusSquareIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-primary"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-primary"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
