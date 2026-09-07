import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export const parseEnvironment = (text) => {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) {
      continue;
    }
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$/);
    if (!match) {
      throw new Error('Invalid backup environment file');
    }
    values[match[1]] = match[2];
  }

  return values;
};

export const readEnvironment = async (path) => {
  if (!path) {
    return {};
  }

  if (path !== '/dev/null') {
    await assertPrivatePath(path);
  }

  return parseEnvironment(await readFile(path, 'utf8'));
};

export const assertPrivatePath = async (path) => {
  const info = await lstat(path);
  if (
    info.isSymbolicLink() ||
    info.uid !== process.getuid() ||
    (info.mode & 0o077) !== 0
  ) {
    throw new Error(
      'Backup credentials and output directory must be owned by your OS account, with no group/other access or symlinks',
    );
  }
};

// Child output may contain connection strings, SQL values or storage names.
// Keep it in the private backup directory instead of CI or launchd logs.
export const run = (
  command,
  args,
  { env = process.env, input, logPath } = {},
) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const output = [];
    const errors = [];
    child.stdout.on('data', (chunk) => output.push(chunk));
    child.stderr.on('data', (chunk) => errors.push(chunk));
    child.on('error', () => reject(new Error(`Cannot start ${command}`)));
    child.on('close', async (code) => {
      try {
        if (logPath && errors.length) {
          await writePrivate(logPath, Buffer.concat(errors));
        }
        if (code !== 0) {
          reject(
            new Error(
              `${command} failed (exit ${code}); no backup was published`,
            ),
          );

          return;
        }
        resolve(Buffer.concat(output).toString('utf8'));
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });

export const writePrivate = async (path, content) => {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, content, { mode: 0o600, flag: 'wx' });
};

export const checksum = async (path) => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);

  return hash.digest('hex');
};
