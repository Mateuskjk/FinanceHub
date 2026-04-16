-- ============================================================
--  MY MONEY HUB — Supabase Database Schema
--  Safe to run multiple times (fully idempotent).
--  Steps: cleanup -> tables -> indexes -> functions -> RLS -> views
-- ============================================================


-- ============================================================
-- 0. CLEANUP — drop everything so the script is re-runnable
--    (safe: all DROP use IF EXISTS / CASCADE)
-- ============================================================

drop trigger  if exists trg_auth_user_created        on auth.users;
drop trigger  if exists trg_profiles_updated_at      on public.profiles;
drop trigger  if exists trg_transactions_updated_at  on public.transactions;
drop trigger  if exists trg_budgets_updated_at       on public.budgets;

drop function if exists public.handle_new_user()              cascade;
drop function if exists public.seed_default_categories(uuid)  cascade;
drop function if exists public.handle_updated_at()            cascade;

drop view if exists public.v_category_spending_this_month;
drop view if exists public.v_monthly_summary;

drop table if exists public.budgets      cascade;
drop table if exists public.transactions cascade;
drop table if exists public.categories   cascade;
drop table if exists public.profiles     cascade;


-- ============================================================
-- 1. EXTENSION
-- ============================================================

create extension if not exists "uuid-ossp";


-- ============================================================
-- 2. TABLES
-- ============================================================

-- profiles ──────────────────────────────────────────────────
create table public.profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  full_name       text,
  avatar_url      text,
  currency        text        not null default 'BRL',
  monthly_limit   numeric(12, 2),
  theme           text        not null default 'dark'
                              check (theme in ('light', 'dark', 'system')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is
  'App-level user data extending Supabase auth.users.';


-- categories ────────────────────────────────────────────────
create table public.categories (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  name        text        not null,
  type        text        not null check (type in ('income', 'expense')),
  icon        text,
  color       text,
  is_default  boolean     not null default false,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, name, type)
);

comment on table public.categories is
  'Transaction categories owned by each user.';


-- transactions ──────────────────────────────────────────────
create table public.transactions (
  id              uuid           primary key default uuid_generate_v4(),
  user_id         uuid           not null references public.profiles(id) on delete cascade,
  type            text           not null check (type in ('income', 'expense')),
  amount          numeric(12, 2) not null check (amount > 0),
  category_id     uuid           references public.categories(id) on delete set null,
  category_name   text           not null,
  description     text,
  notes           text,
  date            date           not null,
  is_recurring    boolean        not null default false,
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now()
);

comment on table public.transactions is
  'Financial transactions (income and expenses) per user.';


-- budgets ───────────────────────────────────────────────────
create table public.budgets (
  id          uuid           primary key default uuid_generate_v4(),
  user_id     uuid           not null references public.profiles(id) on delete cascade,
  category_id uuid           not null references public.categories(id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  month       integer        not null check (month between 1 and 12),
  year        integer        not null check (year >= 2020),
  created_at  timestamptz    not null default now(),
  updated_at  timestamptz    not null default now(),
  unique (user_id, category_id, month, year)
);

comment on table public.budgets is
  'Monthly budget limits per category and user.';


-- ============================================================
-- 3. INDEXES
-- ============================================================

create index idx_transactions_user_date
  on public.transactions (user_id, date desc);

create index idx_transactions_user_type
  on public.transactions (user_id, type);

create index idx_transactions_category
  on public.transactions (category_id);

create index idx_categories_user_type
  on public.categories (user_id, type);

create index idx_budgets_user_period
  on public.budgets (user_id, year, month);


-- ============================================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================================

-- updated_at auto-stamp ──────────────────────────────────────
create function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.handle_updated_at();

create trigger trg_budgets_updated_at
  before update on public.budgets
  for each row execute function public.handle_updated_at();


-- Seed default categories ────────────────────────────────────
-- icon stores a text key; the front-end maps it to an emoji.
-- Emoji literals are avoided to prevent encoding issues.
create function public.seed_default_categories(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.categories
    (user_id, name, type, icon, color, is_default, sort_order)
  values
    (p_user_id, 'Salario',       'income',  'money-bag',    '#18b470', true, 1),
    (p_user_id, 'Freelance',     'income',  'laptop',       '#26cc80', true, 2),
    (p_user_id, 'Investimentos', 'income',  'chart-up',     '#c9a422', true, 3),
    (p_user_id, 'Outros',        'income',  'pin',          '#7c58e8', true, 4),
    (p_user_id, 'Alimentacao',   'expense', 'burger',       '#d44b23', true, 1),
    (p_user_id, 'Transporte',    'expense', 'car',          '#6640cc', true, 2),
    (p_user_id, 'Moradia',       'expense', 'house',        '#be55e0', true, 3),
    (p_user_id, 'Lazer',         'expense', 'game',         '#c9a422', true, 4),
    (p_user_id, 'Saude',         'expense', 'pill',         '#18b470', true, 5),
    (p_user_id, 'Educacao',      'expense', 'books',        '#e06038', true, 6),
    (p_user_id, 'Compras',       'expense', 'shopping-bag', '#d4a830', true, 7),
    (p_user_id, 'Contas',        'expense', 'document',     '#73778c', true, 8),
    (p_user_id, 'Outros',        'expense', 'pin',          '#8c8fa4', true, 9)
  on conflict (user_id, name, type) do nothing;
end;
$$;


-- Auto-create profile + seed categories on sign-up ───────────
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;

-- profiles
create policy "profiles: own row select"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles: own row update"
  on public.profiles for update using (auth.uid() = id);

-- categories
create policy "categories: own rows select"
  on public.categories for select using (auth.uid() = user_id);

create policy "categories: own rows insert"
  on public.categories for insert with check (auth.uid() = user_id);

create policy "categories: own rows update"
  on public.categories for update using (auth.uid() = user_id);

create policy "categories: own rows delete"
  on public.categories for delete using (auth.uid() = user_id);

-- transactions
create policy "transactions: own rows select"
  on public.transactions for select using (auth.uid() = user_id);

create policy "transactions: own rows insert"
  on public.transactions for insert with check (auth.uid() = user_id);

create policy "transactions: own rows update"
  on public.transactions for update using (auth.uid() = user_id);

create policy "transactions: own rows delete"
  on public.transactions for delete using (auth.uid() = user_id);

-- budgets
create policy "budgets: own rows select"
  on public.budgets for select using (auth.uid() = user_id);

create policy "budgets: own rows insert"
  on public.budgets for insert with check (auth.uid() = user_id);

create policy "budgets: own rows update"
  on public.budgets for update using (auth.uid() = user_id);

create policy "budgets: own rows delete"
  on public.budgets for delete using (auth.uid() = user_id);


-- ============================================================
-- 6. VIEWS
-- ============================================================

create view public.v_monthly_summary as
select
  user_id,
  date_trunc('month', date)::date as month_start,
  type,
  count(*)                        as transaction_count,
  sum(amount)                     as total
from public.transactions
group by user_id, date_trunc('month', date), type;

comment on view public.v_monthly_summary is
  'Income/expense totals per user per calendar month.';


create view public.v_category_spending_this_month as
select
  t.user_id,
  t.category_id,
  t.category_name,
  c.icon,
  c.color,
  count(*)              as transaction_count,
  sum(t.amount)         as total_spent,
  b.amount              as budget_limit,
  case
    when b.amount > 0
      then round((sum(t.amount) / b.amount) * 100, 1)
    else null
  end                   as budget_used_pct
from public.transactions t
left join public.categories c on c.id = t.category_id
left join public.budgets b
  on  b.category_id = t.category_id
  and b.user_id     = t.user_id
  and b.month       = extract(month from current_date)::int
  and b.year        = extract(year  from current_date)::int
where
  t.type = 'expense'
  and date_trunc('month', t.date) = date_trunc('month', current_date)
group by
  t.user_id, t.category_id, t.category_name,
  c.icon, c.color, b.amount;

comment on view public.v_category_spending_this_month is
  'Expense totals by category for the current month, with budget progress.';


-- ============================================================
-- Done! New sign-ups automatically receive a profile and
-- default categories. All data is isolated per user via RLS.
-- ============================================================
