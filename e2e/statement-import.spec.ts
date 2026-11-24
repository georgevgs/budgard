import { E2E_USER_ID, test, expect, failNextBackendRequest } from './fixtures/test';

const OFX = `OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260812120000[0:GMT]
<TRNAMT>-31.20
<FITID>2001
<NAME>KIOSK ATHENS
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

const pendingTransaction = (id: string, description: string) => ({
  id,
  description,
  user_id: E2E_USER_ID,
  type: 'expense',
  amount: 12,
  date: '2023-01-03',
  created_at: '2023-01-03T11:00:00.000Z',
  review_status: 'pending',
});

// OFX and QIF describe their own fields, so these files skip the column
// mapping step entirely — the point of supporting them at all.
test.describe('statement import', () => {
  test('reviews older imports after relaunch without loading ledger history', async ({ app, data }) => {
    data.expenses.push(
      pendingTransaction('old-charge', 'Old imported charge'),
      { ...pendingTransaction('old-income', 'Old imported income'), type: 'income' },
      { ...pendingTransaction('other-ledger', 'Other ledger charge'), user_id: 'other-user' },
    );
    const historyRequests: string[] = [];
    app.on('request', (request) => {
      const url = new URL(request.url());
      const dateFilter = url.searchParams.get('date');
      if (url.pathname.endsWith('/expenses') && null !== dateFilter && dateFilter.startsWith('lt.')) {
        historyRequests.push(request.url());
      }
    });

    await app.goto('/activity');
    await app.getByRole('link', { name: /2 transaction\(s\) to review/i }).click();
    await expect(app.getByText('Old imported charge')).toBeVisible();
    await expect(app.getByText('Old imported income')).toBeVisible();
    await expect(app.getByText('Other ledger charge')).toHaveCount(0);
    expect(historyRequests).toEqual([]);

    await app.getByRole('button', { name: 'Select all' }).click();
    await app.getByRole('button', { name: 'Review selected (2)' }).click();
    await expect(app.getByText('Everything is reviewed')).toBeVisible();
    expect(data.expenses.find((row) => 'other-ledger' === row.id)).toMatchObject({ review_status: 'pending' });

    await Promise.all([
      app.waitForResponse((response) => {
        const url = new URL(response.url());

        return 'HEAD' === response.request().method() &&
          url.pathname.endsWith('/expenses') &&
          'eq.pending' === url.searchParams.get('review_status') && response.ok();
      }),
      app.getByRole('button', { name: 'Back to activity' }).click(),
    ]);
    await expect(app.getByText('Weekly shop')).toBeVisible();
    await expect(app.getByRole('link', { name: /to review/i })).toHaveCount(0);
  });

  test('pages tied review dates by ID and retries a failed queue read', async ({ app, data }) => {
    data.expenses.push(...Array.from({ length: 51 }, (_, index) => {
      const id = index.toString().padStart(2, '0');

      return pendingTransaction(`import-${id}`, `Imported transaction ${id}`);
    }));
    await app.goto('/activity');
    const review = app.getByRole('link', { name: /51 transaction\(s\) to review/i });
    await expect(review).toBeVisible();
    failNextBackendRequest('expenses', 400, 'PGRST000', 'Pending list unavailable');
    await review.click();

    await expect(app.getByRole('alert')).toContainText(
      "Couldn't load transactions to review.",
    );
    await app.getByRole('button', { name: 'Try again' }).click();
    await expect(app.getByRole('checkbox', { name: /Select Imported transaction/ })).toHaveCount(50);
    await expect(app.getByText('Imported transaction 00')).toHaveCount(0);
    await app.getByRole('button', { name: 'Load more transactions' }).click();
    await expect(app.getByText('Imported transaction 00')).toBeVisible();
    await expect(app.getByRole('checkbox', { name: /Select Imported transaction/ })).toHaveCount(51);
    await expect(app.getByRole('button', { name: 'Load more transactions' })).toHaveCount(0);
  });

  test('manages rules through the legacy settings link without a bank-status request', async ({
    app,
    data,
  }) => {
    data.transaction_rules = [
      {
        id: 'rule-1',
        user_id: E2E_USER_ID,
        match_type: 'contains',
        match_value: 'KIOSK',
        transaction_type: 'expense',
        rename_to: 'Kiosk',
        category_id: null,
        tag_id: null,
        priority: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    const bankRequests: string[] = [];
    app.on('request', (request) => {
      if (request.url().includes('/financial_connections')) {
        bankRequests.push(request.url());
      }
    });
    await app.goto('/settings/connections');
    await expect(
      app.getByRole('heading', { name: 'Imports and rules' }),
    ).toBeVisible();
    await expect(app.getByText('KIOSK', { exact: true })).toBeVisible();
    await app.screenshot({
      path: 'test-results/settings-imports.png',
      fullPage: true,
    });
    await app.getByRole('button', { name: 'Delete rule for KIOSK' }).click();
    await app.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(data.transaction_rules).toHaveLength(1);
    await app.getByRole('button', { name: 'Delete rule for KIOSK' }).click();
    await app.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(() => data.transaction_rules.length).toBe(0);
    await expect(
      app.getByText('No rules yet.', { exact: false }),
    ).toBeVisible();
    expect(bankRequests).toEqual([]);
    await app
      .getByRole('button', { name: 'Import statement', exact: true })
      .click();
    await expect(app.getByRole('dialog')).toBeVisible();
  });

  test('reads an OFX file straight to the preview, with no mapping step', async ({
    app,
  }) => {
    await app.goto('/activity');
    await app.getByRole('button', { name: /more actions/i }).click();
    await app.getByRole('menuitem', { name: /import statement/i }).click();

    await app.locator('input[type="file"]').setInputFiles({
      name: 'statement.ofx',
      mimeType: 'application/x-ofx',
      buffer: Buffer.from(OFX),
    });

    // Straight past mapping: the transaction is already read, and the
    // column-mapping step never appears.
    await expect(app.getByText('KIOSK ATHENS')).toBeVisible();
    await expect(app.getByText(/select which columns/i)).toBeHidden();
    await expect(app.getByRole('combobox', { name: 'Date' })).toHaveCount(0);
  });

  test('still offers column mapping for a CSV', async ({ app }) => {
    await app.goto('/activity');
    await app.getByRole('button', { name: /more actions/i }).click();
    await app.getByRole('menuitem', { name: /import statement/i }).click();

    await app.locator('input[type="file"]').setInputFiles({
      name: 'export.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Date,Description,Amount\n2026-08-12,Kiosk,-31.20\n'),
    });

    await expect(app.getByText(/select which columns/i)).toBeVisible();
    // The mapping selects each carry a name now, rather than announcing only
    // their current value.
    await expect(app.getByRole('combobox', { name: 'Date' })).toBeVisible();
  });
});
