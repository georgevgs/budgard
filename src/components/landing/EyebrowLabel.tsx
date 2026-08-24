import TileLabel from '@/components/bento/TileLabel';

type Props = {
  children: string;
};

const EyebrowLabel = ({ children }: Props) => (
  <TileLabel className="text-primary-ink">{children}</TileLabel>
);

export default EyebrowLabel;
