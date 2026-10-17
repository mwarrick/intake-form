-- IHH's admission criteria checked against the whole packet (lib/criteria-check.ts): one result per rule,
-- with a quote and the pages it came from. Null until the check has run on a referral.
alter table "ILLINTAKE_referrals" add column if not exists criteria jsonb;
