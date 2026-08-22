import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

const BRAND_MARK_SRC = `/brand/budgard-mark.svg?v=${__BRAND_ASSET_REVISION__}`;

const BrandMark = ({ className }: Props) => {
  return (
    <img
      src={BRAND_MARK_SRC}
      alt=""
      aria-hidden="true"
      className={cn('block shrink-0 dark:brightness-0 dark:invert', className)}
    />
  );
};

export default BrandMark;
