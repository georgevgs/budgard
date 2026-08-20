import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

const BrandMark = ({ className }: Props) => {
  return (
    <img
      src="/brand/budgard-mark.svg"
      alt=""
      aria-hidden="true"
      className={cn('block shrink-0 dark:brightness-0 dark:invert', className)}
    />
  );
};

export default BrandMark;
