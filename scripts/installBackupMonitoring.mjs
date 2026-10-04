#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './backup/io.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const installing = process.argv.includes('--install');
if (process.platform !== 'darwin' && installing) {
  throw new Error('LaunchAgents can only be installed on macOS');
}
const output = resolve(
  process.argv.find((arg) => arg.startsWith('--output='))?.slice(9) ||
    '/tmp/budgard-backup-jobs',
);
const launchAgents = join(homedir(), 'Library/LaunchAgents');
const logs = join(homedir(), 'Library/Logs/Budgard');
// Homebrew upgrades remove versioned Cellar paths. Keep LaunchAgents on the
// stable opt link when Node comes from Homebrew.
const runtime = process.execPath.replace(
  /\/Cellar\/([^/]+)\/[^/]+\//,
  '/opt/$1/',
);
await run(runtime, ['--version']);
const xml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const jobs = [
  {
    label: 'com.budgard.backup',
    script: 'backup.mjs',
    schedule:
      '<key>StartCalendarInterval</key><dict><key>Hour</key><integer>12</integer><key>Minute</key><integer>0</integer></dict>',
  },
  {
    label: 'com.budgard.backup.health',
    script: 'backupMonitor.mjs',
    schedule:
      '<key>StartInterval</key><integer>3600</integer><key>RunAtLoad</key><true/>',
  },
];
await mkdir(output, { recursive: true, mode: 0o700 });
for (const job of jobs) {
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${job.label}</string>
<key>ProgramArguments</key><array><string>${xml(runtime)}</string><string>${xml(join(root, 'scripts', job.script))}</string></array>
<key>WorkingDirectory</key><string>${xml(root)}</string>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
${job.schedule}
<key>StandardOutPath</key><string>${xml(join(logs, `${job.label}.log`))}</string>
<key>StandardErrorPath</key><string>${xml(join(logs, `${job.label}.log`))}</string>
</dict></plist>
`;
  const preview = join(output, `${job.label}.plist`);
  await writeFile(preview, content, { mode: 0o600 });
  await run('/usr/bin/plutil', ['-lint', preview]);
  if (installing) {
    await mkdir(launchAgents, { recursive: true, mode: 0o700 });
    await mkdir(logs, { recursive: true, mode: 0o700 });
    const destination = join(launchAgents, `${job.label}.plist`);
    let current;
    try {
      current = await run('/bin/launchctl', [
        'print',
        `gui/${process.getuid()}/${job.label}`,
      ]);
    } catch {
      // A first install has no registered job yet.
    }
    if (current?.includes('state = running')) {
      throw new Error(
        `Wait for ${job.label} to finish before changing its schedule`,
      );
    }
    try {
      const original = await readFile(destination);
      await writeFile(
        join(logs, `${job.label}.${Date.now()}.previous.plist`),
        original,
        { mode: 0o600, flag: 'wx' },
      );
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    await writeFile(destination, content, { mode: 0o600 });
    try {
      await run('/bin/launchctl', [
        'bootout',
        `gui/${process.getuid()}/${job.label}`,
      ]);
    } catch {
      // A first install has no job to unload.
    }
    await run('/bin/launchctl', [
      'bootstrap',
      `gui/${process.getuid()}`,
      destination,
    ]);
    console.log(`Installed ${job.label}`);
  } else {
    console.log(`Prepared ${preview}`);
  }
}
