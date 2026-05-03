import type { ReactNode } from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Variant = 'card' | 'page';

type Props = {
  media: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  variant?: Variant;
};

export const EmptyStateCard = ({
  media,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'card',
}: Props) => {
  if (variant === 'page') {
    return renderPage({ media, title, description, actionLabel, onAction });
  }

  return renderCard({ media, title, description, actionLabel, onAction });
};

// --- Helpers ---

type RenderArgs = Omit<Props, 'variant'>;

const renderCard = ({
  media,
  title,
  description,
  actionLabel,
  onAction,
}: RenderArgs) => {
  return (
    <Card className="border-border/50 rounded-2xl p-8 text-center overflow-hidden">
      <div className="flex flex-col items-center gap-3">
        {media}
        <div className="max-w-[280px]">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          onClick={onAction}
          variant="outline"
          size="sm"
          className="mt-2 max-w-full"
        >
          <Plus className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate">{actionLabel}</span>
        </Button>
      </div>
    </Card>
  );
};

const renderPage = ({
  media,
  title,
  description,
  actionLabel,
  onAction,
}: RenderArgs) => {
  return (
    <div className="flex flex-col items-center text-center py-16 px-4">
      <div className="mb-6">{media}</div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
        {description}
      </p>
      <Button onClick={onAction} variant="outline" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        {actionLabel}
      </Button>
    </div>
  );
};
