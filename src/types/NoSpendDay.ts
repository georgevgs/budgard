// A day the user explicitly confirmed they spent nothing on. See the
// no_spend_days migration for why this cannot be inferred from empty data.
export type NoSpendDay = {
  user_id: string;
  day: string;
  created_at: string;
};
