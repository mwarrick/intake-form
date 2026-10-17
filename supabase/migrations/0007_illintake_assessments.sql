-- Housing & Services Assessment, one per referral, filled by the Care Coordinator during the recuperative care stay.
create table if not exists "ILLINTAKE_assessments" (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  referral_id uuid not null unique references "ILLINTAKE_referrals" (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'complete')),
  -- field id -> value, keyed by lib/assessment.ts
  data jsonb not null default '{}'::jsonb,
  completed_at timestamptz
);

alter table "ILLINTAKE_assessments" enable row level security;
