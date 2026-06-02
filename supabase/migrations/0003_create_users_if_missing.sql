create table if not exists public.users (
  uid text primary key,
  email text not null default '',
  nickname text not null default '新球友',
  ntrp text not null default '2.0',
  region text not null default '台北市',
  years_playing integer not null default 0,
  avatar_url text not null default '',
  avatar_public_id text,
  role text not null default 'user' check (role in ('user', 'admin', 'coach')),
  provider text not null default 'password' check (provider in ('password', 'google', 'line')),
  is_active boolean not null default true,
  hearts_received integer not null default 0,
  bio text,
  nickname_changes_used integer not null default 0,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_created_at_idx
  on public.users (created_at desc)
  where is_deleted = false;

alter table public.users enable row level security;

drop policy if exists "users prelaunch public access" on public.users;
create policy "users prelaunch public access"
  on public.users for all
  using (true)
  with check (true);
