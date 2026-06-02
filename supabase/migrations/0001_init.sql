create extension if not exists pgcrypto;

create table if not exists public.courts (
  id text primary key,
  name text not null,
  city text not null default '',
  district text not null default '',
  address text not null default '',
  lat double precision,
  lng double precision,
  surface_type text not null default 'hard' check (surface_type in ('hard', 'clay', 'grass')),
  indoor text not null default 'outdoor' check (indoor in ('indoor', 'outdoor')),
  total_courts integer not null default 0,
  has_night_light boolean not null default false,
  phone text not null default '',
  booking_url text not null default '',
  booking_method text not null default '',
  notes text not null default '',
  open_hours text not null default '',
  status text not null default 'active' check (status in ('active', 'pending', 'closed')),
  ownership text not null default '',
  region text not null default 'TW',
  images jsonb not null default '[]'::jsonb,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  email_verified boolean not null default false,
  email_verification_sent_at timestamptz,
  is_active boolean not null default true,
  hearts_received integer not null default 0,
  bio text,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news (
  id text primary key,
  title text not null,
  slug text not null unique,
  category text not null default '賽事',
  content text not null default '',
  excerpt text not null default '',
  cover_image_url text not null default '',
  cover_image_public_id text,
  author text not null default 'JoJo Tennis 編輯部',
  is_published boolean not null default false,
  published_at date not null default current_date,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment_reviews (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null default '球拍',
  brand text not null default '',
  model text not null default '',
  cover_image_public_id text,
  cover_image_url text not null default '',
  gallery jsonb not null default '[]'::jsonb,
  content_md text not null default '',
  author_uid text,
  author_name text not null default 'JoJo Tennis 編輯部',
  is_published boolean not null default false,
  published_at timestamptz,
  view_count integer not null default 0,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pending_courts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default '',
  district text not null default '',
  address text not null default '',
  description text not null default '',
  court_count text not null default '',
  booking_method text not null default '',
  reported_by_uid text not null default '',
  reported_by_name text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists courts_active_name_idx
  on public.courts (name)
  where is_deleted = false and status <> 'closed';

create index if not exists pending_courts_status_created_at_idx
  on public.pending_courts (status, created_at desc);
create index if not exists news_published_idx
  on public.news (published_at desc)
  where is_deleted = false;
create index if not exists equipment_reviews_published_idx
  on public.equipment_reviews (published_at desc)
  where is_deleted = false;
create index if not exists users_created_at_idx
  on public.users (created_at desc)
  where is_deleted = false;

alter table public.courts enable row level security;
alter table public.pending_courts enable row level security;
alter table public.users enable row level security;
alter table public.news enable row level security;
alter table public.equipment_reviews enable row level security;

drop policy if exists "courts public read" on public.courts;
create policy "courts public read"
  on public.courts for select
  using (is_deleted = false and status <> 'closed');

drop policy if exists "courts prelaunch public write" on public.courts;
create policy "courts prelaunch public write"
  on public.courts for all
  using (true)
  with check (true);

drop policy if exists "pending courts public insert" on public.pending_courts;
create policy "pending courts public insert"
  on public.pending_courts for insert
  with check (true);

drop policy if exists "pending courts prelaunch public read" on public.pending_courts;
create policy "pending courts prelaunch public read"
  on public.pending_courts for select
  using (true);

drop policy if exists "users prelaunch public access" on public.users;
create policy "users prelaunch public access"
  on public.users for all
  using (true)
  with check (true);

drop policy if exists "news public read" on public.news;
create policy "news public read"
  on public.news for select
  using (is_deleted = false);

drop policy if exists "news prelaunch public write" on public.news;
create policy "news prelaunch public write"
  on public.news for all
  using (true)
  with check (true);

drop policy if exists "equipment reviews public read" on public.equipment_reviews;
create policy "equipment reviews public read"
  on public.equipment_reviews for select
  using (is_deleted = false);

drop policy if exists "equipment reviews prelaunch public write" on public.equipment_reviews;
create policy "equipment reviews prelaunch public write"
  on public.equipment_reviews for all
  using (true)
  with check (true);
