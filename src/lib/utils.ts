import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatForeignAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
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

export const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
};

// Strip non-emoji characters so the input only accepts emoji.
// ZWJ (\u{200D}) and variation selectors (\u{FE0F}) are matched individually
// so that join() reconstructs full emoji sequences (e.g. family emoji).
/* eslint-disable no-misleading-character-class */
const EMOJI_PATTERN =
  /[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{200D}\u{FE0F}]/gu;
/* eslint-enable no-misleading-character-class */

export function extractEmoji(input: string): string {
  const matches = input.match(EMOJI_PATTERN);
  if (!matches) return '';

  return matches.join('').slice(0, 4);
}
