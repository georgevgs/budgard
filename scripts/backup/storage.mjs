import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { checksum } from './io.mjs';

export const objectFilename = ({ bucket_id, name }) =>
  createHash('sha256')
    .update(JSON.stringify([bucket_id, name]))
    .digest('hex');

export const objectUrl = (baseUrl, { bucket_id, name }) => {
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) {
    throw new Error('SUPABASE_URL must be a hosted Supabase HTTPS URL');
  }
  // URL parsers normalize dot segments, even when percent encoded.
  if (name.split('/').some((part) => part === '.' || part === '..')) {
    throw new Error(
      'Storage object contains a dot path segment; refusing an incomplete backup',
    );
  }
  const path = [bucket_id, ...name.split('/')]
    .map(encodeURIComponent)
    .join('/');

  return `${url.origin}/storage/v1/object/authenticated/${path}`;
};

export const downloadObject = async (object, { url, key, directory }) => {
  const response = await fetch(objectUrl(url, object), {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    redirect: 'error',
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok || !response.body) {
    throw new Error(
      `Storage download failed (HTTP ${response.status}); no backup was published`,
    );
  }

  const filename = objectFilename(object);
  const path = join(directory, filename);
  await pipeline(
    Readable.fromWeb(response.body),
    createWriteStream(path, { mode: 0o600, flags: 'wx' }),
  );
  const { size } = await stat(path);
  const expected = object.metadata?.size;
  if (expected !== undefined && size !== Number(expected)) {
    throw new Error(
      'Storage object size changed during backup; retry the backup',
    );
  }

  return {
    ...object,
    file: `storage/${filename}`,
    size,
    sha256: await checksum(path),
  };
};

export const sameObjects = (before, after) => {
  const signature = (objects) =>
    JSON.stringify(
      objects
        .map((object) => ({
          id: object.id,
          bucket_id: object.bucket_id,
          name: object.name,
          version: object.version,
          updated_at: object.updated_at,
          metadata: object.metadata,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );

  return signature(before) === signature(after);
};
