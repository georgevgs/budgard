import Emoji3D from '@/common/components/common/Emoji3D/Emoji3D';
import { cn } from '@/constants/utils';

type ObjectTileProps = {
  emoji: string;
  className?: string;
};

// A 3D object on a quiet tile, the head of a row that leads somewhere.
// The object springs under a press when the row is a `group`.
const ObjectTile = ({ emoji, className }: ObjectTileProps) => {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'object-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-[32%]',
        className,
      )}
    >
      <Emoji3D emoji={emoji} className="object-press h-[68%] w-[68%]" />
    </span>
  );
};

export default ObjectTile;
