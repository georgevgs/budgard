import type { Updater } from '@/common/hooks/data/dataReducer';

export type LocalWriteLog = {
  mark: () => number;
  record: (ids: string[]) => void;
  idsSince: (mark: number) => string[];
};

const MAX_ENTRIES = 500;

// Remembers which rows local writes touched, so a fetch that started earlier
// does not overwrite them when it lands.
export const createLocalWriteLog = (): LocalWriteLog => {
  const state = {
    sequence: 0,
    entries: [] as { sequence: number; id: string }[],
  };

  return {
    mark: () => state.sequence,
    record: (ids) => {
      for (const id of ids) {
        state.sequence += 1;
        state.entries.push({ sequence: state.sequence, id });
      }
      if (state.entries.length > MAX_ENTRIES) {
        state.entries.splice(0, state.entries.length - MAX_ENTRIES);
      }
    },
    idsSince: (mark) =>
      state.entries
        .filter((entry) => entry.sequence > mark)
        .map((entry) => entry.id),
  };
};

export const changedRowIds = <T extends { id: string }>(
  previous: T[],
  next: T[],
): string[] => {
  const previousById = new Map(previous.map((row) => [row.id, row]));
  const nextIds = new Set(next.map((row) => row.id));
  const addedOrReplaced = next
    .filter((row) => previousById.get(row.id) !== row)
    .map((row) => row.id);
  const removed = previous
    .filter((row) => false === nextIds.has(row.id))
    .map((row) => row.id);

  return [...addedOrReplaced, ...removed];
};

export const withLocalWrites = <T extends { id: string }>(
  pending: { kept: ReadonlySet<string>; deleted: ReadonlySet<string> },
  touchedIds: string[],
  local: T[],
): { kept: Set<string>; deleted: Set<string> } => {
  const localIds = new Set(local.map((row) => row.id));
  const kept = new Set(pending.kept);
  const deleted = new Set(pending.deleted);
  for (const id of touchedIds) {
    if (localIds.has(id)) {
      kept.add(id);
    } else {
      deleted.add(id);
    }
  }

  return { kept, deleted };
};

export const trackWrites = <T extends { id: string }>(
  log: LocalWriteLog,
  value: Updater<T[]>,
): Updater<T[]> => {
  return (previous) => {
    const next = resolveUpdater(value, previous);
    log.record(changedRowIds(previous, next));

    return next;
  };
};

const resolveUpdater = <T>(value: Updater<T>, previous: T): T => {
  if (value instanceof Function) {
    return value(previous);
  } else {
    return value;
  }
};
