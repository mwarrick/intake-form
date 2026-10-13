-- When the approve/deny decision was recorded, to measure the two-hour decision promise.
-- Earlier decisions only kept the approval date, so they stay null rather than guessing a time.
alter table "ILLINTAKE_referrals" add column if not exists decided_at timestamptz;
