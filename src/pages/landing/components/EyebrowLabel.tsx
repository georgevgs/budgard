import TileLabel from '@/common/components/bento/TileLabel';

interface Props {
  children: string;
}

const EyebrowLabel = ({ children }: Props) => (
  <TileLabel className="text-primary-ink">{children}</TileLabel>
);

export default EyebrowLabel;
