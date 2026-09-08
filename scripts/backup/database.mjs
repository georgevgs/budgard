import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { run } from './io.mjs';

export const storageQuery = `SELECT coalesce(json_agg(o ORDER BY o.id), '[]'::json)
  FROM (SELECT id, bucket_id, name, metadata, version, updated_at
        FROM storage.objects) o`;

const inventoryQuery = `SELECT json_build_object(
  'snapshot', pg_export_snapshot(),
  'server_version', current_setting('server_version'),
  'database', current_database(),
  'users', (SELECT count(*) FROM auth.users),
  'schemas', (SELECT json_agg(nspname ORDER BY nspname) FROM pg_namespace
    WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'),
  'app_tables', (SELECT coalesce(json_agg(json_build_object('schema', n.nspname, 'name', c.relname)
    ORDER BY n.nspname, c.relname), '[]'::json) FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'private') AND c.relkind = 'r'),
  'buckets', (SELECT coalesce(json_agg(b), '[]'::json) FROM storage.buckets b),
  'objects', (${storageQuery})
)`;

export const validateArchiveContents = (contents, inventory) => {
  if (!Array.isArray(inventory.app_tables)) {
    throw new Error('Backup is missing its application table inventory');
  }
  const required = [
    { schema: 'auth', name: 'users' },
    { schema: 'public', name: 'expenses' },
    ...inventory.app_tables,
  ];
  for (const { schema, name } of required) {
    if (!contents.includes(`TABLE DATA ${schema} ${name} `)) {
      throw new Error(`Backup lacks required table data: ${schema}.${name}`);
    }
  }
};

export const query = (psql, env, sql) =>
  run(psql, ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1'], {
    env,
    input: `${sql};\n`,
  });

// The inventory and pg_dump share one PostgreSQL snapshot, so new users or
// transactions cannot fall between separate database export passes.
export const openSnapshot = (psql, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      psql,
      ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1'],
      {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    let output = '';
    const marker = `BUDGARD_SNAPSHOT_${randomUUID()}`;
    let isReady = false;
    let hasExited = false;
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Timed out opening database snapshot'));
    }, 60_000);
    child.stderr.resume();
    child.stdin.on('error', () => {});
    child.on('error', () => {
      clearTimeout(timer);
      reject(new Error('Cannot start psql'));
    });
    child.on('close', () => {
      hasExited = true;
      clearTimeout(timer);
      if (!isReady) {
        reject(
          new Error('Cannot open database snapshot; check backup credentials'),
        );
      }
    });
    child.stdout.on('data', (chunk) => {
      if (isReady) {
        return;
      }
      output += chunk.toString();
      const boundary = output.indexOf(`\n${marker}\n`);
      if (boundary === -1) {
        return;
      }
      clearTimeout(timer);
      try {
        const inventory = JSON.parse(output.slice(0, boundary).trim());
        isReady = true;
        resolve({
          inventory,
          assertOpen: () => {
            if (hasExited) {
              throw new Error(
                'Database snapshot closed before backup completed',
              );
            }
          },
          close: () => child.stdin.end('ROLLBACK;\n'),
        });
      } catch {
        child.kill();
        reject(new Error('Invalid database snapshot inventory'));
      }
    });
    child.stdin.write(`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL idle_in_transaction_session_timeout = '30min';
${inventoryQuery};\n\\echo ${marker}\n`);
  });
