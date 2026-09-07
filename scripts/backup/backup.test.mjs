import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  assertPrivatePath,
  checksum,
  parseEnvironment,
  readEnvironment,
  run,
} from './io.mjs';
import { openSnapshot } from './database.mjs';
import {
  downloadObject,
  objectFilename,
  objectUrl,
  sameObjects,
} from './storage.mjs';

test('backup credentials reject shared permissions and symbolic links before being read', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'budgard-backup-access-'));
  const path = join(directory, 'credentials');
  const link = join(directory, 'linked-credentials');
  try {
    await writeFile(path, 'PGPASSWORD=test-only\n', { mode: 0o600 });
    assert.equal((await readEnvironment(path)).PGPASSWORD, 'test-only');
    await chmod(path, 0o644);
    await assert.rejects(readEnvironment(path), /no group\/other access/);
    await chmod(path, 0o600);
    await symlink(path, link);
    await assert.rejects(readEnvironment(link), /symlinks/);
    await chmod(directory, 0o755);
    await assert.rejects(
      assertPrivatePath(directory),
      /no group\/other access/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('database snapshot accepts multiline inventories split across process output chunks', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'budgard-snapshot-test-'));
  const psql = join(directory, 'psql');
  let snapshot;
  try {
    await writeFile(
      psql,
      `#!${process.execPath}
let input = '';
let sent = false;
process.stdin.on('data', (chunk) => {
  input += chunk;
  const marker = input.match(/BUDGARD_SNAPSHOT_[a-f0-9-]+/);
  if (marker && !sent) {
    sent = true;
    process.stdout.write('{\\n"users": 2,\\n');
    setTimeout(() => process.stdout.write('"objects": []}\\n' + marker[0] + '\\n'), 20);
  }
});
process.stdin.on('end', () => process.exit(0));
`,
      { mode: 0o700 },
    );
    snapshot = await openSnapshot(psql, process.env);
    assert.equal(snapshot.inventory.users, 2);
    assert.deepEqual(snapshot.inventory.objects, []);
    assert.doesNotThrow(snapshot.assertOpen);
  } finally {
    snapshot?.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('saved passwords remain literal, including shell expansion and equals signs', () => {
  assert.equal(
    parseEnvironment('PGPASSWORD=a$()b`c=d\n').PGPASSWORD,
    'a$()b`c=d',
  );
});

test('a failed child process cannot report a successful backup or leak stderr', async () => {
  await assert.rejects(
    run(process.execPath, [
      '-e',
      'process.stderr.write("PRIVATE_PASSWORD"); process.exit(12)',
    ]),
    (error) => {
      assert.match(error.message, /failed \(exit 12\)/);
      assert.ok(!error.message.includes('PRIVATE_PASSWORD'));

      return true;
    },
  );
});

test('storage names cannot escape the backup directory or collide across buckets', () => {
  const object = { bucket_id: 'receipts', name: '../../private key.jpg' };
  assert.match(objectFilename(object), /^[a-f0-9]{64}$/);
  assert.notEqual(
    objectFilename(object),
    objectFilename({ ...object, bucket_id: 'other' }),
  );
  assert.throws(
    () => objectUrl('https://example.supabase.co', object),
    /dot path segment/,
  );
});

test('storage requests encode filenames and reject credential forwarding to another host', () => {
  const object = { bucket_id: 'receipts', name: 'user/photo #1?.jpg' };
  assert.equal(
    objectUrl('https://example.supabase.co', object),
    'https://example.supabase.co/storage/v1/object/authenticated/receipts/user/photo%20%231%3F.jpg',
  );
  assert.throws(
    () => objectUrl('https://supabase.co.attacker.test', object),
    /hosted Supabase/,
  );
});

test('replaced or deleted receipts invalidate the storage snapshot', () => {
  const before = [
    {
      id: '1',
      name: 'receipt.jpg',
      version: 'v1',
      updated_at: 'a',
      metadata: { size: 3 },
    },
  ];
  assert.equal(sameObjects(before, [{ ...before[0] }]), true);
  assert.equal(sameObjects(before, [{ ...before[0], version: 'v2' }]), false);
  assert.equal(sameObjects(before, []), false);
});

test('a truncated storage response fails even when its HTTP status is successful', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'budgard-backup-test-'));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('short', { status: 200 });
  try {
    await assert.rejects(
      downloadObject(
        { bucket_id: 'receipts', name: 'test.jpg', metadata: { size: 10 } },
        {
          directory,
          url: 'https://example.supabase.co',
          key: 'test-only',
        },
      ),
      /size changed/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    await rm(directory, { recursive: true, force: true });
  }
});

test('archive checksum detects a changed byte', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'budgard-backup-test-'));
  const path = join(directory, 'archive');
  try {
    await writeFile(path, 'abc');
    const before = await checksum(path);
    assert.equal(
      before,
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    await writeFile(path, 'abd');
    assert.notEqual(await checksum(path), before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
