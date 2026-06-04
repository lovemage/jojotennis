create table if not exists public.student_posts (
  id uuid primary key default gen_random_uuid(),
  uid text not null default '',
  nickname text not null default '',
  title text not null default '',
  city text not null default '',
  district text not null default '',
  target_ntrp text not null default '',
  prefer_times text[] not null default '{}'::text[],
  budget text not null default '',
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'closed')),
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.heart_records (
  id text primary key,
  match_id text not null references public.matches(id) on delete cascade,
  from_uid text not null default '',
  to_uid text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id text primary key,
  type text not null default '',
  from_uid text not null default '',
  from_nickname text not null default '',
  to_uid text not null default '',
  content text not null default '',
  timestamp_ms bigint not null default 0,
  is_read boolean not null default false,
  related_id text,
  is_handled boolean not null default false,
  handled_status text,
  handled_at_ms bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_posts_status_created_idx
  on public.student_posts (status, created_at desc)
  where is_deleted = false;

create index if not exists messages_to_uid_idx
  on public.messages (to_uid, timestamp_ms desc);

alter table public.student_posts enable row level security;
alter table public.heart_records enable row level security;
alter table public.messages enable row level security;

drop policy if exists "student posts public read" on public.student_posts;
create policy "student posts public read"
  on public.student_posts for select
  using (is_deleted = false);

drop policy if exists "student posts prelaunch public write" on public.student_posts;
create policy "student posts prelaunch public write"
  on public.student_posts for all
  using (true)
  with check (true);

drop policy if exists "heart records prelaunch public access" on public.heart_records;
create policy "heart records prelaunch public access"
  on public.heart_records for all
  using (true)
  with check (true);

drop policy if exists "messages prelaunch public access" on public.messages;
create policy "messages prelaunch public access"
  on public.messages for all
  using (true)
  with check (true);
