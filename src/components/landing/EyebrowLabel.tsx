type Props = {
  children: string;
};

const EyebrowLabel = ({ children }: Props) => (
  <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-primary/90">
    {children}
  </p>
);

export default EyebrowLabel;
