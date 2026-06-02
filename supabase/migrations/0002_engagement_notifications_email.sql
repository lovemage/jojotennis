create extension if not exists pgcrypto;

create table if not exists public.fcm_tokens (
  token text primary key,
  uid text not null,
  device text not null default '',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.match_attendance_obligations (
  match_id text not null,
  participant_uid text not null,
  role text not null check (role in ('host', 'player')),
  match_date timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'attended', 'no_show', 'cancelled', 'host_cancelled', 'early_withdrawn')),
  evaluated_at timestamptz,
  auto_filled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, participant_uid)
);

create table if not exists public.match_reviews (
  id uuid primary key default gen_random_uuid(),
  match_id text not null,
  match_date timestamptz not null,
  reviewer_uid text not null,
  reviewee_uid text not null,
  direction text not null check (direction in ('host_to_player', 'player_to_host')),
  attended boolean,
  excused boolean not null default false,
  stars integer check (stars is null or (stars >= 1 and stars <= 5)),
  comment text not null default '',
  auto_filled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, reviewer_uid, reviewee_uid)
);

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null default '',
  to_uid text,
  template text not null,
  resend_id text,
  status text not null default 'sent' check (status in ('sent', 'failed', 'bounced', 'complained')),
  error text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.email_preferences (
  uid text primary key,
  welcome boolean not null default true,
  match_events boolean not null default true,
  admin_broadcast boolean not null default true,
  unsubscribed_all boolean not null default false,
  unsubscribed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists fcm_tokens_uid_idx on public.fcm_tokens (uid);
create index if not exists obligations_pending_idx
  on public.match_attendance_obligations (match_date)
  where status = 'pending';
create index if not exists match_reviews_reviewee_idx
  on public.match_reviews (reviewee_uid, created_at desc);
create index if not exists email_log_to_uid_idx
  on public.email_log (to_uid, created_at desc);

alter table public.fcm_tokens enable row level security;
alter table public.match_attendance_obligations enable row level security;
alter table public.match_reviews enable row level security;
alter table public.email_log enable row level security;
alter table public.email_preferences enable row level security;

drop policy if exists "fcm prelaunch public access" on public.fcm_tokens;
create policy "fcm prelaunch public access"
  on public.fcm_tokens for all using (true) with check (true);

drop policy if exists "obligations prelaunch public access" on public.match_attendance_obligations;
create policy "obligations prelaunch public access"
  on public.match_attendance_obligations for all using (true) with check (true);

drop policy if exists "reviews prelaunch public access" on public.match_reviews;
create policy "reviews prelaunch public access"
  on public.match_reviews for all using (true) with check (true);

drop policy if exists "email log prelaunch public access" on public.email_log;
create policy "email log prelaunch public access"
  on public.email_log for all using (true) with check (true);

drop policy if exists "email prefs prelaunch public access" on public.email_preferences;
create policy "email prefs prelaunch public access"
  on public.email_preferences for all using (true) with check (true);
