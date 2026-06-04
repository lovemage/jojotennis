create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  uid text not null default '',
  nickname text not null default '教練',
  city text not null default '',
  ntrp_range text not null default '',
  price_per_hour integer not null default 0,
  bio text not null default '',
  rating numeric not null default 0,
  is_verified boolean not null default false,
  is_published boolean not null default true,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pending_coaches (
  uid text primary key,
  email text not null default '',
  real_name text not null default '',
  city text not null default '',
  phone text not null default '',
  birthday text not null default '',
  nickname text not null default '',
  ntrp_range text not null default '',
  price_per_hour integer not null default 0,
  bio text not null default '',
  id_front_url text,
  id_front_path text,
  id_back_url text,
  id_back_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  linked_coach_id uuid references public.coaches(id),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  updated_at timestamptz not null default now()
);

create index if not exists coaches_public_idx
  on public.coaches (created_at desc)
  where is_deleted = false and is_published = true;

create index if not exists pending_coaches_submitted_idx
  on public.pending_coaches (submitted_at desc);

alter table public.coaches enable row level security;
alter table public.pending_coaches enable row level security;

drop policy if exists "coaches public read" on public.coaches;
create policy "coaches public read"
  on public.coaches for select
  using (is_deleted = false);

drop policy if exists "coaches prelaunch public write" on public.coaches;
create policy "coaches prelaunch public write"
  on public.coaches for all
  using (true)
  with check (true);

drop policy if exists "pending coaches prelaunch public access" on public.pending_coaches;
create policy "pending coaches prelaunch public access"
  on public.pending_coaches for all
  using (true)
  with check (true);
