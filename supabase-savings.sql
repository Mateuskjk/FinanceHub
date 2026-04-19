-- ─────────────────────────────────────────────────────────────────────────────
-- Savings transactions table
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.savings_transactions (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  type        TEXT         NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  description TEXT,
  date        DATE         NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS savings_user_date_idx
  ON public.savings_transactions (user_id, date DESC);

ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "savings_select" ON public.savings_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "savings_insert" ON public.savings_transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "savings_delete" ON public.savings_transactions
  FOR DELETE USING (user_id = auth.uid());
