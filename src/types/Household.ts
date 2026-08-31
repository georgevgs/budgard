export type HouseholdShareStatus = 'pending' | 'accepted' | 'revoked';

export type HouseholdShare = {
  id: string;
  owner_id: string;
  member_id: string | null;
  owner_email: string;
  invite_email: string;
  invite_token: string;
  status: HouseholdShareStatus;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancialSpace = {
  ownerId: string;
  label: string;
  isShared: boolean;
};
