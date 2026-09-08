import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { assertPrivatePath } from './io.mjs';

export const loadLocalDefaults = async () => {
  const path = join(homedir(), '.config/budgard/backup-local.json');
  let local;
  try {
    await assertPrivatePath(path);
    local = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
  for (const name of [
    'BACKUP_GPG_RECIPIENT',
    'BACKUP_DIR',
    'BACKUP_PG_BIN',
    'GNUPGHOME',
    'PGSSLROOTCERT',
    'SUPABASE_URL',
  ]) {
    if (!process.env[name] && typeof local[name] === 'string') {
      process.env[name] = local[name];
    }
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && local.storageKeyFile) {
    await assertPrivatePath(local.storageKeyFile);
    process.env.SUPABASE_SERVICE_ROLE_KEY = (
      await readFile(local.storageKeyFile, 'utf8')
    ).trim();
  }
};
