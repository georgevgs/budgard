import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  // Format number to European style (1.234,56)
  return (
    amount.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + '€'
  );
}

export function formatCurrencyInput(value: string): string {
  // Remove everything except digits and comma
  const cleaned = value.replace(/[^\d,]/g, '');

  // Split into whole and decimal parts
  const parts = cleaned.split(',');
  let whole = parts[0] || '';
  let decimal = parts[1] || '';

  // Limit decimal to 2 digits
  if (decimal.length > 2) {
    decimal = decimal.slice(0, 2);
  }

  // Add thousand separators to whole number
  if (whole.length > 3) {
    whole = whole.replace(/(\d)(?=(\d{3})+$)/g, '$1.');
  }

  // Combine parts
  if (parts.length > 1) {
    return whole + ',' + decimal;
  }

  return whole;
}

export function parseCurrencyInput(value: string): number {
  // Convert from European format (1.234,56) to number
  const cleaned = value
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.'); // Convert decimal comma to dot
  return parseFloat(cleaned) || 0;
}
