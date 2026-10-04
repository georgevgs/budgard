import { E2E_USER_ID, test, expect } from './fixtures/test';

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

// OFX and QIF describe their own fields, so these files skip the column
// mapping step entirely — the point of supporting them at all.
test.describe('statement import', () => {
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
