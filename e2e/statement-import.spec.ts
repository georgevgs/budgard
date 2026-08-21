import { test, expect } from './fixtures/test';

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
    await expect(
      app.getByText(/select which columns/i),
    ).toBeHidden();
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
