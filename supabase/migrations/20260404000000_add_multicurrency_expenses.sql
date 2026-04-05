-- Add multi-currency support to expenses
-- original_amount: the amount in the original (foreign) currency
-- original_currency: ISO 4217 currency code (e.g. 'USD', 'GBP')
-- exchange_rate: the EUR rate used at the time of entry (original_amount * exchange_rate = amount)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS original_amount NUMERIC;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS original_currency TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC;
