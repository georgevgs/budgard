#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { checksum, run } from './io.mjs';

const main = async () => {
  if (!process.argv[2]) {
    throw new Error(
      'Usage: node scripts/backup/verify.mjs <decrypted-directory>',
    );
  }
  const directory = resolve(process.argv[2]);
  const manifest = JSON.parse(
    await readFile(resolve(directory, 'manifest.json'), 'utf8'),
  );
  if (
    manifest.format !== 1 ||
    !Array.isArray(manifest.files) ||
    !Array.isArray(manifest.objects)
  ) {
    throw new Error('Unsupported or incomplete backup manifest');
  }
  for (const name of [
    'database.dump',
    'roles.sql',
    'source.bundle',
    'recovery-tools.tar.gz',
  ]) {
    if (!manifest.files.some(({ file }) => file === name)) {
      throw new Error(`Missing required backup file: ${name}`);
    }
  }
  for (const item of [...manifest.files, ...manifest.objects]) {
    const path = resolve(directory, item.file);
    if (!path.startsWith(`${directory}${sep}`)) {
      throw new Error('Unsafe manifest path');
    }
    if ((await checksum(path)) !== item.sha256) {
      throw new Error(`Checksum mismatch: ${item.file}`);
    }
  }
  await run('pg_restore', [
    '--file=/dev/null',
    resolve(directory, 'database.dump'),
  ]);
  await run('git', ['bundle', 'verify', resolve(directory, 'source.bundle')]);
  console.log(
    `Verified ${manifest.users} users and ${manifest.objects.length} stored files. A restore drill is still required.`,
  );
};

main().catch((error) => {
  console.error(`Verification failed: ${error.message}`);
  process.exitCode = 1;
});
