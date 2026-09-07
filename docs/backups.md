# Backups and recovery

`node scripts/backup.mjs` backs up the **entire Supabase project, for every
user**. It never applies a user ID or a schema filter. It reads production;
it does not restore, delete data, or change permissions there.

## Coverage

Each encrypted `.tar.gz.gpg` archive contains:

- `database.dump`: a PostgreSQL custom archive with all dumpable schemas,
  records, functions, triggers, RLS policies, owners and permission grants.
  This includes `public`, `private`, `auth`, `storage`, migration history,
  and extension configuration tables that PostgreSQL marks for dumping.
- `roles.sql`: database role definitions and memberships. Database login role
  passwords are omitted; Auth users' password hashes remain in `database.dump`.
- `storage/`: the bytes of every object in every Storage bucket. File names
  are hashed locally; `manifest.json` maps them to their original bucket/key,
  metadata, size and SHA-256 checksum. An empty bucket remains in the inventory.
- `source.bundle`: committed Git history, including migrations and Edge
  Function source. Uncommitted application changes are not part of this bundle.
- `recovery-tools.tar.gz`: the backup/verification scripts and this guide as
  they existed when the backup ran, including uncommitted changes to these files.
- `manifest.json`: inventory, database version, user count and checksums.

The database dump and Storage inventory share one PostgreSQL snapshot.
Storage bytes are downloaded separately: Supabase does not provide an atomic
transaction spanning PostgreSQL and Storage. Missing files, size mismatches,
or changed Storage metadata cause the run to fail. Retry the complete run.
Prefer a quiet period; a large or constantly changing bucket may require a
maintenance window to obtain a stable copy.

The job reads every database archive block, tests gzip integrity, and hashes
files before publishing. These checks are **not a successful restore drill**.

## Setup

Requires Node 24+, Git, GnuPG, tar/gzip, and Postgres client tools at least as
new as the source server. On the current Mac, Postgres 17 tools are installed
at `/opt/homebrew/opt/postgresql@17/bin`.

The existing database credentials are read literally from
`~/.config/budgard/backup.env`. Shell expressions in passwords are never
evaluated. Use `BACKUP_ENV_FILE` to choose a different private file, or
`BACKUP_ENV_FILE=/dev/null` to supply all connection settings through the
process environment. Required names are `PGHOST`, `PGPORT`, `PGUSER`,
`PGDATABASE`, `PGPASSWORD`. Use the direct connection or session pooler on
port 5432. The runner enforces TLS with certificate and hostname validation
(`verify-full`), using the system CA store by default. If your endpoint uses
a project-specific CA, set `PGSSLROOTCERT` to the CA certificate downloaded
from the Supabase dashboard. An untrusted certificate stops the backup.
The system CA option requires Postgres client tools version 16 or newer.

Configure these additional process environment variables in the runner:

| Variable                    | Purpose                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| `BACKUP_GPG_RECIPIENT`      | Fingerprint of the imported public recovery key                      |
| `SUPABASE_URL`              | The project's `https://<ref>.supabase.co` URL                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side service-role key for all Storage files                   |
| `BACKUP_PG_BIN`             | Optional directory containing Postgres client tools                  |
| `BACKUP_DIR`                | Output directory; defaults to ignored `.backups/` in this repository |
| `GNUPGHOME`                 | Optional private GnuPG directory                                     |

Storage credentials are required when the database inventory contains files.
Use the project's service-role JWT, not a user's token or the public anon key.
Never put these values in frontend `VITE_*` variables or commit them.

Create a dedicated GPG encryption key on a trusted recovery machine, and
keep an exported private key and its passphrase in a separate secure location.
Only its public key is needed on the backup runner. Verify decryption before
depending on scheduled backups. Losing the private key loses the backups.

The recipient must be one full fingerprint. GPG configuration files and
extra `encrypt-to` recipients are disabled for backup encryption, so local
GPG preferences cannot silently add another recipient. Credentials and the
output directory must belong to the current OS account and have no access
bits for group/others; symbolic links are rejected at these paths.
This does not protect against malware or administrators controlling the
runner while plaintext is being collected. Keep the runner trusted and
its disk encrypted; protect the recovery private key with a passphrase.

Run from the repository:

```sh
node scripts/backup.mjs
```

The runner uses owner-only directory/file permissions, unique timestamps,
and temporary staging. Plaintext staging is removed when the run finishes
or fails. A killed process or machine crash can leave `.incomplete-*`
directories; these are never successful backups and should be removed after
confirming no backup is running. Existing successful backups are never pruned
or overwritten by this script.

## Scheduling and retention

For production, run daily on an independent runner; a Mac LaunchAgent depends
on the Mac being available. Keep the recovery private key off that runner.
Store encrypted archives in a private backup destination separate from the
Supabase project, with versioning/immutability where available. Keep at least
30 daily copies and 12 monthly copies; enforce retention at the destination
only after verifying a new successful copy. Keep a second independent copy.

Alert when a run fails and when no successful backup exists for 26 hours.
A scheduler's existence does not prove backups are running. Inspect the
last successful archive timestamp and verify copies at the destination.
Do not upload plaintext staging or use public Git repositories as storage.

The old `~/Scripts/budgard-backup.sh` is a separate, incomplete weekly backup.
Replace its schedule only after the new job has completed and its output has
been decrypted and verified. A local source script alone does not activate a
cloud scheduler or provision backup storage.

## Verify and recover

1. Download the archive and its `.sha256` file to a trusted recovery machine.
   Check the ciphertext before decrypting:

   ```sh
   shasum -a 256 -c budgard-<timestamp>.tar.gz.gpg.sha256
   ```

2. In an owner-only working directory, decrypt and extract:

   ```sh
   umask 077
   mkdir recovery
   gpg --output recovery.tar.gz --decrypt budgard-<timestamp>.tar.gz.gpg
   tar -xzf recovery.tar.gz -C recovery
   node scripts/backup/verify.mjs recovery
   ```

3. Restore into a **separate, empty Supabase project** with a compatible
   Postgres version and extensions. Review the archive table of contents and
   the saved roles first. A full native dump includes Supabase-managed
   definitions; it is not a safe one-command overwrite of an existing hosted
   project. Use the [Supabase recovery guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
   to prepare the target, preserve its managed roles, apply custom schemas
   and grants, and load data in a transaction with errors stopping the restore.
   Disable application triggers during data loading, then reinstate them.
   Do not replay cron jobs that contact production during a drill.
4. Recreate buckets/settings and upload files through the Storage API using
   the manifest's bucket/name mapping and metadata. Database rows alone do not
   recreate stored file bytes. Verify each uploaded object's checksum.
5. Verify user counts, representative financial records across multiple
   users, household access, RLS isolation, login and receipt downloads before
   considering recovery successful. Record the restore date and outcome.

Run a restore drill after initial setup and at least quarterly thereafter.
Never test restoring over production.

## Separate recovery dependencies

The database archive is not a complete export of the hosting platform:

- Keep Supabase Auth/provider settings, API settings, deployed Function
  versions and secrets, Netlify settings, DNS and external service credentials
  in a separate encrypted configuration backup/password manager.
- Vault secrets and encrypted columns require the source project's encryption
  root key when moving to another project. Preserve that key using Supabase's
  documented procedure before a disaster; ciphertext alone is insufficient.
- Stripe and other external services' own records are outside Supabase.
- Device-only settings and writes still queued offline have not reached the
  server and cannot be captured by this backup.

Supabase's [managed backups](https://supabase.com/docs/guides/platform/backups)
and PITR, when enabled on the project, provide an additional recovery layer.
Their database backups also exclude Storage file bytes.

## Development checks

```sh
node --test scripts/backup/backup.test.mjs
npm run lint
npm run test
npm run build
```
