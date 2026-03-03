interface CategorySparklineProps {
  values: number[];
  color: string;
}

const CategorySparkline = ({ values, color }: CategorySparklineProps) => {
  let lastNonZero = -1;
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] > 0) {
      lastNonZero = i;
      break;
    }
  }

  if (lastNonZero < 1) {
    return <div className="h-7 w-16" aria-hidden="true" />;
  }

  const displayValues = values.slice(0, lastNonZero + 1);
  const max = Math.max(...displayValues);

  if (max === 0) {
    return <div className="h-7 w-16" aria-hidden="true" />;
  }

  const W = 64;
  const H = 28;
  const pad = 2;
  const step =
    displayValues.length > 1 ? (W - pad * 2) / (displayValues.length - 1) : 0;

  const points = displayValues.map((val, i) => ({
    x: pad + i * step,
    y: H - pad - (val / max) * (H - pad * 2),
  }));

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <svg
      width={W}
      height={H}
      aria-hidden="true"
      className="overflow-visible"
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />
    </svg>
  );
};

export default CategorySparkline;
