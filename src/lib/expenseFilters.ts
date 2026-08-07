// Sentinel for the "no category assigned" option in a category filter. A
// literal is needed because a Select can't carry null as an item value, and it
// must never collide with a real category id — category ids are UUIDs.
export const UNCATEGORIZED_VALUE = 'uncategorized';
