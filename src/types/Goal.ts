// 'category'  → progress = Σ expenses in category_id since start_date
// 'tag'       → progress = Σ expenses with tag_id since start_date
// 'net_delta' → progress = Σ income − Σ expenses since start_date
export type GoalSourceType = 'category' | 'tag' | 'net_delta';

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  currency: string;
  deadline?: string | null;
  start_date: string;
  source_type: GoalSourceType;
  category_id?: string | null;
  tag_id?: string | null;
  icon: string;
  color: string;
  is_completed: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}
