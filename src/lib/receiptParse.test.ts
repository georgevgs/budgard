import { describe, expect, it } from 'vitest';
import { parseReceiptText } from '@/lib/receiptParse';

const recentDate = (daysAgo: number): Date => {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
};

const formatDmy = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${day}/${month}/${date.getFullYear()}`;
};

describe('parseReceiptText', () => {
  describe('amount', () => {
    it('prefers the TOTAL line over larger item and tax amounts', () => {
      const result = parseReceiptText(
        [
          'SUPERMART',
          'Wagyu beef 89.90',
          'Milk 1.20',
          'SUBTOTAL 91.10',
          'TAX 7.29',
          'TOTAL 98.39',
        ].join('\n'),
      );

      expect(result.amount).toBe(98.39);
    });

    it('reads Greek ΣΥΝΟΛΟ with the value on the next line', () => {
      const result = parseReceiptText(
        ['ΣΟΥΠΕΡ ΜΑΡΚΕΤ', 'ΓΑΛΑ 1,20', 'ΣΥΝΟΛΟ', '15,80', 'ΦΠΑ 24% 3,06'].join(
          '\n',
        ),
      );

      expect(result.amount).toBe(15.8);
    });

    it('matches accented ΣΎΝΟΛΟ via tonos stripping', () => {
      const result = parseReceiptText('Σύνολο 12,50');

      expect(result.amount).toBe(12.5);
    });

    it('ignores ΦΠΑ and VAT lines even though they mention totals', () => {
      const result = parseReceiptText(
        ['ΣΥΝΟΛΟ ΦΠΑ 3,06', 'TAX TOTAL 7.29', 'ΣΥΝΟΛΟ 15,80'].join('\n'),
      );

      expect(result.amount).toBe(15.8);
    });

    it('prefers the grand total over the cash tendered', () => {
      const result = parseReceiptText(
        ['ΣΥΝΟΛΟ 7,80', 'ΜΕΤΡΗΤΑ 10,00', 'ΡΕΣΤΑ 2,20'].join('\n'),
      );

      expect(result.amount).toBe(7.8);
    });

    it('falls back to the largest money token when no keyword is present', () => {
      const result = parseReceiptText(
        ['Coffee 3.50', 'Cake 4.20', 'Something 12.90'].join('\n'),
      );

      expect(result.amount).toBe(12.9);
    });

    it('parses European thousands format 1.234,56', () => {
      const result = parseReceiptText('TOTAL 1.234,56');

      expect(result.amount).toBe(1234.56);
    });

    it('parses US thousands format 1,234.56', () => {
      const result = parseReceiptText('TOTAL 1,234.56');

      expect(result.amount).toBe(1234.56);
    });

    it('rejects amounts above the schema cap', () => {
      const result = parseReceiptText('TOTAL 2000000.00');

      expect(result.amount).toBeNull();
    });

    it('ignores bare integers', () => {
      const result = parseReceiptText('TOTAL 1234');

      expect(result.amount).toBeNull();
    });
  });

  describe('date', () => {
    it('parses dd/MM/yyyy', () => {
      const date = recentDate(3);
      const result = parseReceiptText(`ΗΜΕΡΟΜΗΝΙΑ ${formatDmy(date)}`);

      expect(result.date?.getTime()).toBe(date.getTime());
    });

    it('parses dd.MM.yyyy and dd-MM-yyyy', () => {
      const date = recentDate(10);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');

      const dotted = parseReceiptText(`${day}.${month}.${date.getFullYear()}`);
      const dashed = parseReceiptText(`${day}-${month}-${date.getFullYear()}`);

      expect(dotted.date?.getTime()).toBe(date.getTime());
      expect(dashed.date?.getTime()).toBe(date.getTime());
    });

    it('parses yyyy-MM-dd', () => {
      const date = recentDate(30);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      const result = parseReceiptText(`${date.getFullYear()}-${month}-${day}`);

      expect(result.date?.getTime()).toBe(date.getTime());
    });

    it('parses dd/MM/yy with a trailing time', () => {
      const date = recentDate(1);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const shortYear = String(date.getFullYear() % 100).padStart(2, '0');

      const result = parseReceiptText(`${day}/${month}/${shortYear} 14:32`);

      expect(result.date?.getTime()).toBe(date.getTime());
    });

    it('prefers the date on a labeled line over an earlier one', () => {
      const labeled = recentDate(5);
      const other = recentDate(40);

      const result = parseReceiptText(
        [`Printed ${formatDmy(other)}`, `DATE: ${formatDmy(labeled)}`].join(
          '\n',
        ),
      );

      expect(result.date?.getTime()).toBe(labeled.getTime());
    });

    it('rejects far-past and future dates', () => {
      const future = recentDate(-30);

      const past = parseReceiptText('01/01/1999');
      const ahead = parseReceiptText(formatDmy(future));

      expect(past.date).toBeNull();
      expect(ahead.date).toBeNull();
    });

    it('rejects impossible calendar dates', () => {
      const result = parseReceiptText('31/02/2025');

      expect(result.date).toBeNull();
    });

    it('does not read phone numbers as dates', () => {
      const result = parseReceiptText('ΤΗΛ 210-1234567');

      expect(result.date).toBeNull();
    });
  });

  describe('merchant', () => {
    it('takes the store name from the top of the receipt', () => {
      const result = parseReceiptText(
        ['SUPERMART EXPRESS', '12 MAIN STREET', 'TOTAL 9.99'].join('\n'),
      );

      expect(result.merchant).toBe('SUPERMART EXPRESS');
    });

    it('skips ΑΦΜ, ΤΗΛ and URL lines', () => {
      const result = parseReceiptText(
        [
          'ΑΦΜ 123456789',
          'ΤΗΛ 2101234567',
          'WWW.SHOP.GR',
          'ΚΑΦΕΤΕΡΙΑ ΑΘΗΝΑ',
          'ΣΥΝΟΛΟ 4,50',
        ].join('\n'),
      );

      expect(result.merchant).toBe('ΚΑΦΕΤΕΡΙΑ ΑΘΗΝΑ');
    });

    it('skips mostly-numeric lines', () => {
      const result = parseReceiptText(
        ['1234567 AB', 'CORNER BAKERY'].join('\n'),
      );

      expect(result.merchant).toBe('CORNER BAKERY');
    });

    it('strips characters outside the SAFE_STRING whitelist', () => {
      const result = parseReceiptText('CAFE* <ATHENS>');

      expect(result.merchant).toBe('CAFE ATHENS');
    });

    it('gives up after the top lines', () => {
      const result = parseReceiptText(
        [
          '111 222',
          '333 444',
          '555 666',
          '777 888',
          '999 000',
          'REAL SHOP NAME',
        ].join('\n'),
      );

      expect(result.merchant).toBeNull();
    });
  });

  it('returns all nulls for empty and garbage input', () => {
    expect(parseReceiptText('')).toEqual({
      amount: null,
      date: null,
      merchant: null,
    });
    expect(parseReceiptText('~~ ## @@\n\n123')).toEqual({
      amount: null,
      date: null,
      merchant: null,
    });
  });
});
