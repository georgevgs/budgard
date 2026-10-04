import { lstat, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { assertPrivatePath, checksum } from './io.mjs';

// Only atomically published dated folders count. Incomplete staging and logs
// cannot make a failed backup look fresh; a damaged newest copy cannot hide
// behind an older healthy one.
export const checkBackupHealth = async (
  directory,
  { now = Date.now(), maxAgeHours = 26 } = {},
) => {
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
    throw new Error('Backup maximum age must be a positive number of hours');
  }
  await assertPrivatePath(directory);
  const entries = await readdir(directory);
  const completed = entries
    .filter((name) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[\da-f-]{36}$/i.test(name),
    )
    .sort();
  const latest = completed.at(-1);
  if (!latest) {
    throw new Error('No completed encrypted backup exists');
  }
  const folder = join(directory, latest);
  await assertPrivatePath(folder);
  const file = join(folder, 'backup.tar.gz.gpg');
  const digestFile = `${file}.sha256`;
  await assertPrivatePath(file);
  await assertPrivatePath(digestFile);
  if (!(await lstat(file)).isFile() || (await lstat(file)).size === 0) {
    throw new Error('Newest encrypted backup is empty or not a file');
  }
  const expected = (await readFile(digestFile, 'utf8')).match(
    /^([a-f0-9]{64})  backup\.tar\.gz\.gpg\n?$/i,
  )?.[1];
  if (!expected || (await checksum(file)) !== expected.toLowerCase()) {
    throw new Error('Newest encrypted backup checksum failed');
  }
  const timestamp = latest
    .slice(0, 24)
    .replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z');
  const ageHours = (now - Date.parse(timestamp)) / 3600000;
  if (!Number.isFinite(ageHours) || ageHours < -1 || ageHours > maxAgeHours) {
    throw new Error(
      `Newest successful backup is outside the ${maxAgeHours}-hour freshness window`,
    );
  }
  await checkLastRun(directory, now);

  return {
    status: 'healthy',
    latest,
    age_hours: Math.round(ageHours * 100) / 100,
    max_age_hours: maxAgeHours,
  };
};

const checkLastRun = async (directory, now) => {
  const path = join(directory, 'last-run.json');
  let run;
  try {
    await assertPrivatePath(path);
    run = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
  if (run.status === 'failed') {
    throw new Error('Last backup attempt failed; retry a complete backup');
  }
  if (
    run.status === 'running' &&
    now - Date.parse(run.started_at) > 2 * 3600000
  ) {
    throw new Error('Last backup attempt did not complete within two hours');
  }
  if (
    !['running', 'complete'].includes(run.status) ||
    !Number.isFinite(Date.parse(run.started_at))
  ) {
    throw new Error('Backup run status is invalid');
  }
};
