import { buildKeysetFilter } from '@/config/keysetPagination';
import type { AccountBalance } from '@/types/AccountBalance';
import type { Expense } from '@/types/Expense';
import type { EmbeddedTag } from '@/types/Tag';

// Embeds select only the columns the UI renders (see EmbeddedCategory /
// EmbeddedTag): a full categories(*)/tags(*) embed roughly doubles every
// transaction row, which inflates history fetches and the localStorage
// snapshot for no benefit.
export const CATEGORY_EMBED = 'category:categories(id, name, color, icon, type, kind)';
// Every tag embed names its FK explicitly. The bare `tags` embed name turned
// ambiguous for expenses when expense_tags landed (two relationships →
// PGRST201, HTTP 300) and broke months-stale PWA bundles that still sent it;
// 20260731165831_restore_legacy_tags_embed.sql shims those legacy clients
// with a computed relationship. Naming the FK keeps today's bundles immune
// if a second relationship path to tags ever appears on these tables.
export const EXPENSE_TAG_EMBED = 'tag:tags!expenses_tag_id_fkey(id, name, color)';
export const TEMPLATE_TAG_EMBED =
  'tag:tags!expense_templates_tag_id_fkey(id, name, color)';
export const EXTRA_TAGS_EMBED = 'extra_tags:expense_tags(tag:tags(id, name, color))';
export const SELECT_WITH_CATEGORY_AND_TAG = `*, ${CATEGORY_EMBED}, ${EXPENSE_TAG_EMBED}, ${EXTRA_TAGS_EMBED}`;
export const SELECT_WITH_CATEGORY = `*, ${CATEGORY_EMBED}`;
// Templates embed category+tag but NOT extra_tags — expense_tags references
// expenses, so that embed only resolves on the expenses table.
export const SELECT_TEMPLATE = `*, ${CATEGORY_EMBED}, ${TEMPLATE_TAG_EMBED}`;

// Write payload for expenses: the row columns plus the Pro-only additional
// tag ids, which land in expense_tags rather than on the row itself. The
// offline queue replays these payloads verbatim, so extras survive offline.
export type ExpenseWritePayload = Partial<Expense> & {
  extra_tag_ids?: string[];
};

// PostgREST silently caps every request at 1000 rows, so any fetch that can
// grow past that (transaction history, balance snapshots, debt payments) must
// page until a short page arrives — otherwise older rows just vanish.
export const SUPABASE_PAGE_SIZE = 1000;

export const transactionCursorFilter = (cursor: Expense): string => {
  return buildKeysetFilter(
    [
      { name: 'date', value: cursor.date },
      { name: 'created_at', value: cursor.created_at },
      { name: 'id', value: cursor.id },
    ],
    'descending',
  );
};

export const accountBalanceCursorFilter = (
  cursor: AccountBalance,
  direction: 'ascending' | 'descending',
): string => {
  const columns = [
    { name: 'recorded_at', value: cursor.recorded_at },
    { name: 'id', value: cursor.id },
  ];
  if (direction === 'descending') {
    columns.splice(1, 0, { name: 'created_at', value: cursor.created_at });
  }

  return buildKeysetFilter(columns, direction);
};

// PostgREST returns the expense_tags embed as [{ tag: {...} }]; the app wants
// a plain EmbeddedTag[]. Rows from sources without the embed (incomes, cached
// snapshots) pass through with an empty array.
export type RawExtraTag = { tag: EmbeddedTag | null };

export const flattenExtraTags = (row: Expense): Expense => {
  const raw = (row.extra_tags ?? []) as unknown as RawExtraTag[];

  return {
    ...row,
    extra_tags: raw
      .map((entry) => entry.tag)
      .filter((tag): tag is EmbeddedTag => tag !== null && tag !== undefined),
  };
};

export const buildBulkExpense = <T extends Record<string, unknown>>(
  expense: T,
  ownerId: string,
  reviewReason: 'import' | 'connection' | undefined,
): T & Record<string, unknown> => {
  if (!reviewReason) {
    return { ...expense, user_id: ownerId };
  }

  return {
    ...expense,
    user_id: ownerId,
    review_status: 'pending',
    review_reason: reviewReason,
    reviewed_at: null,
  };
};

export type PageResult = {
  data: unknown;
  error: { message: string } | null;
};

export const fetchAllPages = async <T>(
  buildPage: (cursor: T | null) => PromiseLike<PageResult>,
): Promise<T[]> => {
  const rows: T[] = [];
  let cursor: T | null = null;

  // Each page starts after the last fully ordered row from the previous page.
  // Unlike OFFSET, the cost stays flat for deep histories and concurrent
  // inserts cannot shift rows across a page boundary.
  for (;;) {
    const { data, error } = await buildPage(cursor);
    if (error) throw error;

    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
    cursor = page[page.length - 1];
  }

  return rows;
};

