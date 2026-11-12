// Decides which npm advisories are worth failing a build over.
//
// `bun audit` reports every advisory in the installed tree with the same exit
// code, so a low-severity bug in a test runner's URL parser fails the daily
// run exactly as loudly as a hole in code that ships to users. That job was
// red for weeks and nobody read it any more, which is worse than no job.
//
// The line drawn here: an advisory blocks only when it is high or critical
// AND the package is reachable from `dependencies` — the graph that is
// bundled into the app. Everything else (vite, vitest, eslint, jsdom, the
// PWA build) runs on a developer machine or a CI runner against our own
// source, and is reported without failing.

const severityRank = { low: 0, moderate: 1, high: 2, critical: 3 };
const blockingRank = severityRank.high;

// bun.lock is JSONC: it allows trailing commas, which JSON.parse refuses.
// The file holds names, versions, ranges and hashes only, so no string in it
// can contain the `,}` or `,]` this strips.
export const parseBunLock = (text) =>
  JSON.parse(text.replace(/,(\s*[}\]])/g, '$1'));

// Every package reachable from the root workspace's `dependencies`, as a map
// of name to the versions installed on that graph, resolving nested copies the way Node does: a package installed under
// another (`parent/child` in the lock) shadows the hoisted one for everything
// inside that parent. Optional peers are not installed by their dependant, so
// they are not followed.
export const findRuntimePackages = (lock) => {
  const packages = lock.packages;
  const root = lock.workspaces[''].dependencies ?? {};
  const runtime = new Map();
  const seen = new Set();
  const queue = Object.keys(root).map((name) => ({ name, scopes: [] }));

  while (queue.length > 0) {
    const { name, scopes } = queue.shift();
    const key = resolveKey(packages, name, scopes);
    if (key === undefined || seen.has(key)) {
      continue;
    }

    seen.add(key);
    const versions = runtime.get(name) ?? new Set();
    runtime.set(name, versions.add(installedVersion(packages[key])));
    const childScopes = [key, ...scopesBelow(key, scopes)];
    for (const child of installedChildren(packages[key])) {
      queue.push({ name: child, scopes: childScopes });
    }
  }

  return runtime;
};

// Splits `bun audit --json` output into what fails the run and what is only
// reported. The audit keys advisories by name alone, so a vulnerable copy
// that only a dev tool pulls in (eslint's own zod, say) would otherwise taint
// the patched copy the app ships; `satisfies(version, range)` checks the
// runtime versions against the advisory's range. `acknowledged` maps an advisory URL or GHSA id to the reason it
// was reviewed and accepted; it is the escape hatch for a runtime advisory
// that cannot be reached, so one unfixable report does not turn the job red
// every morning again.
export const triageAdvisories = (
  report,
  runtime,
  { satisfies, acknowledged = {} },
) => {
  const blocking = [];
  const reported = [];

  for (const [name, advisories] of Object.entries(report)) {
    for (const advisory of advisories) {
      const versions = [...(runtime.get(name) ?? [])];
      const shipped = versions.some((version) =>
        satisfies(version, advisory.vulnerable_versions),
      );
      const finding = { name, ...advisory, runtime: shipped };
      if (isBlocking(finding, acknowledged)) {
        blocking.push(finding);
        continue;
      }

      reported.push(finding);
    }
  }

  return { blocking, reported };
};

const isBlocking = (finding, acknowledged) => {
  if (!finding.runtime) {
    return false;
  }

  if ((severityRank[finding.severity] ?? blockingRank) < blockingRank) {
    return false;
  }

  return !Object.hasOwn(acknowledged, advisoryId(finding));
};

export const advisoryId = (finding) =>
  finding.url?.split('/').pop() ?? String(finding.id);

const resolveKey = (packages, name, scopes) => {
  for (const scope of scopes) {
    const nested = `${scope}/${name}`;
    if (Object.hasOwn(packages, nested)) {
      return nested;
    }
  }

  if (Object.hasOwn(packages, name)) {
    return name;
  }

  return undefined;
};

// The directories a nested key's own children may resolve from: its own
// node_modules first, then every directory its parent could see. A hoisted
// key sees only the root.
const scopesBelow = (key, scopes) => {
  const parent = scopes.find((scope) => key.startsWith(`${scope}/`));
  if (parent === undefined) {
    return [];
  }

  return scopes.slice(scopes.indexOf(parent));
};

// A lock entry starts with `name@version`; a scoped name has its own `@`.
const installedVersion = (entry) =>
  entry[0].slice(entry[0].lastIndexOf('@') + 1);

const installedChildren = (entry) => {
  const meta = entry?.[2] ?? {};
  const optionalPeers = new Set(meta.optionalPeers ?? []);
  const peers = Object.keys(meta.peerDependencies ?? {}).filter(
    (name) => !optionalPeers.has(name),
  );

  return [
    ...Object.keys(meta.dependencies ?? {}),
    ...Object.keys(meta.optionalDependencies ?? {}),
    ...peers,
  ];
};
