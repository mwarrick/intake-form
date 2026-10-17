-- Clinical staff (e.g. the LVN medical coordinator) who admit approved patients.
alter table "ILLINTAKE_users" drop constraint if exists "ILLINTAKE_users_role_check";
alter table "ILLINTAKE_users" add constraint "ILLINTAKE_users_role_check" check (role in ('user', 'clinical', 'admin'));
