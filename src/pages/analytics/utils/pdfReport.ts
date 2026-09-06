import type {
  Content,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';

// All user-facing strings arrive pre-translated and all amounts arrive
// pre-formatted: this module stays i18n- and currency-agnostic so the
// heavy pdfmake payload (fonts included) can live in its own lazy chunk.

export type PdfReportLabels = {
  generatedOn: string;
  summaryTitle: string;
  totalSpent: string;
  totalIncome: string;
  monthlyAverage: string;
  monthlyTitle: string;
  monthHeader: string;
  amountHeader: string;
  categoriesTitle: string;
  categoryHeader: string;
  percentHeader: string;
};

export type PdfMonthlyTotal = {
  monthLabel: string;
  amount: string;
};

export type PdfCategoryRow = {
  name: string;
  amount: string;
  percent: string;
};

export type AnnualPdfReportInput = {
  year: number;
  currency: string;
  labels: PdfReportLabels;
  totalSpent: string;
  totalIncome: string | null;
  monthlyAverage: string;
  monthlyTotals: PdfMonthlyTotal[];
  categoryBreakdown: PdfCategoryRow[];
};

export const generateAnnualPdfReport = async (
  input: AnnualPdfReportInput,
): Promise<void> => {
  const pdfMake = await loadPdfMake();
  const docDefinition = buildAnnualReportDocDefinition(input);

  pdfMake.createPdf(docDefinition).download(`budgard-${input.year}-report.pdf`);
};

// Pure builder, split out so tests can assert on the document structure
// without pulling the ~1 MB pdfmake bundle into the test process.
export const buildAnnualReportDocDefinition = (
  input: AnnualPdfReportInput,
): TDocumentDefinitions => {
  return {
    info: {
      title: `Budgard — ${input.year}`,
      subject: input.currency,
      creator: 'budgard.com',
    },
    pageSize: 'A4',
    pageMargins: [40, 48, 40, 56],
    footer: {
      text: 'budgard.com',
      alignment: 'center',
      style: 'subtle',
      margin: [0, 20, 0, 0],
    },
    content: [
      { text: `Budgard — ${input.year}`, style: 'title' },
      {
        text: input.labels.generatedOn,
        style: 'subtle',
        margin: [0, 2, 0, 16],
      },
      { text: input.labels.summaryTitle, style: 'sectionTitle' },
      buildSummaryTable(input),
      { text: input.labels.monthlyTitle, style: 'sectionTitle' },
      buildMonthlyTable(input),
      { text: input.labels.categoriesTitle, style: 'sectionTitle' },
      buildCategoryTable(input),
    ],
    styles: {
      title: { fontSize: 20, bold: true },
      sectionTitle: { fontSize: 12, bold: true, margin: [0, 12, 0, 6] },
      tableHeader: { fontSize: 9, bold: true, color: '#6b7280' },
      subtle: { fontSize: 9, color: '#6b7280' },
    },
    defaultStyle: { fontSize: 10 },
  };
};

// --- Helpers ---

type PdfMakeStatic = typeof import('pdfmake/build/pdfmake');

type PdfVirtualFs = Record<string, string>;

const loadPdfMake = async (): Promise<PdfMakeStatic> => {
  // Dynamic imports keep pdfmake and its bundled Roboto vfs (Greek and
  // Cyrillic glyph coverage) out of the entry chunk; they load on click.
  const [pdfMakeModule, vfsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const pdfMake = unwrapModule<PdfMakeStatic>(pdfMakeModule);
  const vfs = unwrapModule<PdfVirtualFs>(vfsModule);
  pdfMake.addVirtualFileSystem(vfs);

  return pdfMake;
};

// Both pdfmake build files are CommonJS/UMD; depending on the bundler's
// interop the module namespace either is the export or wraps it in
// `default`. Normalize so callers always get the real export.
const unwrapModule = <T>(moduleObject: unknown): T => {
  const withDefault = moduleObject as { default?: T };
  if (withDefault.default) {
    return withDefault.default;
  }

  return moduleObject as T;
};

const buildSummaryTable = (input: AnnualPdfReportInput): Content => {
  const rows: TableCell[][] = [
    buildSummaryRow(input.labels.totalSpent, input.totalSpent),
  ];

  if (input.totalIncome !== null) {
    rows.push(buildSummaryRow(input.labels.totalIncome, input.totalIncome));
  }

  rows.push(buildSummaryRow(input.labels.monthlyAverage, input.monthlyAverage));

  return {
    table: { widths: [200, 'auto'], body: rows },
    layout: 'noBorders',
    margin: [0, 0, 0, 8],
  };
};

const buildSummaryRow = (label: string, value: string): TableCell[] => {
  return [{ text: label }, { text: value, alignment: 'right', bold: true }];
};

const buildMonthlyTable = (input: AnnualPdfReportInput): Content => {
  const headerRow: TableCell[] = [
    { text: input.labels.monthHeader, style: 'tableHeader' },
    {
      text: input.labels.amountHeader,
      style: 'tableHeader',
      alignment: 'right',
    },
  ];

  const rows = input.monthlyTotals.map((month): TableCell[] => {
    return [
      { text: month.monthLabel },
      { text: month.amount, alignment: 'right' },
    ];
  });

  return {
    table: {
      headerRows: 1,
      widths: ['*', 'auto'],
      body: [headerRow, ...rows],
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 8],
  };
};

const buildCategoryTable = (input: AnnualPdfReportInput): Content => {
  const headerRow: TableCell[] = [
    { text: input.labels.categoryHeader, style: 'tableHeader' },
    {
      text: input.labels.amountHeader,
      style: 'tableHeader',
      alignment: 'right',
    },
    {
      text: input.labels.percentHeader,
      style: 'tableHeader',
      alignment: 'right',
    },
  ];

  const rows = input.categoryBreakdown.map((category): TableCell[] => {
    return [
      { text: category.name },
      { text: category.amount, alignment: 'right' },
      { text: category.percent, alignment: 'right' },
    ];
  });

  return {
    table: {
      headerRows: 1,
      widths: ['*', 'auto', 'auto'],
      body: [headerRow, ...rows],
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 8],
  };
};
