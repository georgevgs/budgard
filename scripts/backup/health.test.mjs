import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkBackupHealth } from './health.mjs';
import { recordBackupRun } from './status.mjs';

const now = Date.parse('2026-10-04T12:00:00.000Z');
const directories = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});
const fixture = async (hours = 1) => {
  const directory = await mkdtemp(join(tmpdir(), 'budgard-health-'));
  directories.push(directory);
  const name = `${new Date(now - hours * 3600000).toISOString().replace(/[:.]/g, '-')}-00000000-0000-0000-0000-000000000001`;
  const folder = join(directory, name);
  await mkdir(folder, { mode: 0o700 });
  const bytes = Buffer.from('encrypted fixture');
  await writeFile(join(folder, 'backup.tar.gz.gpg'), bytes, { mode: 0o600 });
  await writeFile(
    join(folder, 'backup.tar.gz.gpg.sha256'),
    `${createHash('sha256').update(bytes).digest('hex')}  backup.tar.gz.gpg\n`,
    { mode: 0o600 },
  );

  return { directory, folder, name };
};

test('a complete recent archive is healthy without decrypting or reading credentials', async () => {
  const { directory, name } = await fixture();
  assert.deepEqual(await checkBackupHealth(directory, { now }), {
    status: 'healthy',
    latest: name,
    age_hours: 1,
    max_age_hours: 26,
  });
});
test('a stale successful archive triggers a freshness failure', async () => {
  const { directory } = await fixture(27);
  await assert.rejects(
    checkBackupHealth(directory, { now }),
    /freshness window/,
  );
});
test('incomplete staging cannot replace a stale successful archive', async () => {
  const { directory } = await fixture(27);
  await mkdir(join(directory, '.incomplete-new'), { mode: 0o700 });
  await assert.rejects(
    checkBackupHealth(directory, { now }),
    /freshness window/,
  );
});
test('a damaged newest archive is a failure even if an older copy is intact', async () => {
  const { directory, folder } = await fixture();
  const older = join(
    directory,
    '2026-10-04T10-00-00-000Z-00000000-0000-0000-0000-000000000001',
  );
  await mkdir(older, { mode: 0o700 });
  await copyFile(
    join(folder, 'backup.tar.gz.gpg'),
    join(older, 'backup.tar.gz.gpg'),
  );
  await copyFile(
    join(folder, 'backup.tar.gz.gpg.sha256'),
    join(older, 'backup.tar.gz.gpg.sha256'),
  );
  await writeFile(join(folder, 'backup.tar.gz.gpg'), 'corrupt', {
    mode: 0o600,
  });
  await assert.rejects(
    checkBackupHealth(directory, { now }),
    /checksum failed/,
  );
});
test('a failed attempt is visible even while the previous archive is fresh', async () => {
  const { directory } = await fixture();
  await recordBackupRun(directory, 'failed', new Date(now).toISOString());
  await assert.rejects(checkBackupHealth(directory, { now }), /attempt failed/);
  await recordBackupRun(directory, 'complete', new Date(now).toISOString());
  assert.equal((await checkBackupHealth(directory, { now })).status, 'healthy');
});
test('a stalled run is visible without treating normal in-flight work as failed', async () => {
  const { directory } = await fixture();
  await recordBackupRun(
    directory,
    'running',
    new Date(now - 3 * 3600000).toISOString(),
  );
  await assert.rejects(
    checkBackupHealth(directory, { now }),
    /did not complete/,
  );
  await recordBackupRun(directory, 'running', new Date(now).toISOString());
  assert.equal((await checkBackupHealth(directory, { now })).status, 'healthy');
});
