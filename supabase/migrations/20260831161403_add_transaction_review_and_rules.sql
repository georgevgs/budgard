-- A transaction keeps the wording imported from the statement in description,
-- while merchant_name is the clean display identity rules can normalize. Bank
-- and statement imports enter a small review queue; manual entries default to
-- reviewed because the person already confirmed the form before saving.

CREATE TABLE public.transaction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL CHECK (match_type IN ('exact', 'contains')),
  match_value TEXT NOT NULL CHECK (char_length(match_value) BETWEEN 1 AND 200),
  transaction_type TEXT NOT NULL DEFAULT 'any'
    CHECK (transaction_type IN ('any', 'expense', 'income')),
  rename_to TEXT CHECK (
    rename_to IS NULL OR char_length(rename_to) BETWEEN 1 AND 100
  ),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE SET NULL,
  priority SMALLINT NOT NULL DEFAULT 100 CHECK (priority BETWEEN 0 AND 1000),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT transaction_rules_has_action CHECK (
    rename_to IS NOT NULL OR category_id IS NOT NULL OR tag_id IS NOT NULL
  ),
  CONSTRAINT transaction_rules_unique_match UNIQUE (
    user_id,
    match_type,
    match_value,
    transaction_type
  )
);

CREATE INDEX transaction_rules_user_active_priority_idx
  ON public.transaction_rules (user_id, priority, created_at)
  WHERE is_active = true;
CREATE INDEX transaction_rules_category_id_idx
  ON public.transaction_rules (category_id)
  WHERE category_id IS NOT NULL;
CREATE INDEX transaction_rules_tag_id_idx
  ON public.transaction_rules (tag_id)
  WHERE tag_id IS NOT NULL;

ALTER TABLE public.transaction_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household can manage transaction rules"
  ON public.transaction_rules
  FOR ALL
  TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK (
    (SELECT private.can_access_financial_space(user_id))
    AND (category_id IS NULL OR EXISTS (
      SELECT 1
      FROM public.categories AS category
      WHERE category.id = category_id
        AND category.user_id = transaction_rules.user_id
    ))
    AND (tag_id IS NULL OR EXISTS (
      SELECT 1
      FROM public.tags AS tag
      WHERE tag.id = tag_id
        AND tag.user_id = transaction_rules.user_id
    ))
  );

REVOKE ALL ON TABLE public.transaction_rules
  FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transaction_rules
  TO authenticated, service_role;

ALTER TABLE public.expenses
  ADD COLUMN merchant_name TEXT,
  ADD COLUMN review_status TEXT NOT NULL DEFAULT 'reviewed'
    CHECK (review_status IN ('pending', 'reviewed')),
  ADD COLUMN review_reason TEXT
    CHECK (review_reason IS NULL OR review_reason IN ('import', 'connection')),
  ADD COLUMN reviewed_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN applied_rule_id UUID
    REFERENCES public.transaction_rules(id) ON DELETE SET NULL;

UPDATE public.expenses
SET merchant_name = left(trim(regexp_replace(description, '\s+', ' ', 'g')), 100)
WHERE merchant_name IS NULL;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_merchant_name_length CHECK (
    merchant_name IS NULL OR char_length(merchant_name) BETWEEN 1 AND 100
  ),
  ADD CONSTRAINT expenses_review_shape CHECK (
    (review_status = 'reviewed' AND reviewed_at IS NOT NULL)
    OR (review_status = 'pending' AND reviewed_at IS NULL)
  );

CREATE INDEX expenses_user_review_date_idx
  ON public.expenses (user_id, review_status, date DESC, created_at DESC);
CREATE INDEX expenses_user_merchant_idx
  ON public.expenses (user_id, lower(merchant_name))
  WHERE merchant_name IS NOT NULL;
CREATE INDEX expenses_applied_rule_id_idx
  ON public.expenses (applied_rule_id)
  WHERE applied_rule_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.apply_transaction_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  matched_rule public.transaction_rules;
  normalized_target TEXT;
BEGIN
  NEW.merchant_name := left(
    trim(regexp_replace(COALESCE(NULLIF(NEW.merchant_name, ''), NEW.description), '\s+', ' ', 'g')),
    100
  );

  -- The explicit apply-to-existing function supplies a validated rule and its
  -- actions in the same UPDATE. Do not replace it with a different higher-
  -- priority match while that update is in flight.
  IF TG_OP = 'UPDATE'
     AND NEW.applied_rule_id IS DISTINCT FROM OLD.applied_rule_id
     AND NEW.applied_rule_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  normalized_target := lower(NEW.merchant_name);

  SELECT rule.*
  INTO matched_rule
  FROM public.transaction_rules AS rule
  WHERE rule.user_id = NEW.user_id
    AND rule.is_active = true
    AND (rule.transaction_type = 'any' OR rule.transaction_type = NEW.type)
    AND (
      (rule.match_type = 'exact' AND normalized_target = rule.match_value)
      OR (
        rule.match_type = 'contains'
        AND position(rule.match_value IN normalized_target) > 0
      )
    )
  ORDER BY rule.priority, rule.created_at, rule.id
  LIMIT 1;

  IF matched_rule.id IS NULL THEN
    NEW.applied_rule_id := NULL;

    RETURN NEW;
  END IF;

  IF matched_rule.rename_to IS NOT NULL THEN
    NEW.merchant_name := matched_rule.rename_to;
  END IF;
  IF matched_rule.category_id IS NOT NULL THEN
    NEW.category_id := matched_rule.category_id;
  END IF;
  IF matched_rule.tag_id IS NOT NULL THEN
    NEW.tag_id := matched_rule.tag_id;
  END IF;
  NEW.applied_rule_id := matched_rule.id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_expense_rule_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.applied_rule_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.transaction_rules AS rule
       WHERE rule.id = NEW.applied_rule_id
         AND rule.user_id = NEW.user_id
     ) THEN
    RAISE EXCEPTION 'Transaction rule belongs to another financial space'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.apply_transaction_rules()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.validate_expense_rule_owner()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER expenses_apply_transaction_rules
  BEFORE INSERT OR UPDATE OF description, merchant_name ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION private.apply_transaction_rules();

CREATE TRIGGER expenses_validate_rule_owner
  BEFORE INSERT OR UPDATE OF applied_rule_id, user_id ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_expense_rule_owner();

CREATE OR REPLACE FUNCTION public.apply_transaction_rule_to_existing(
  p_rule_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  selected_rule public.transaction_rules;
  changed_count INTEGER;
BEGIN
  SELECT rule.*
  INTO selected_rule
  FROM public.transaction_rules AS rule
  WHERE rule.id = p_rule_id
    AND private.can_access_financial_space(rule.user_id);

  IF selected_rule.id IS NULL THEN
    RAISE EXCEPTION 'Transaction rule not found' USING ERRCODE = '42501';
  END IF;

  UPDATE public.expenses AS expense
  SET merchant_name = COALESCE(selected_rule.rename_to, expense.merchant_name),
      category_id = COALESCE(selected_rule.category_id, expense.category_id),
      tag_id = COALESCE(selected_rule.tag_id, expense.tag_id),
      applied_rule_id = selected_rule.id
  WHERE expense.user_id = selected_rule.user_id
    AND (
      selected_rule.transaction_type = 'any'
      OR selected_rule.transaction_type = expense.type
    )
    AND (
      (
        selected_rule.match_type = 'exact'
        AND lower(COALESCE(expense.merchant_name, expense.description))
          = selected_rule.match_value
      )
      OR (
        selected_rule.match_type = 'contains'
        AND position(
          selected_rule.match_value
          IN lower(COALESCE(expense.merchant_name, expense.description))
        ) > 0
      )
    );
  GET DIAGNOSTICS changed_count = ROW_COUNT;

  RETURN changed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_transaction_rule_to_existing(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_transaction_rule_to_existing(UUID)
  TO authenticated, service_role;

COMMENT ON TABLE public.transaction_rules IS
  'Reusable merchant/category/tag cleanup rules scoped to a financial space.';
COMMENT ON COLUMN public.expenses.review_status IS
  'Imports and bank-connected rows wait for human confirmation; manual rows are already reviewed.';
