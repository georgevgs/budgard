import { TileLabel } from '@/common/components/bento';

type EyebrowLabelProps = {
  children: string;
};

export const EyebrowLabel = ({ children }: EyebrowLabelProps) => {
  return <TileLabel className="text-primary-ink">{children}</TileLabel>;
};
