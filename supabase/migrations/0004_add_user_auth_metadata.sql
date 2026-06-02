alter table public.users
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verification_sent_at timestamptz;

update public.users
set email_verified = true
where provider = 'google'
  and email <> ''
  and email_verified = false;
