import { DEFAULT_DECIMALS, getCurrencyDecimals } from '@/lib/currencies';

/**
 * Money arithmetic. Every place the app turns a raw number into a stored or
 * displayed amount goes through here.
 *
 * Three rules, and they are the reason this file exists rather than a
 * `Math.round(x * 100) / 100` at each call site:
 *
 *   1. Round in the currency's own minor unit. The yen has no cents, so
 *      rounding a converted JPY amount to 2 decimals invents a number that
 *      cannot be paid. `getCurrencyDecimals` is the single source for this.
 *
 *   2. Round half away from zero. `Math.round` breaks ties toward +Infinity,
 *      so it turns -2.675 into -2.67 while turning 2.675 into 2.68 — the same
 *      refund netting differently depending on its sign. Now that negative
 *      amounts are legal (refunds, split adjustments) that asymmetry is a real
 *      reconciliation break, not a curiosity.
 *
 *   3. Scale by shifting the exponent, not by multiplying. `1.005 * 100` is
 *      100.49999999999999 in binary floating point, which rounds down to 1.00
 *      and loses a cent. Rewriting the exponent in the decimal string form
 *      sidesteps the multiply entirely.
 *
 * Totals additionally sum in integer minor units (`sumAmounts`) so a long
 * ledger cannot accumulate representation drift.
 */

/** Rounds to a currency's minor unit, half away from zero. */
export const roundMoney = (amount: number, currency?: string): number => {
  const decimals = resolveDecimals(currency);

  return roundToDecimals(amount, decimals);
};

/** Rounds to a fixed number of decimals, half away from zero. */
export const roundToDecimals = (amount: number, decimals: number): number => {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const sign = Math.sign(amount);
  const scaled = shiftDecimalPoint(Math.abs(amount), decimals);
  const rounded = Math.round(scaled);

  return withoutNegativeZero(sign * shiftDecimalPoint(rounded, -decimals));
};

/** The amount as a whole number of minor units (cents, yen, …). */
export const toMinorUnits = (amount: number, currency?: string): number => {
  const decimals = resolveDecimals(currency);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const sign = Math.sign(amount);

  return withoutNegativeZero(
    sign * Math.round(shiftDecimalPoint(Math.abs(amount), decimals)),
  );
};

/** The inverse of `toMinorUnits`. */
export const fromMinorUnits = (minor: number, currency?: string): number => {
  const decimals = resolveDecimals(currency);

  return shiftDecimalPoint(minor, -decimals);
};

/**
 * Exact total of a list of amounts.
 *
 * Summing floats accumulates representation error — 0.1 + 0.2 is the famous
 * one, and a year of grocery rows compounds the same effect until a total and
 * the rows behind it stop agreeing at the cent. Converting each row to whole
 * minor units first makes the addition exact, because integers below 2^53 are
 * exact.
 */
export const sumAmounts = (amounts: number[], currency?: string): number => {
  let totalMinor = 0;
  for (const amount of amounts) {
    totalMinor += toMinorUnits(amount, currency);
  }

  return fromMinorUnits(totalMinor, currency);
};

/**
 * Converts an amount at a rate, rounding once into the target currency's
 * minor unit. The single rounding is deliberate: converting, storing, and
 * re-rounding compounds error, so this is the only place a converted figure
 * is produced.
 */
export const convertMoney = (
  amount: number,
  rate: number,
  targetCurrency: string,
): number => {
  return roundMoney(amount * rate, targetCurrency);
};

/**
 * Whether a rate is usable. A missing or absurd rate must fail loudly rather
 * than silently produce a zero or an astronomical amount — an expense saved at
 * 0 looks like a legitimate row forever after.
 */
export const isUsableRate = (rate: unknown): rate is number => {
  if (typeof rate !== 'number') {
    return false;
  }
  if (!Number.isFinite(rate)) {
    return false;
  }

  return rate > 0 && rate < MAX_PLAUSIBLE_RATE;
};

// --- Helpers ---

/**
 * Collapses -0 to 0.
 *
 * `sign * magnitude` reproduces the sign even when the magnitude rounds away,
 * so any amount smaller than half a minor unit but negative comes back as -0 —
 * and `Intl.NumberFormat` renders that as "-€0.00", which reads as a
 * bookkeeping error to anyone who sees it.
 *
 * No call site reaches this today: the only path that could is convertMoney,
 * and the expense form's Zod schema requires `amount > 0`, while the flows
 * that do produce negatives (refunds, split adjustments) work in the stored
 * currency and never convert. It is guarded anyway because this module is
 * meant to be the one place amounts are rounded, negative amounts are now
 * legal in the data model, and the first caller to convert one would find it.
 */
const withoutNegativeZero = (value: number): number => {
  if (value === 0) {
    return 0;
  }

  return value;
};

// Rates beyond this are data errors, not exchange rates. The widest real pair
// among supported currencies is roughly EUR→IDR territory; 1e6 leaves room
// for anything plausible while still catching a null or a parse failure.
const MAX_PLAUSIBLE_RATE = 1_000_000;

const resolveDecimals = (currency?: string): number => {
  if (!currency) {
    return DEFAULT_DECIMALS;
  }

  return getCurrencyDecimals(currency);
};

// Moves the decimal point by rewriting the exponent of the number's own
// decimal string form, so no floating-point multiply is involved.
const shiftDecimalPoint = (value: number, places: number): number => {
  if (value === 0) {
    return 0;
  }

  const [mantissa, exponent] = value.toExponential().split('e');
  const shifted = Number(`${mantissa}e${Number(exponent) + places}`);

  if (!Number.isFinite(shifted)) {
    return 0;
  }

  return shifted;
};
