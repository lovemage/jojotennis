alter table public.users
  add column if not exists nickname_changes_used integer not null default 0;

alter table public.pending_courts
  add column if not exists approved_court_id text;
