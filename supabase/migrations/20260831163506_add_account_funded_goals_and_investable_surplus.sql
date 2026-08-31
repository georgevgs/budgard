-- Account-funded goals follow money that exists, rather than treating an
-- unspent category allowance as a balance. Surplus can be explicitly invested
-- into a linked investment account in one atomic operation.

ALTER TABLE public.goals DROP CONSTRAINT goals_source_type_check;
ALTER TABLE public.goals
  ADD CONSTRAINT goals_source_type_check CHECK (
    source_type IN ('category', 'tag', 'net_delta', 'account')
  ),
  ADD COLUMN linked_account_id UUID
    REFERENCES public.accounts(id) ON DELETE SET NULL;

ALTER TABLE public.goals
  ADD CONSTRAINT goals_account_source_shape CHECK (
    (source_type = 'account' AND linked_account_id IS NOT NULL)
    OR (source_type <> 'account' AND linked_account_id IS NULL)
  );

CREATE INDEX goals_linked_account_id_idx
  ON public.goals (linked_account_id)
  WHERE linked_account_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.validate_goal_account_space()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.linked_account_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.accounts AS account
       WHERE account.id = NEW.linked_account_id
         AND account.user_id = NEW.user_id
     ) THEN
    RAISE EXCEPTION 'Linked account belongs to another financial space'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_goal_account_space()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER goals_validate_linked_account_space
  BEFORE INSERT OR UPDATE OF linked_account_id, user_id ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_goal_account_space();

ALTER TABLE public.expenses
  ADD COLUMN goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;
CREATE INDEX expenses_goal_id_idx
  ON public.expenses (goal_id)
  WHERE goal_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.validate_goal_space_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.goal_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.goals AS goal
       WHERE goal.id = NEW.goal_id
         AND goal.user_id = NEW.user_id
     ) THEN
    RAISE EXCEPTION 'Goal belongs to another financial space'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_goal_space_reference()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER expenses_validate_goal_space
  BEFORE INSERT OR UPDATE OF goal_id, user_id ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_goal_space_reference();

CREATE OR REPLACE FUNCTION public.invest_goal_surplus(
  p_goal_id UUID,
  p_amount NUMERIC,
  p_invested_on DATE DEFAULT CURRENT_DATE,
  p_description TEXT DEFAULT 'Invested surplus'
)
RETURNS public.expenses
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  selected_goal public.goals;
  selected_account public.accounts;
  activity_row public.expenses;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_amount <= 0 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'Investment amount is out of range'
      USING ERRCODE = '22003';
  END IF;
  IF p_invested_on > CURRENT_DATE + 1 THEN
    RAISE EXCEPTION 'Investment date cannot be in the future'
      USING ERRCODE = '22007';
  END IF;
  IF p_description IS NULL
     OR char_length(BTRIM(p_description)) NOT BETWEEN 1 AND 100
     OR p_description ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Investment description is invalid'
      USING ERRCODE = '22023';
  END IF;

  SELECT goal.*
  INTO selected_goal
  FROM public.goals AS goal
  WHERE goal.id = p_goal_id
    AND goal.source_type = 'account'
    AND private.can_access_financial_space(goal.user_id);

  IF selected_goal.id IS NULL THEN
    RAISE EXCEPTION 'Account-funded goal not found' USING ERRCODE = '42501';
  END IF;

  SELECT account.*
  INTO selected_account
  FROM public.accounts AS account
  WHERE account.id = selected_goal.linked_account_id
    AND account.user_id = selected_goal.user_id
    AND account.kind = 'investment'
    AND account.is_archived = false
  FOR UPDATE;

  IF selected_account.id IS NULL THEN
    RAISE EXCEPTION 'Link an active investment account first'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM public.upsert_account_balance(
    selected_account.id,
    selected_account.current_balance + p_amount,
    p_amount,
    p_invested_on,
    BTRIM(p_description),
    NULL,
    NULL,
    NULL
  );

  INSERT INTO public.expenses (
    user_id,
    amount,
    description,
    date,
    type,
    is_excluded,
    goal_id,
    review_status,
    reviewed_at
  )
  VALUES (
    selected_goal.user_id,
    p_amount,
    BTRIM(p_description),
    p_invested_on,
    'expense',
    true,
    selected_goal.id,
    'reviewed',
    now()
  )
  RETURNING * INTO activity_row;

  RETURN activity_row;
END;
$$;

REVOKE ALL ON FUNCTION public.invest_goal_surplus(UUID, NUMERIC, DATE, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invest_goal_surplus(UUID, NUMERIC, DATE, TEXT)
  TO authenticated, service_role;

COMMENT ON COLUMN public.goals.linked_account_id IS
  'Account balance used as real progress when source_type is account.';
COMMENT ON FUNCTION public.invest_goal_surplus(UUID, NUMERIC, DATE, TEXT) IS
  'Atomically logs an investment contribution and its excluded activity row.';
