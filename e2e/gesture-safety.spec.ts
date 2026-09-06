import { expect, test } from './fixtures/test';

test('pinching an Activity row does not expose Delete', async ({ app }) => {
  await app.goto('/activity');
  const row = app.getByRole('link', { name: 'Open Weekly shop' });
  await expect(row).toBeVisible();

  await pinch(row);

  await expect(
    app.getByRole('button', { name: 'Delete Weekly shop' }),
  ).toBeHidden();
  await expect(app).toHaveURL(/\/activity$/);
});

test('pinching a sheet header keeps the edit form open', async ({ app }) => {
  await app.goto('/t/exp-1');
  await app.getByRole('button', { name: /^edit$/i }).click();
  const dialog = app.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await pinch(dialog.locator('[data-drag-handle]'));

  await expect(dialog).toBeVisible();
  await expect(app.getByLabel('Description', { exact: true })).toHaveValue(
    'Weekly shop',
  );
  await app.getByRole('button', { name: /^cancel$/i }).click();
  await expect(dialog).toBeHidden();
});

// --- Helpers ---

const pinch = async (target: import('@playwright/test').Locator) => {
  await target.evaluate(async (element) => {
    const send = (type: string, progress: number, ended = false) => {
      const touches: Touch[] = [];
      if (!ended) {
        touches.push(
          new Touch({
            identifier: 1,
            target: element,
            clientX: 150 - progress,
            clientY: 100 + progress,
          }),
          new Touch({
            identifier: 2,
            target: element,
            clientX: 200 + progress,
            clientY: 150 - progress,
          }),
        );
      }
      element.dispatchEvent(
        new TouchEvent(type, { bubbles: true, cancelable: true, touches }),
      );
    };
    send('touchstart', 0);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    send('touchmove', 160);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    send('touchend', 160, true);
  });
};
