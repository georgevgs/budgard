import { cn } from '@/lib/utils';

// A single placeholder shape. The shimmer sweep lives in the `.skeleton`
// class (index.css) rather than Tailwind's animate-pulse, so it matches the
// directional highlight native apps use instead of an opacity throb.
// Hidden from assistive tech: these shapes carry no meaning on their own, and
// the surrounding loading screen already announces the wait via role="status".
const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn('skeleton rounded-md', className)}
      aria-hidden="true"
      {...props}
    />
  );
};

export { Skeleton };
