import { mkdir, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { checksum, run, writePrivate } from './io.mjs';

export const createArchive = async (stage, directory, config, name) => {
  const tarPath = join(stage, 'backup.tar.gz');
  await run('tar', ['-czf', tarPath, '-C', directory, '.']);
  await run('gzip', ['--test', tarPath]);
  const output = join(stage, 'completed');
  await mkdir(output, { mode: 0o700 });
  const encryptedPath = join(output, 'backup.tar.gz.gpg');
  await run('gpg', [
    '--no-options',
    '--batch',
    '--no-encrypt-to',
    '--trust-model',
    'always',
    '--recipient',
    config.recipient,
    '--encrypt',
    '--output',
    encryptedPath,
    tarPath,
  ]);
  const digest = await checksum(encryptedPath);
  const bytes = (await stat(encryptedPath)).size;
  await writePrivate(
    `${encryptedPath}.sha256`,
    `${digest}  backup.tar.gz.gpg\n`,
  );
  const destination = join(config.directory, name);
  // Publish both encrypted files together; plaintext stays in temporary staging.
  await rename(output, destination);

  return {
    directory: destination,
    file: join(destination, 'backup.tar.gz.gpg'),
    sha256: digest,
    bytes,
  };
};
