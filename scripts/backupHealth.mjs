#!/usr/bin/env node
import { resolve } from 'node:path';
import { checkBackupHealth } from './backup/health.mjs';
import { loadLocalDefaults } from './backup/local.mjs';

if (process.argv.includes('--help')) {
  console.log(
    'Usage: bun run backup:health [directory] [maximum-age-hours]\nDefaults: configured BACKUP_DIR (or .backups), 26 hours. Checks ciphertext integrity, freshness and the last attempt; never decrypts or contacts Supabase. Exit 1 means monitoring should alert.',
  );
} else {
  try {
    await loadLocalDefaults({ includeStorageCredentials: false });
    const directory = resolve(
      process.argv[2] || process.env.BACKUP_DIR || '.backups',
    );
    const maxAgeHours = Number(process.argv[3] || 26);
    console.log(
      JSON.stringify(await checkBackupHealth(directory, { maxAgeHours })),
    );
  } catch (error) {
    console.error(`Backup health failed: ${error.message}`);
    process.exitCode = 1;
  }
}
