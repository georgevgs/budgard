import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
};

// These previews are product states, not browser screenshots. The old row of
// three window dots repeated generic mockup chrome four times down the page and
// made the product feel less native than the PWA actually is. The app's own
// surface rule and restrained lift are the frame now.
const DeviceFrame = ({ children, className }: Props) => (
  <div className={cn('relative', className)}>
    <div className="surface-card-flush relative lift">
      <div className="text-left">{children}</div>
    </div>
  </div>
);

export default DeviceFrame;
