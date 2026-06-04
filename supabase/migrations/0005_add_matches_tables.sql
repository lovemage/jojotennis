create table if not exists public.matches (
  id text primary key default gen_random_uuid()::text,
  owner_uid text not null default '',
  owner_nickname text not null default '球友',
  title text not null default '',
  city text not null default '',
  district text not null default '',
  venue text not null default '',
  date text not null default '',
  weekday text not null default '',
  start_time text not null default '',
  end_time text not null default '',
  ntrp_required text[] not null default array['不限']::text[],
  total_slots integer not null default 1,
  filled_slots integer not null default 0,
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  note text not null default '',
  join_mode text not null default 'approval' check (join_mode in ('public', 'private', 'approval')),
  join_code text,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_applications (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches(id) on delete cascade,
  applicant_uid text not null default '',
  applicant_nickname text not null default '球友',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'removed')),
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matches_admin_created_at_idx
  on public.matches (created_at desc);

create index if not exists matches_public_open_idx
  on public.matches (created_at desc)
  where is_deleted = false and status = 'open';

create index if not exists match_applications_match_id_idx
  on public.match_applications (match_id)
  where is_deleted = false;

alter table public.matches enable row level security;
alter table public.match_applications enable row level security;

drop policy if exists "matches public read" on public.matches;
create policy "matches public read"
  on public.matches for select
  using (is_deleted = false);

drop policy if exists "matches prelaunch public write" on public.matches;
create policy "matches prelaunch public write"
  on public.matches for all
  using (true)
  with check (true);

drop policy if exists "match applications public read" on public.match_applications;
create policy "match applications public read"
  on public.match_applications for select
  using (is_deleted = false);

drop policy if exists "match applications prelaunch public write" on public.match_applications;
create policy "match applications prelaunch public write"
  on public.match_applications for all
  using (true)
  with check (true);
