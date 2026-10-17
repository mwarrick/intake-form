-- What was read from each supporting document (H&P, medication list, culture…), whether it was
-- uploaded as an attachment or found among a faxed packet's pages.
create table if not exists "ILLINTAKE_supporting_docs" (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  referral_id uuid not null references "ILLINTAKE_referrals" (id) on delete cascade,
  -- the uploaded attachment it came from; null when read from fax pages
  document_id uuid references "ILLINTAKE_documents" (id) on delete cascade,
  -- page numbers within the faxed packet; null for attachments
  pages int[],
  doc_type text not null,
  label text,
  status text not null default 'processing' check (status in ('processing', 'done', 'failed')),
  data jsonb,
  usage jsonb,
  error text
);

create index if not exists "ILLINTAKE_supporting_docs_referral_idx" on "ILLINTAKE_supporting_docs" (referral_id);
alter table "ILLINTAKE_supporting_docs" enable row level security;

-- Cross-check flags (documents vs. form and admission criteria), kept apart from the form's own
-- validation flags because they are recomputed whenever documents are read or answers change.
alter table "ILLINTAKE_referrals" add column if not exists doc_flags jsonb not null default '[]'::jsonb;
