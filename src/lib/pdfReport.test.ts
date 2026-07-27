import { describe, it, expect } from 'vitest';
import { buildAnnualReportDocDefinition } from '@/lib/pdfReport';
import type { AnnualPdfReportInput } from '@/lib/pdfReport';

const LABELS = {
  generatedOn: 'Generated on July 27, 2026',
  summaryTitle: 'Summary',
  totalSpent: 'Total spent',
  totalIncome: 'Total income',
  monthlyAverage: 'Monthly average',
  monthlyTitle: 'Monthly totals',
  monthHeader: 'Month',
  amountHeader: 'Amount',
  categoriesTitle: 'Categories',
  categoryHeader: 'Category',
  percentHeader: 'Share',
};

const baseInput = (): AnnualPdfReportInput => ({
  year: 2026,
  currency: 'EUR',
  labels: LABELS,
  totalSpent: '€1,200.00',
  totalIncome: '€2,000.00',
  monthlyAverage: '€100.00',
  monthlyTotals: [
    { monthLabel: 'January', amount: '€100.00' },
    { monthLabel: 'February', amount: '€200.00' },
  ],
  categoryBreakdown: [
    { name: 'Food', amount: '€700.00', percent: '58%' },
    { name: 'Σπίτι', amount: '€500.00', percent: '42%' },
  ],
});

type TableContent = {
  table: { body: unknown[][] };
};

describe('buildAnnualReportDocDefinition', () => {
  it('titles the document with the year', () => {
    const doc = buildAnnualReportDocDefinition(baseInput());

    expect(doc.info?.title).toBe('Budgard — 2026');
    const content = doc.content as Array<{ text?: string }>;
    expect(content[0].text).toBe('Budgard — 2026');
  });

  it('renders one monthly row per entry plus a header row', () => {
    const doc = buildAnnualReportDocDefinition(baseInput());

    const monthlyTable = (doc.content as unknown[])[5] as TableContent;
    expect(monthlyTable.table.body).toHaveLength(3);
  });

  it('renders one category row per entry plus a header row', () => {
    const doc = buildAnnualReportDocDefinition(baseInput());

    const categoryTable = (doc.content as unknown[])[7] as TableContent;
    expect(categoryTable.table.body).toHaveLength(3);
    const greekRow = categoryTable.table.body[2] as Array<{ text: string }>;
    expect(greekRow[0].text).toBe('Σπίτι');
  });

  it('includes the income row only when income exists', () => {
    const withIncome = buildAnnualReportDocDefinition(baseInput());
    const withoutIncome = buildAnnualReportDocDefinition({
      ...baseInput(),
      totalIncome: null,
    });

    const summaryWith = (withIncome.content as unknown[])[3] as TableContent;
    const summaryWithout = (withoutIncome.content as unknown[])[3] as TableContent;
    expect(summaryWith.table.body).toHaveLength(3);
    expect(summaryWithout.table.body).toHaveLength(2);
  });

  it('keeps the budgard.com footer', () => {
    const doc = buildAnnualReportDocDefinition(baseInput());

    const footer = doc.footer as { text: string };
    expect(footer.text).toBe('budgard.com');
  });
});
