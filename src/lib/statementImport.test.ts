import { describe, expect, it } from 'vitest';
import {
  detectStatementFormat,
  parseStatement,
} from '@/lib/statementImport';

const OFX = `OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260812120000[0:GMT]
<TRNAMT>-24.50
<FITID>1001
<NAME>TESCO STORES 3428
<MEMO>CARD PAYMENT
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260801
<TRNAMT>2400.00
<FITID>1002
<NAME>ACME LTD SALARY
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

const QIF = `!Type:Bank
D12/08/2026
T-24,50
PTesco Stores
MCard payment
LGroceries
^
D01/08/2026
T2400.00
PAcme Ltd
^`;

describe('detectStatementFormat', () => {
  it('reads the extension first', () => {
    expect(detectStatementFormat('statement.ofx', '')).toBe('ofx');
    expect(detectStatementFormat('statement.QFX', '')).toBe('ofx');
    expect(detectStatementFormat('export.qif', '')).toBe('qif');
  });

  // Some banks serve either format as .txt.
  it('falls back to the contents', () => {
    expect(detectStatementFormat('export.txt', OFX)).toBe('ofx');
    expect(detectStatementFormat('export.txt', QIF)).toBe('qif');
  });

  it('says nothing about a file it does not recognise', () => {
    expect(detectStatementFormat('notes.txt', 'hello')).toBeNull();
  });
});

describe('OFX', () => {
  const result = parseStatement('ofx', OFX);

  it('reads every transaction', () => {
    expect(result.rows).toHaveLength(2);
    expect(result.skipped).toBe(0);
  });

  it('takes the calendar date as written, ignoring the zone', () => {
    expect(result.rows[0].date).toBe('2026-08-12');
    expect(result.rows[1].date).toBe('2026-08-01');
  });

  // A negative OFX amount is money leaving; the app stores a positive amount
  // and marks direction separately.
  it('reads direction from the sign and stores the size', () => {
    expect(result.rows[0].amount).toBe(24.5);
    expect(result.rows[0].isIncome).toBe(false);
    expect(result.rows[1].amount).toBe(2400);
    expect(result.rows[1].isIncome).toBe(true);
  });

  // NAME is the counterparty, MEMO the bank's annotation. "TESCO STORES 3428"
  // is a description; "CARD PAYMENT" is not.
  it('prefers the counterparty over the bank memo', () => {
    expect(result.rows[0].description).toBe('TESCO STORES 3428');
  });

  it('reports unreadable transactions rather than dropping them silently', () => {
    const broken = parseStatement(
      'ofx',
      '<STMTTRN><DTPOSTED>20260812<NAME>No amount</STMTTRN>',
    );

    expect(broken.rows).toHaveLength(0);
    expect(broken.skipped).toBe(1);
  });

  it('survives a file with no transactions at all', () => {
    expect(parseStatement('ofx', '<OFX></OFX>').rows).toEqual([]);
  });
});

describe('QIF', () => {
  const result = parseStatement('qif', QIF);

  it('reads every record and skips the type header', () => {
    expect(result.rows).toHaveLength(2);
    expect(result.skipped).toBe(0);
  });

  // Stripping commas outright — the obvious thing to write — silently turns
  // 24,50 into 2450.
  describe('amounts', () => {
    const amountOf = (raw: string) =>
      parseStatement('qif', `D01/08/2026\nT${raw}\nPx\n^`).rows[0]?.amount;

    it('reads a comma as a decimal separator', () => {
      expect(result.rows[0].amount).toBe(24.5);
      expect(amountOf('-24,50')).toBe(24.5);
    });

    it('reads a dot as a decimal separator', () => {
      expect(amountOf('-24.50')).toBe(24.5);
    });

    it('reads a lone comma before three digits as grouping', () => {
      expect(amountOf('-1,234')).toBe(1234);
    });

    it('handles both separators together, either way round', () => {
      expect(amountOf('-1,234.56')).toBe(1234.56);
      expect(amountOf('-1.234,56')).toBe(1234.56);
    });

    it('handles a plain integer', () => {
      expect(amountOf('-40')).toBe(40);
    });
  });

  it('carries the exporting app’s category through for mapping', () => {
    expect(result.rows[0].categoryName).toBe('Groceries');
    expect(result.rows[1].categoryName).toBe('');
  });

  it('falls back to the memo when there is no payee', () => {
    const rows = parseStatement('qif', 'D01/08/2026\nT-9\nMOnly a memo\n^').rows;

    expect(rows[0].description).toBe('Only a memo');
  });

  // QIF's worst feature. Day-first is the default because these exports are
  // overwhelmingly European here, and guessing US order would silently move
  // most transactions in the file.
  describe('dates', () => {
    const dateOf = (raw: string) =>
      parseStatement('qif', `D${raw}\nT-1\nPx\n^`).rows[0]?.date;

    it('reads an ambiguous date as day-first', () => {
      expect(dateOf('05/08/2026')).toBe('2026-08-05');
    });

    it('switches to month-first when the second part cannot be a month', () => {
      expect(dateOf('08/21/2026')).toBe('2026-08-21');
    });

    it('accepts the separators QIF exporters actually use', () => {
      expect(dateOf('05-08-2026')).toBe('2026-08-05');
      expect(dateOf("05.08.2026")).toBe('2026-08-05');
      expect(dateOf("05/08'26")).toBe('2026-08-05');
    });

    it('reads a two-digit year as the past, not the future', () => {
      expect(dateOf('05/08/26')).toBe('2026-08-05');
      expect(dateOf('05/08/98')).toBe('1998-08-05');
    });

    it('refuses a date that does not exist', () => {
      expect(dateOf('31/02/2026')).toBeUndefined();
    });
  });
});
