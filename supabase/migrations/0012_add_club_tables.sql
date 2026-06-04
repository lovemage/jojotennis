create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null default '',
  owner_nickname text not null default '',
  name text not null default '',
  types text[] not null default '{}'::text[],
  city text not null default '',
  ntrp_levels text[] not null default '{}'::text[],
  venue text not null default '',
  schedule text not null default '',
  description text not null default '',
  member_count integer not null default 0,
  contact_line text not null default '',
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  uid text not null default '',
  nickname text not null default '',
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create unique index if not exists club_members_active_uid_idx
  on public.club_members (club_id, uid)
  where is_active = true;

create index if not exists clubs_public_created_idx
  on public.clubs (created_at desc)
  where is_deleted = false;

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;

drop policy if exists "clubs public read" on public.clubs;
create policy "clubs public read"
  on public.clubs for select
  using (is_deleted = false);

drop policy if exists "clubs prelaunch public write" on public.clubs;
create policy "clubs prelaunch public write"
  on public.clubs for all
  using (true)
  with check (true);

drop policy if exists "club members prelaunch public access" on public.club_members;
create policy "club members prelaunch public access"
  on public.club_members for all
  using (true)
  with check (true);
