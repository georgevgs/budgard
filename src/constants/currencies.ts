type Currency = {
  code: string;
  symbol: string;
  name: string;
  // ISO 4217 minor units — how many decimal places this currency actually
  // has. Almost everything is 2; the yen has none, so a "¥4,50" anywhere in
  // the app is a number that cannot exist. Omitted means 2.
  decimals?: number;
};

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];

export const getCurrencySymbol = (code: string): string => {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === code);

  return currency?.symbol ?? code;
};

// Decimal places for a currency, defaulting to 2 for anything unlisted. Every
// rounding and formatting decision in lib/money.ts routes through this, so a
// currency's minor unit is defined in exactly one place.
export const getCurrencyDecimals = (code: string): number => {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  if (!currency) {
    return DEFAULT_DECIMALS;
  }

  return currency.decimals ?? DEFAULT_DECIMALS;
};

export const DEFAULT_DECIMALS = 2;
