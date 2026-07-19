export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

export type Subscription = {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  stripe_price_id: string;
  status: SubscriptionStatus;
  cancel_at_period_end: boolean;
  trial_ends_at: string | null;
  renews_at: string | null;
  ends_at: string | null;
  livemode: boolean;
  created_at: string;
  updated_at: string;
}
