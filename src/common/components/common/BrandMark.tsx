import { cn } from '@/constants/utils';

type BrandMarkProps = {
  className?: string;
};

const BRAND_MARK_SRC = `/brand/budgard-mark.svg?v=${__BRAND_ASSET_REVISION__}`;

export const BrandMark = ({ className }: BrandMarkProps) => {
  return (
    <img
      src={BRAND_MARK_SRC}
      alt=""
      aria-hidden="true"
      className={cn('block shrink-0 dark:brightness-0 dark:invert', className)}
    />
  );
};
