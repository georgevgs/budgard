import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Bug from 'lucide-react/dist/esm/icons/bug';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import { Button } from '@/components/ui/button';
import SurfaceCard from '@/components/common/SurfaceCard';
import FeedbackDialog from '@/components/settings/FeedbackDialog';
import type { FeedbackKind } from '@/services/feedbackService';

const FeedbackSection = () => {
  const { t } = useTranslation();
  const [kind, setKind] = useState<FeedbackKind | null>(null);

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {t('settings.feedback.title')}
      </p>
      <SurfaceCard>
        <div className="space-y-4 p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('settings.feedback.description')}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setKind('feedback')}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {t('settings.feedback.sendFeedback')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setKind('bug')}
            >
              <Bug className="mr-2 h-4 w-4" />
              {t('settings.feedback.reportProblem')}
            </Button>
          </div>
        </div>
      </SurfaceCard>
      {renderDialog(kind, () => setKind(null))}
    </section>
  );
};

export default FeedbackSection;

// --- Helpers ---

const renderDialog = (kind: FeedbackKind | null, onClose: () => void) => {
  if (!kind) {
    return null;
  }

  return <FeedbackDialog open kind={kind} onClose={onClose} />;
};
