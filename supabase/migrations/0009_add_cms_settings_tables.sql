create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null default '',
  is_active boolean not null default true,
  priority integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.legal_pages (
  slug text primary key check (slug in ('privacy', 'terms')),
  badge text not null default '',
  title text not null default '',
  intro text not null default '',
  notice_title text not null default '',
  notice_body text not null default '',
  sections jsonb not null default '[]'::jsonb,
  last_updated text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  key text primary key,
  subject text not null default '',
  greeting text not null default '',
  body text not null default '',
  cta_label text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists announcements_visible_idx
  on public.announcements (priority desc, updated_at desc)
  where is_deleted = false;

alter table public.site_settings enable row level security;
alter table public.announcements enable row level security;
alter table public.legal_pages enable row level security;
alter table public.email_templates enable row level security;

drop policy if exists "site settings public read" on public.site_settings;
create policy "site settings public read"
  on public.site_settings for select
  using (true);

drop policy if exists "site settings prelaunch public write" on public.site_settings;
create policy "site settings prelaunch public write"
  on public.site_settings for all
  using (true)
  with check (true);

drop policy if exists "announcements public read" on public.announcements;
create policy "announcements public read"
  on public.announcements for select
  using (is_deleted = false);

drop policy if exists "announcements prelaunch public write" on public.announcements;
create policy "announcements prelaunch public write"
  on public.announcements for all
  using (true)
  with check (true);

drop policy if exists "legal pages public read" on public.legal_pages;
create policy "legal pages public read"
  on public.legal_pages for select
  using (true);

drop policy if exists "legal pages prelaunch public write" on public.legal_pages;
create policy "legal pages prelaunch public write"
  on public.legal_pages for all
  using (true)
  with check (true);

drop policy if exists "email templates prelaunch public access" on public.email_templates;
create policy "email templates prelaunch public access"
  on public.email_templates for all
  using (true)
  with check (true);
