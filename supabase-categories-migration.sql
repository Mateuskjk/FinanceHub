-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Shared default categories
-- Run once in the Supabase SQL Editor.
-- Effect: default categories become global (user_id = NULL) so every user
-- sees the same defaults, while still being able to add their own.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Allow user_id to be NULL (global/system rows)
ALTER TABLE public.categories
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Remove all per-user default categories (they will be replaced by global ones)
DELETE FROM public.categories WHERE is_default = true;

-- 3. Insert global default categories (user_id = NULL)
INSERT INTO public.categories (id, user_id, name, type, icon, color, is_default, sort_order) VALUES
  (gen_random_uuid(), NULL, 'Salário',        'income',  'money-bag',    '#22c55e', true,  1),
  (gen_random_uuid(), NULL, 'Freelance',      'income',  'laptop',       '#10b981', true,  2),
  (gen_random_uuid(), NULL, 'Investimentos',  'income',  'chart-up',     '#6366f1', true,  3),
  (gen_random_uuid(), NULL, 'Outros',         'income',  'pin',          '#14b8a6', true,  4),
  (gen_random_uuid(), NULL, 'Alimentação',    'expense', 'burger',       '#f97316', true,  5),
  (gen_random_uuid(), NULL, 'Transporte',     'expense', 'car',          '#3b82f6', true,  6),
  (gen_random_uuid(), NULL, 'Saúde',          'expense', 'pill',         '#ef4444', true,  7),
  (gen_random_uuid(), NULL, 'Educação',       'expense', 'books',        '#8b5cf6', true,  8),
  (gen_random_uuid(), NULL, 'Entretenimento', 'expense', 'game',         '#f59e0b', true,  9),
  (gen_random_uuid(), NULL, 'Casa',           'expense', 'house',        '#64748b', true, 10),
  (gen_random_uuid(), NULL, 'Compras',        'expense', 'shopping-bag', '#ec4899', true, 11),
  (gen_random_uuid(), NULL, 'Poupança',       'expense', 'piggy-bank',   '#0ea5e9', true, 12),
  (gen_random_uuid(), NULL, 'Academia',       'expense', 'dumbbell',     '#84cc16', true, 13);

-- 4. Update RLS SELECT policy — users see their own rows + global rows (user_id IS NULL)
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- 5. Tighten UPDATE / DELETE so users can only touch their own rows (not globals)
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (user_id = auth.uid() AND user_id IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (user_id = auth.uid() AND user_id IS NOT NULL);

-- 6. Update trigger: new users no longer get seeded with per-user defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  -- Default categories are now global (user_id = NULL); no seeding needed.
  RETURN NEW;
END;
$$;
