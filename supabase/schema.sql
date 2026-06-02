-- ============================================================
-- Personal Finance Assistant — Supabase Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- TRANSACTIONS
-- ============================================================
create table if not exists transactions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  description   text not null,
  amount        numeric(12, 2) not null,
  category      text not null default 'Uncategorized',
  merchant      text,
  currency      text not null default 'USD',
  is_income     boolean not null default false,
  source        text not null default 'csv' check (source in ('csv','bank','receipt','manual')),
  receipt_url   text,
  raw_data      jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists transactions_user_date on transactions(user_id, date desc);
create index if not exists transactions_user_category on transactions(user_id, category);
create index if not exists transactions_user_merchant on transactions(user_id, merchant);

alter table transactions enable row level security;

create policy "users can manage own transactions"
  on transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- MONTHLY SUMMARIES (pre-aggregated for performance)
-- ============================================================
create table if not exists monthly_summaries (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  year                 integer not null,
  month                integer not null,
  total_spent          numeric(12, 2) not null default 0,
  total_income         numeric(12, 2) not null default 0,
  category_breakdown   jsonb not null default '{}',
  transaction_count    integer not null default 0,
  updated_at           timestamptz not null default now(),
  unique(user_id, year, month)
);

alter table monthly_summaries enable row level security;

create policy "users can manage own summaries"
  on monthly_summaries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- BUDGETS
-- ============================================================
create table if not exists budgets (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  category      text not null,
  limit_amount  numeric(12, 2) not null,
  period        text not null default 'monthly' check (period in ('weekly','monthly','yearly')),
  created_at    timestamptz not null default now(),
  unique(user_id, category, period)
);

alter table budgets enable row level security;

create policy "users can manage own budgets"
  on budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- RECURRING CHARGES (pre-computed, refreshed on import)
-- ============================================================
create table if not exists recurring_charges (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  merchant      text not null,
  amount        numeric(12, 2) not null,
  frequency     text not null check (frequency in ('weekly','monthly','yearly')),
  last_seen     date not null,
  occurrences   integer not null default 2,
  category      text not null default 'Subscriptions',
  created_at    timestamptz not null default now(),
  unique(user_id, merchant, frequency)
);

alter table recurring_charges enable row level security;

create policy "users can manage own recurring"
  on recurring_charges for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- USER CONTEXT (persistent memory for the assistant)
-- ============================================================
create table if not exists user_context (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  key           text not null,
  value         text not null,
  updated_at    timestamptz not null default now(),
  unique(user_id, key)
);

alter table user_context enable row level security;

create policy "users can manage own context"
  on user_context for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- CHAT HISTORY
-- ============================================================
create table if not exists chat_messages (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null check (role in ('user','assistant')),
  content       text not null,
  metadata      jsonb default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists chat_messages_user_created on chat_messages(user_id, created_at desc);

alter table chat_messages enable row level security;

create policy "users can manage own messages"
  on chat_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- HELPER: upsert monthly summary
-- ============================================================
create or replace function upsert_monthly_summary(p_user_id uuid, p_year int, p_month int)
returns void
language plpgsql
security definer
as $$
declare
  v_spent numeric;
  v_income numeric;
  v_count integer;
  v_breakdown jsonb;
begin
  select
    coalesce(sum(amount) filter (where not is_income), 0),
    coalesce(sum(amount) filter (where is_income), 0),
    count(*),
    coalesce(
      jsonb_object_agg(category, cat_total) filter (where not is_income),
      '{}'::jsonb
    )
  into v_spent, v_income, v_count, v_breakdown
  from (
    select category, sum(amount) as cat_total, is_income
    from transactions
    where user_id = p_user_id
      and extract(year from date) = p_year
      and extract(month from date) = p_month
    group by category, is_income
  ) sub;

  insert into monthly_summaries(user_id, year, month, total_spent, total_income, category_breakdown, transaction_count)
  values (p_user_id, p_year, p_month, v_spent, v_income, v_breakdown, v_count)
  on conflict (user_id, year, month) do update set
    total_spent = excluded.total_spent,
    total_income = excluded.total_income,
    category_breakdown = excluded.category_breakdown,
    transaction_count = excluded.transaction_count,
    updated_at = now();
end;
$$;
