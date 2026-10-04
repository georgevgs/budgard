#!/usr/bin/env node
import { resolve } from 'node:path';
import { checkBackupHealth } from './backup/health.mjs';
import { loadLocalDefaults } from './backup/local.mjs';
import { run } from './backup/io.mjs';

try {
  await loadLocalDefaults({ includeStorageCredentials: false });
  await checkBackupHealth(resolve(process.env.BACKUP_DIR || '.backups'));
  console.log('Backup monitor: healthy');
} catch (error) {
  console.error(`Backup monitor failed: ${error.message}`);
  if (process.platform === 'darwin') {
    try {
      await run('/usr/bin/osascript', [
        '-e',
        'display notification "The latest encrypted backup is missing, stale, damaged, or a recent attempt failed. Check the Budgard backup log." with title "Budgard backup needs attention"',
      ]);
    } catch {
      console.error(
        'Could not display the backup notification; check monitoring logs.',
      );
    }
  }
  process.exitCode = 1;
}
