import Emoji3D from '@/common/components/common/Emoji3D/Emoji3D';
import { cn } from '@/constants/utils';

type CategoryIconProps = {
  icon: string | null | undefined;
  className?: string;
};

// A category's stored emoji, drawn as its 3D object, see `Emoji3D`.
export const CategoryIcon = ({ icon, className }: CategoryIconProps) => {
  return <Emoji3D emoji={toEmoji(icon)} className={cn('h-4 w-4', className)} />;
};

const toEmoji = (icon: string | null | undefined): string => {
  if (undefined !== icon && null !== icon) {
    return icon;
  } else {
    return '';
  }
};
