-- Accounts can exist before their owner has chosen a password (imported staff, or an admin cleared it):
-- password_hash is null until then, and the person sets one at their first sign-in with just their email.
alter table "ILLINTAKE_users" alter column password_hash drop not null;

-- Set while someone has no password of their own yet: no password at all, or a temporary one an admin set.
-- They must choose their own at their next sign-in before they can use the app. Cleared when they do.
alter table "ILLINTAKE_users" add column if not exists must_change_password boolean not null default false;
