#!/usr/bin/env node
import { access, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertPrivatePath,
  checksum,
  readEnvironment,
  run,
  writePrivate,
} from './backup/io.mjs';
import {
  openSnapshot,
  query,
  storageQuery,
  validateArchiveContents,
} from './backup/database.mjs';
import { downloadObject, sameObjects } from './backup/storage.mjs';
import { loadLocalDefaults } from './backup/local.mjs';
import { createArchive } from './backup/archive.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const executable = (name) => {
  if (process.env.BACKUP_PG_BIN) {
    return join(process.env.BACKUP_PG_BIN, name);
  }

  return name;
};

const configuration = async () => {
  const environmentFile =
    process.env.BACKUP_ENV_FILE ||
    join(homedir(), '.config/budgard/backup.env');
  const saved = await readEnvironment(environmentFile);
  const env = {
    ...saved,
    ...process.env,
    PGSSLMODE: 'verify-full',
    PGSSLROOTCERT: process.env.PGSSLROOTCERT || saved.PGSSLROOTCERT || 'system',
    PGCONNECT_TIMEOUT: '15',
    PGAPPNAME: 'budgard-backup',
  };
  for (const key of [
    'PGHOST',
    'PGPORT',
    'PGDATABASE',
    'PGUSER',
    'PGPASSWORD',
  ]) {
    if (!env[key]) {
      throw new Error(`Missing ${key} in backup configuration`);
    }
  }
  if (env.PGPORT !== '5432') {
    throw new Error('Use the direct database or session pooler on port 5432');
  }
  if (
    !/^(?:[A-F0-9]{40}|[A-F0-9]{64})$/i.test(
      process.env.BACKUP_GPG_RECIPIENT || '',
    )
  ) {
    throw new Error(
      'Set BACKUP_GPG_RECIPIENT to one complete recovery key fingerprint (40 or 64 hexadecimal characters)',
    );
  }

  return {
    env,
    directory: resolve(process.env.BACKUP_DIR || join(root, '.backups')),
    recipient: process.env.BACKUP_GPG_RECIPIENT,
    url: process.env.SUPABASE_URL || saved.SUPABASE_URL,
    key:
      process.env.SUPABASE_SERVICE_ROLE_KEY || saved.SUPABASE_SERVICE_ROLE_KEY,
  };
};

const dumpDatabase = async (directory, config, snapshot) => {
  const path = join(directory, 'database.dump');
  await run(
    executable('pg_dump'),
    [
      '--format=custom',
      '--compress=6',
      '--quote-all-identifiers',
      '--lock-wait-timeout=30s',
      `--snapshot=${snapshot.inventory.snapshot}`,
      '--file',
      path,
    ],
    { env: config.env, logPath: join(directory, 'pg_dump.log') },
  );
  snapshot.assertOpen();
  await run(
    executable('pg_dumpall'),
    [
      '--roles-only',
      '--no-role-passwords',
      '--file',
      join(directory, 'roles.sql'),
    ],
    {
      env: config.env,
      logPath: join(directory, 'pg_dumpall.log'),
    },
  );
  const contents = await run(executable('pg_restore'), ['--list', path]);
  validateArchiveContents(contents, snapshot.inventory);
  // Reading every archive block catches truncation beyond the table of contents.
  await run(executable('pg_restore'), ['--file=/dev/null', path]);
  await writePrivate(join(directory, 'database.contents.txt'), contents);
};

const copyStorage = async (directory, config, inventory) => {
  if (inventory.objects.length && (!config.url || !config.key)) {
    throw new Error(
      'Storage files exist: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required',
    );
  }
  const storageDirectory = join(directory, 'storage');
  await mkdir(storageDirectory, { mode: 0o700 });
  const objects = [];
  for (const object of inventory.objects) {
    objects.push(
      await downloadObject(object, {
        url: config.url,
        key: config.key,
        directory: storageDirectory,
      }),
    );
  }
  const current = JSON.parse(
    await query(executable('psql'), config.env, storageQuery),
  );
  if (!sameObjects(inventory.objects, current)) {
    throw new Error(
      'Storage changed during backup; retry to capture a consistent set of files',
    );
  }

  return objects;
};

const main = async () => {
  process.umask(0o077);
  await loadLocalDefaults();
  const config = await configuration();
  for (const tool of ['psql', 'pg_dump', 'pg_dumpall', 'pg_restore']) {
    await run(executable(tool), ['--version']);
  }
  await run('gpg', [
    '--no-options',
    '--batch',
    '--list-keys',
    config.recipient,
  ]);
  await mkdir(config.directory, { recursive: true, mode: 0o700 });
  await assertPrivatePath(config.directory);
  const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
  const stage = await mkdtemp(join(config.directory, '.incomplete-'));
  const directory = join(stage, 'backup');
  await mkdir(directory, { mode: 0o700 });
  let snapshot;
  try {
    console.log(
      'Backing up all users: database, roles, storage and application source.',
    );
    snapshot = await openSnapshot(executable('psql'), config.env);
    const { inventory } = snapshot;
    await dumpDatabase(directory, config, snapshot);
    const objects = await copyStorage(directory, config, inventory);
    snapshot.assertOpen();
    snapshot.close();
    snapshot = undefined;

    await run('git', [
      '-C',
      root,
      'bundle',
      'create',
      join(directory, 'source.bundle'),
      '--all',
    ]);
    await run('git', [
      '-C',
      root,
      'bundle',
      'verify',
      join(directory, 'source.bundle'),
    ]);
    await run('tar', [
      '-czf',
      join(directory, 'recovery-tools.tar.gz'),
      '-C',
      root,
      'scripts/backup.mjs',
      'scripts/backup',
      'docs/backups.md',
    ]);
    const files = [];
    for (const file of [
      'database.dump',
      'roles.sql',
      'source.bundle',
      'recovery-tools.tar.gz',
    ]) {
      files.push({ file, sha256: await checksum(join(directory, file)) });
    }
    const manifest = {
      format: 1,
      created_at: new Date().toISOString(),
      ...inventory,
      snapshot: undefined,
      objects,
      files,
      scope:
        'All database users and all Storage objects; no user or schema filter',
      verification:
        'Archive blocks read and file checksums recorded; not a restore drill',
      limitations: [
        'Provider configuration, Edge Function secrets and external service data are separate.',
        'Role passwords are omitted; reset custom database role passwords after recovery.',
        'Vault and encrypted columns require the source project encryption root key.',
        'Source bundle contains committed Git history; recovery-tools includes these scripts.',
      ],
    };
    await writePrivate(
      join(directory, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    const result = await createArchive(stage, directory, config, name);
    console.log(
      JSON.stringify({
        status: 'complete',
        users: inventory.users,
        storage_objects: objects.length,
        ...result,
      }),
    );
  } finally {
    snapshot?.close();
    await rm(stage, { recursive: true, force: true });
  }
};

if (process.argv.includes('--help')) {
  console.log(`Usage: node scripts/backup.mjs

Required: BACKUP_GPG_RECIPIENT (public encryption key fingerprint).
Database credentials: ~/.config/budgard/backup.env, or BACKUP_ENV_FILE.
Storage: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY when objects exist.
Optional: BACKUP_DIR, BACKUP_PG_BIN (directory of matching Postgres tools).
Output: a dated folder containing backup.tar.gz.gpg and its SHA-256 checksum.
See docs/backups.md for setup, scheduling, recovery and coverage limits.`);
} else {
  await access(join(root, 'supabase/config.toml'));
  main().catch((error) => {
    console.error(`Backup failed: ${error.message}`);
    process.exitCode = 1;
  });
}
