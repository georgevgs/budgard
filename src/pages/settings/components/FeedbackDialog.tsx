import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/common/ui/dialog';
import { FeedbackForm } from '@/pages/settings/components/FeedbackForm';
import type { FeedbackKind } from '@/common/api/feedbackService';

type FeedbackDialogProps = {
  open: boolean;
  kind: FeedbackKind;
  onClose: () => void;
};

export const FeedbackDialog = ({
  open,
  kind,
  onClose,
}: FeedbackDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(next) => closeWhenNeeded(next, onClose)}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t(`settings.feedback.${kind}Title`)}</DialogTitle>
          <DialogDescription>
            {t(`settings.feedback.${kind}Description`)}
          </DialogDescription>
        </DialogHeader>
        <FeedbackForm kind={kind} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};

const closeWhenNeeded = (open: boolean, onClose: () => void) => {
  if (!open) {
    onClose();
  }
};
