-- 'draft' = a referrer uploaded a paper form on the online portal to pre-fill it and hasn't submitted yet.
-- Drafts stay out of the coordinator queue.
alter table "ILLINTAKE_referrals" drop constraint if exists "ILLINTAKE_referrals_status_check";
alter table "ILLINTAKE_referrals" add constraint "ILLINTAKE_referrals_status_check"
  check (status in ('draft', 'processing', 'needs_review', 'reviewed', 'approved', 'denied', 'failed'));
