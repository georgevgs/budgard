// A model of what is normal *for this person*, rather than a comparison
// against a budget number they typed once and have not revisited.
//
// Built on the median and the median absolute deviation rather than the mean
// and standard deviation, because spending is not normally distributed: it is
// a low, fairly steady baseline with occasional large one-offs. A mean is
// dragged upward by the annual insurance payment, which raises the bar so the
// genuinely unusual week no longer clears it — the outlier hides itself. The
// median barely moves, so the model keeps describing the ordinary weeks and
// the outlier stands out as what it is.

export type Baseline = {
  median: number;
  // Median absolute deviation, scaled to be comparable to a standard
  // deviation for normally-distributed data.
  spread: number;
  count: number;
};

// 1 / Φ⁻¹(0.75). Scales MAD so `spread` is on the same footing as a standard
// deviation, which is what makes the thresholds below mean something familiar.
const MAD_TO_SIGMA = 1.4826;

// Below this there is not enough history to claim anything is unusual. Four
// weeks of a category is the least that can distinguish a habit from a
// coincidence.
const MIN_OBSERVATIONS = 4;

// How far from the median a value has to sit before it is worth mentioning.
// Roughly two standard deviations: often enough to be useful, rare enough
// that the app is not remarking on every ordinary week.
const NOTABLE_DEVIATIONS = 2;

// When almost every observation is identical the spread collapses to zero and
// any difference at all would read as infinitely unusual. This floors it at a
// share of the median, so "normally 40, this week 41" stays unremarkable.
const MIN_SPREAD_RATIO = 0.15;

export const buildBaseline = (values: number[]): Baseline => {
  if (values.length === 0) {
    return { median: 0, spread: 0, count: 0 };
  }

  const median = medianOf(values);
  const deviations = values.map((value) => Math.abs(value - median));
  const rawSpread = medianOf(deviations) * MAD_TO_SIGMA;

  return {
    median,
    spread: Math.max(rawSpread, Math.abs(median) * MIN_SPREAD_RATIO),
    count: values.length,
  };
};

export type Comparison = {
  // Signed distance from the median, in spreads. 0 is exactly typical.
  deviations: number;
  verdict: 'unknown' | 'typical' | 'higher' | 'lower';
};

export const compareToBaseline = (
  value: number,
  baseline: Baseline,
): Comparison => {
  if (baseline.count < MIN_OBSERVATIONS) {
    return { deviations: 0, verdict: 'unknown' };
  }
  if (baseline.spread === 0) {
    return { deviations: 0, verdict: 'typical' };
  }

  const deviations = (value - baseline.median) / baseline.spread;

  return { deviations, verdict: verdictFor(deviations) };
};

// --- Helpers ---

const verdictFor = (deviations: number): Comparison['verdict'] => {
  if (deviations >= NOTABLE_DEVIATIONS) {
    return 'higher';
  }
  if (deviations <= -NOTABLE_DEVIATIONS) {
    return 'lower';
  }

  return 'typical';
};

const medianOf = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
};
