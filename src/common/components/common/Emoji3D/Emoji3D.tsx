import { getEmoji3dSource } from '@/constants/emoji3d';
import { cn } from '@/constants/utils';

type Emoji3DProps = {
  emoji: string;
  className?: string;
};

// A thing drawn as a 3D object rather than a line icon. Decorative: the label
// beside it carries the meaning, so it is never announced.
const Emoji3D = ({ emoji, className }: Emoji3DProps) => {
  return (
    <img
      src={getEmoji3dSource(emoji)}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={cn('shrink-0 select-none', className)}
    />
  );
};

export default Emoji3D;
