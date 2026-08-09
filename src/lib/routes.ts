// The four bottom-nav tabs, in dock order. Shared because more than one place
// needs to know exactly which routes are tabs — chiefly the keep-alive layout
// that mounts them all and hides the inactive ones.
const MAIN_TAB_PATHS = ['/today', '/activity', '/plan', '/trends'] as const;

export type MainTabPath = (typeof MAIN_TAB_PATHS)[number];

export const isMainTabPath = (path: string): path is MainTabPath =>
  (MAIN_TAB_PATHS as readonly string[]).includes(path);

// Where logging a transaction is the screen's own primary action, which is a
// narrower question than "is this a tab". Today and Activity are both views of
// transactions, so "add one" is what you came to do. Plan is where you set a
// budget and wire up recurring items; Trends is a report you read. A floating
// "+ expense" on either is the wrong verb for the screen, and a button that
// means something different depending on where you tapped it is the exact
// inconsistency this list exists to prevent.
const TRANSACTION_ENTRY_PATHS: readonly string[] = ['/today', '/activity'];

export const isTransactionEntryPath = (path: string): boolean =>
  TRANSACTION_ENTRY_PATHS.includes(path);
