-- Exact statement duplicates can safely replace a generated recurring row;
-- looser patterns stay client-side suggestions and require confirmation.

ALTER TABLE public.recurring_expenses
  ADD COLUMN detection_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (detection_source IN ('manual', 'suggested')),
  ADD COLUMN merchant_pattern TEXT CHECK (
    merchant_pattern IS NULL
    OR char_length(merchant_pattern) BETWEEN 1 AND 100
  );

CREATE TABLE public.recurring_suggestion_dismissals (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL CHECK (char_length(fingerprint) BETWEEN 1 AND 240),
  dismissed_by UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, fingerprint)
);

CREATE INDEX recurring_suggestion_dismissals_actor_idx
  ON public.recurring_suggestion_dismissals (dismissed_by);

ALTER TABLE public.recurring_suggestion_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household can manage recurring suggestion dismissals"
  ON public.recurring_suggestion_dismissals
  FOR ALL
  TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK (
    (SELECT private.can_access_financial_space(user_id))
    AND dismissed_by = (SELECT auth.uid())
  );

REVOKE ALL ON TABLE public.recurring_suggestion_dismissals
  FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.recurring_suggestion_dismissals
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reconcile_recurring_imports(p_owner_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  candidate RECORD;
  deleted_count INTEGER;
  reconciled_count INTEGER := 0;
BEGIN
  IF auth.role() <> 'service_role'
     AND (
       auth.uid() IS NULL
       OR NOT private.can_access_financial_space(p_owner_id)
     ) THEN
    RAISE EXCEPTION 'Not authorized for this financial space'
      USING ERRCODE = '42501';
  END IF;

  FOR candidate IN
    SELECT DISTINCT ON (imported.id)
      imported.id AS imported_id,
      generated.id AS generated_id,
      generated.recurring_expense_id AS recurring_id
    FROM public.expenses AS imported
    JOIN public.expenses AS generated
      ON generated.user_id = imported.user_id
      AND generated.type = imported.type
      AND generated.recurring_expense_id IS NOT NULL
      AND generated.id <> imported.id
      AND abs(generated.amount - imported.amount) < 0.01
      AND lower(COALESCE(generated.merchant_name, generated.description))
        = lower(COALESCE(imported.merchant_name, imported.description))
      AND abs(generated.date - imported.date) <= 3
    WHERE imported.user_id = p_owner_id
      AND imported.review_status = 'pending'
      AND imported.review_reason IN ('import', 'connection')
      AND imported.recurring_expense_id IS NULL
    ORDER BY
      imported.id,
      abs(generated.date - imported.date),
      generated.created_at
  LOOP
    DELETE FROM public.expenses
    WHERE id = candidate.generated_id
      AND user_id = p_owner_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    IF deleted_count = 0 THEN
      CONTINUE;
    END IF;

    UPDATE public.expenses
    SET recurring_expense_id = candidate.recurring_id
    WHERE id = candidate.imported_id
      AND user_id = p_owner_id;
    reconciled_count := reconciled_count + 1;
  END LOOP;

  RETURN reconciled_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_recurring_imports(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_recurring_imports(UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.reconcile_recurring_imports(UUID) IS
  'Replaces only exact-amount, exact-merchant generated rows within a three-day statement window.';
