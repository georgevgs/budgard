-- Provider-neutral bank-data boundary. Provider credentials and raw payloads
-- never enter public tables: an Edge Function/provider adapter owns those
-- secrets and calls the service-role-only ingestion RPC with normalized rows.

CREATE TABLE public.financial_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (
    provider ~ '^[a-z][a-z0-9_-]{1,39}$'
  ),
  provider_connection_id TEXT NOT NULL CHECK (
    char_length(provider_connection_id) BETWEEN 1 AND 200
  ),
  institution_name TEXT NOT NULL CHECK (
    char_length(institution_name) BETWEEN 1 AND 100
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'active',
      'reauth_required',
      'error',
      'disconnected'
    )
  ),
  last_synced_at TIMESTAMPTZ,
  last_error_code TEXT CHECK (
    last_error_code IS NULL
    OR char_length(last_error_code) <= 80
  ),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_connection_id)
);

CREATE INDEX financial_connections_user_id_idx
  ON public.financial_connections (user_id, status);

ALTER TABLE public.financial_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY financial_connections_household_select
  ON public.financial_connections
  FOR SELECT TO authenticated
  USING (private.can_access_financial_space(user_id));

REVOKE ALL ON public.financial_connections
  FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  user_id,
  provider,
  institution_name,
  status,
  last_synced_at,
  last_error_code,
  created_at,
  updated_at
) ON public.financial_connections TO authenticated;
GRANT ALL ON public.financial_connections TO service_role;

CREATE TABLE public.financial_connection_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL
    REFERENCES public.financial_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_account_id TEXT NOT NULL CHECK (
    char_length(provider_account_id) BETWEEN 1 AND 200
  ),
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL CHECK (
    char_length(display_name) BETWEEN 1 AND 100
  ),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  last_four TEXT CHECK (last_four IS NULL OR last_four ~ '^[0-9]{2,4}$'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, provider_account_id)
);

CREATE INDEX financial_connection_accounts_user_id_idx
  ON public.financial_connection_accounts (user_id, is_active);
CREATE INDEX financial_connection_accounts_account_id_idx
  ON public.financial_connection_accounts (account_id)
  WHERE account_id IS NOT NULL;

ALTER TABLE public.financial_connection_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY financial_connection_accounts_household_select
  ON public.financial_connection_accounts
  FOR SELECT TO authenticated
  USING (private.can_access_financial_space(user_id));

REVOKE ALL ON public.financial_connection_accounts
  FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  connection_id,
  user_id,
  account_id,
  display_name,
  currency,
  last_four,
  is_active,
  created_at,
  updated_at
) ON public.financial_connection_accounts TO authenticated;
GRANT ALL ON public.financial_connection_accounts TO service_role;

CREATE OR REPLACE FUNCTION private.validate_connection_account_space()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  connection_owner UUID;
BEGIN
  SELECT connection.user_id
  INTO connection_owner
  FROM public.financial_connections AS connection
  WHERE connection.id = NEW.connection_id;

  IF connection_owner IS NULL OR connection_owner <> NEW.user_id THEN
    RAISE EXCEPTION 'Connection belongs to another financial space'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.account_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.accounts AS account
       WHERE account.id = NEW.account_id
         AND account.user_id = NEW.user_id
     ) THEN
    RAISE EXCEPTION 'Account belongs to another financial space'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_connection_account_space()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER financial_connection_accounts_validate_space
  BEFORE INSERT OR UPDATE OF connection_id, user_id, account_id
  ON public.financial_connection_accounts
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_connection_account_space();

ALTER TABLE public.expenses
  ADD COLUMN financial_connection_id UUID
    REFERENCES public.financial_connections(id) ON DELETE SET NULL,
  ADD COLUMN external_transaction_id TEXT CHECK (
    external_transaction_id IS NULL
    OR char_length(external_transaction_id) BETWEEN 1 AND 200
  );

CREATE UNIQUE INDEX expenses_external_transaction_unique_idx
  ON public.expenses (financial_connection_id, external_transaction_id)
  WHERE financial_connection_id IS NOT NULL
    AND external_transaction_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.validate_expense_connection_space()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.financial_connection_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.financial_connections AS connection
       WHERE connection.id = NEW.financial_connection_id
         AND connection.user_id = NEW.user_id
     ) THEN
    RAISE EXCEPTION 'Connection belongs to another financial space'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_expense_connection_space()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER expenses_validate_connection_space
  BEFORE INSERT OR UPDATE OF financial_connection_id, user_id
  ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_expense_connection_space();

CREATE OR REPLACE FUNCTION private.protect_expense_connection_origin()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF TG_OP = 'INSERT'
       AND (
         NEW.financial_connection_id IS NOT NULL
         OR NEW.external_transaction_id IS NOT NULL
       ) THEN
      RAISE EXCEPTION 'Connected transaction origin is server-managed'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE'
       AND (
         NEW.financial_connection_id IS DISTINCT FROM
           OLD.financial_connection_id
         OR NEW.external_transaction_id IS DISTINCT FROM
           OLD.external_transaction_id
       ) THEN
      RAISE EXCEPTION 'Connected transaction origin is server-managed'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_expense_connection_origin()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER expenses_protect_connection_origin
  BEFORE INSERT OR UPDATE OF financial_connection_id, external_transaction_id
  ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_expense_connection_origin();

-- Normalized provider rows use the owner's default currency. Provider adapters
-- must convert before calling this RPC and retain raw payloads only in their
-- private, short-lived processing boundary.
CREATE OR REPLACE FUNCTION public.ingest_connected_transactions(
  p_connection_id UUID,
  p_rows JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  selected_connection public.financial_connections;
  source_row JSONB;
  external_id TEXT;
  transaction_type TEXT;
  transaction_date DATE;
  transaction_amount NUMERIC;
  transaction_description TEXT;
  transaction_merchant TEXT;
  inserted_count INTEGER := 0;
  row_count INTEGER;
BEGIN
  SELECT connection.*
  INTO selected_connection
  FROM public.financial_connections AS connection
  WHERE connection.id = p_connection_id
    AND connection.status <> 'disconnected'
  FOR UPDATE;

  IF selected_connection.id IS NULL THEN
    RAISE EXCEPTION 'Financial connection not found'
      USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_rows) <> 'array'
     OR jsonb_array_length(p_rows) > 1000 THEN
    RAISE EXCEPTION 'Transactions must be an array of at most 1000 rows'
      USING ERRCODE = '22023';
  END IF;

  FOR source_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    external_id := NULLIF(BTRIM(source_row ->> 'external_id'), '');
    transaction_type := source_row ->> 'type';
    transaction_description := NULLIF(
      BTRIM(source_row ->> 'description'),
      ''
    );
    transaction_merchant := NULLIF(
      BTRIM(source_row ->> 'merchant_name'),
      ''
    );

    IF external_id IS NULL OR char_length(external_id) > 200 THEN
      RAISE EXCEPTION 'External transaction id is invalid'
        USING ERRCODE = '22023';
    END IF;
    IF transaction_type NOT IN ('expense', 'income') THEN
      RAISE EXCEPTION 'Transaction type is invalid'
        USING ERRCODE = '22023';
    END IF;
    IF transaction_description IS NULL
       OR char_length(transaction_description) > 100
       OR transaction_description ~ '[[:cntrl:]]' THEN
      RAISE EXCEPTION 'Transaction description is invalid'
        USING ERRCODE = '22023';
    END IF;
    IF transaction_merchant IS NOT NULL
       AND (
         char_length(transaction_merchant) > 100
         OR transaction_merchant ~ '[[:cntrl:]]'
       ) THEN
      RAISE EXCEPTION 'Transaction merchant is invalid'
        USING ERRCODE = '22023';
    END IF;

    BEGIN
      transaction_date := (source_row ->> 'date')::DATE;
      transaction_amount := (source_row ->> 'amount')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Transaction amount or date is invalid'
        USING ERRCODE = '22023';
    END;

    IF transaction_amount <= 0 OR transaction_amount > 1000000 THEN
      RAISE EXCEPTION 'Transaction amount is out of range'
        USING ERRCODE = '22003';
    END IF;
    IF transaction_date > CURRENT_DATE + 1
       OR transaction_date < DATE '2000-01-01' THEN
      RAISE EXCEPTION 'Transaction date is out of range'
        USING ERRCODE = '22007';
    END IF;

    INSERT INTO public.expenses (
      user_id,
      amount,
      description,
      merchant_name,
      date,
      type,
      review_status,
      review_reason,
      reviewed_at,
      financial_connection_id,
      external_transaction_id
    )
    VALUES (
      selected_connection.user_id,
      transaction_amount,
      transaction_description,
      transaction_merchant,
      transaction_date,
      transaction_type,
      'pending',
      'connection',
      NULL,
      selected_connection.id,
      external_id
    )
    ON CONFLICT (
      financial_connection_id,
      external_transaction_id
    ) WHERE financial_connection_id IS NOT NULL
      AND external_transaction_id IS NOT NULL
    DO NOTHING;

    GET DIAGNOSTICS row_count = ROW_COUNT;
    inserted_count := inserted_count + row_count;
  END LOOP;

  UPDATE public.financial_connections
  SET status = 'active',
      last_synced_at = now(),
      last_error_code = NULL,
      updated_at = now()
  WHERE id = selected_connection.id;

  PERFORM public.reconcile_recurring_imports(selected_connection.user_id);

  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_connected_transactions(UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_connected_transactions(UUID, JSONB)
  TO service_role;

COMMENT ON TABLE public.financial_connections IS
  'Non-secret metadata for server-owned bank-data provider connections.';
COMMENT ON FUNCTION public.ingest_connected_transactions(UUID, JSONB) IS
  'Service-role-only normalized intake; deduplicates, applies rules, queues review, and reconciles recurring rows.';
