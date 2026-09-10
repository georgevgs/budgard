import { test, expect } from './fixtures/test';
import { readFileSync } from 'node:fs';

test('Data Saver leaves speculative features unloaded and still opens them on demand', async ({
  app,
}) => {
  await app.addInitScript(() => {
    const connection = Object.assign(new EventTarget(), {
      saveData: true,
      effectiveType: '4g',
    });
    Object.defineProperty(navigator, 'connection', { value: connection });
    Object.defineProperty(navigator, 'deviceMemory', { value: 8 });
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 });
  });
  const requests: string[] = [];
  app.on('request', (request) => requests.push(request.url()));
  await app.goto('/today');
  await expect(
    app.getByRole('button', { name: /open actions menu/i }),
  ).toBeVisible();
  // Past both idle-prefetch fallbacks; this negative assertion needs a window.
  await app.waitForTimeout(4500);
  expect(
    requests.some((url) =>
      /\/assets\/(ActivityView|AnalyticsView|FormsManager|sentryHeavy)-/.test(
        url,
      ),
    ),
  ).toBe(false);
  expect(
    requests.some((url) =>
      /\/rest\/v1\/(expense_templates|user_notification_settings|account_balances)\?/.test(
        url,
      ),
    ),
  ).toBe(false);

  await app.getByRole('button', { name: /open actions menu/i }).click();
  await app.getByRole('button', { name: /add expense/i }).click();
  await expect
    .poll(() =>
      requests.some((url) => url.includes('/rest/v1/expense_templates?')),
    )
    .toBe(true);
  await app.getByRole('button', { name: /more details/i }).click();
  await expect(app.getByLabel('Amount', { exact: true })).toBeVisible();
  expect(requests.some((url) => /\/assets\/FormsManager-/.test(url))).toBe(
    true,
  );
});

test('compresses a receipt in a local worker before uploading WebP', async ({
  app,
  data,
}) => {
  const csp = readFileSync('netlify.toml', 'utf8')
    .match(/Content-Security-Policy = "([^"]+)"/)![1]
    .replace(/https:\/\/[a-z]+\.supabase\.co/g, 'https://e2e.supabase.co');
  await app.route('**/today', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': csp },
    });
  });
  await app.addInitScript(() => {
    const BaseWorker = window.Worker;
    const completed: string[] = [];
    Object.assign(window, { compressionWorkerResults: completed });
    window.Worker = class extends BaseWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener('message', (event: MessageEvent) => {
          if (event.data?.file instanceof Blob) {
            completed.push(event.data.file.type);
          }
        });
      }
    };
  });
  const libraryRequests: string[] = [];
  app.on('request', (request) => {
    if (request.url().includes('browser-image-compression')) {
      libraryRequests.push(request.url());
    }
  });
  await app.goto('/today');
  await app.getByRole('button', { name: /open actions menu/i }).click();
  await app.getByRole('button', { name: /add expense/i }).click();
  await app.getByRole('button', { name: /more details/i }).click();
  await app.getByLabel('Amount', { exact: true }).fill('12,50');
  await app.getByLabel('Description', { exact: true }).fill('Worker receipt');
  const encoded = await app.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1600;
    const context = canvas.getContext('2d')!;
    const image = context.createImageData(canvas.width, canvas.height);
    let seed = 12345;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = seed >>> 24;
      image.data[i + 3] = 255;
    }
    context.putImageData(image, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
  });
  await app
    .getByRole('dialog')
    .locator('input[type="file"]')
    .setInputFiles({
      name: 'receipt.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(encoded, 'base64'),
    });
  const upload = app.waitForRequest(
    (request) =>
      request.method() === 'POST' &&
      request.url().includes('/storage/v1/object/receipts/'),
  );
  await app.getByRole('button', { name: /save/i }).click();
  const request = await upload;
  await expect
    .poll(
      () =>
        data.expenses.find((row) => row.description === 'Worker receipt')
          ?.receipt_path,
    )
    .toMatch(/\.webp$/);
  const results = await app.evaluate(
    () =>
      (window as unknown as { compressionWorkerResults: string[] })
        .compressionWorkerResults,
  );
  expect(results).toContain('image/webp');
  expect(libraryRequests.length).toBeGreaterThanOrEqual(2);
  expect(
    libraryRequests.every(
      (url) => new URL(url).origin === new URL(app.url()).origin,
    ),
  ).toBe(true);
  expect(request.postDataBuffer()!.length).toBeLessThan(1024 * 1024 + 2048);
});
