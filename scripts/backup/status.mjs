import { rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { assertPrivatePath, writePrivate } from './io.mjs';

export const recordBackupRun = async (directory, status, startedAt) => {
  await assertPrivatePath(directory);
  const temporary = join(directory, `.run-status-${randomUUID()}`);
  try {
    await writePrivate(
      temporary,
      `${JSON.stringify({ status, started_at: startedAt, updated_at: new Date().toISOString() })}\n`,
    );
    await rename(temporary, join(directory, 'last-run.json'));
  } finally {
    await rm(temporary, { force: true });
  }
};
