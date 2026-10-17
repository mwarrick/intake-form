-- Recuperative care referral intake. Every object is prefixed ILLINTAKE_.
-- Uppercase names are case-sensitive in Postgres, so raw SQL must quote them: select * from "ILLINTAKE_referrals".

create table if not exists "ILLINTAKE_referrals" (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 'scan' = read from a paper/fax form, 'portal' = submitted online
  source text not null check (source in ('scan', 'portal')),
  -- processing -> needs_review -> reviewed -> approved | denied; failed if extraction errored
  status text not null default 'needs_review'
    check (status in ('processing', 'needs_review', 'reviewed', 'approved', 'denied', 'failed')),
  -- copied out of data for the queue list
  patient_name text,
  referring_hospital text,
  -- field id -> value, keyed by schema/referral-form.json
  data jsonb not null default '{}'::jsonb,
  -- field id -> { confidence, raw, model } for scanned referrals
  extraction jsonb not null default '{}'::jsonb,
  -- validation and admission-criteria flags, recomputed on every save
  flags jsonb not null default '[]'::jsonb,
  -- form page number(s) the extractor used, and models/timing for the run
  pipeline jsonb not null default '{}'::jsonb,
  error text,
  reviewed_at timestamptz
);

create index if not exists "ILLINTAKE_referrals_created_at_idx" on "ILLINTAKE_referrals" (created_at desc);
create index if not exists "ILLINTAKE_referrals_status_idx" on "ILLINTAKE_referrals" (status);

create table if not exists "ILLINTAKE_documents" (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  referral_id uuid not null references "ILLINTAKE_referrals" (id) on delete cascade,
  -- 'page' = rendered page image of a scan, 'original' = uploaded file, 'attachment' = supporting doc
  kind text not null check (kind in ('page', 'original', 'attachment')),
  page_number int,
  label text,
  file_name text,
  mime_type text,
  storage_path text not null
);

create index if not exists "ILLINTAKE_documents_referral_idx" on "ILLINTAKE_documents" (referral_id, kind, page_number);

-- The app reads and writes only from server code with the service role key.
-- RLS on with no policies keeps the anon/publishable key locked out.
alter table "ILLINTAKE_referrals" enable row level security;
alter table "ILLINTAKE_documents" enable row level security;

-- Private bucket for scans, page images and attachments.
insert into storage.buckets (id, name, public)
values ('illintake-files', 'illintake-files', false)
on conflict (id) do nothing;
