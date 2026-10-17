-- A referral can be withdrawn: the patient left the hospital against medical advice, went elsewhere, or the
-- hospital took it back, before or after a decision. withdrawn_at times it, so the dashboard can show how many
-- were lost before IHH answered.
alter table "ILLINTAKE_referrals" drop constraint if exists "ILLINTAKE_referrals_status_check";
alter table "ILLINTAKE_referrals" add constraint "ILLINTAKE_referrals_status_check"
  check (status in ('draft', 'processing', 'needs_review', 'reviewed', 'approved', 'denied', 'withdrawn', 'failed'));
alter table "ILLINTAKE_referrals" add column if not exists withdrawn_at timestamptz;
