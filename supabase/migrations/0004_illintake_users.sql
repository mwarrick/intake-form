-- Staff accounts for the coordinator side of the app (queue, review, fax upload, user admin).
-- Kept in our own table rather than Supabase Auth. Passwords are stored only as salted scrypt hashes.
create table if not exists "ILLINTAKE_users" (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null,
  -- stored lowercased; unique
  email text not null unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  active boolean not null default true,
  password_hash text not null,
  last_login_at timestamptz
);

-- One row per signed-in browser. Only a SHA-256 hash of the cookie token is stored.
create table if not exists "ILLINTAKE_sessions" (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references "ILLINTAKE_users" (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null
);

create index if not exists "ILLINTAKE_sessions_user_idx" on "ILLINTAKE_sessions" (user_id);

-- Server code uses the service role; RLS with no policies keeps the public key out.
alter table "ILLINTAKE_users" enable row level security;
alter table "ILLINTAKE_sessions" enable row level security;
