create table if not exists public.chat_messages (
  id text primary key,
  conv_id text not null,
  sender_uid text not null default '',
  sender_nickname text not null default '',
  content text not null default '',
  msg_type text not null default 'text' check (msg_type in ('text', 'system')),
  read_by text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_conv_created_idx
  on public.chat_messages (conv_id, created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists "chat messages service only" on public.chat_messages;
create policy "chat messages service only"
  on public.chat_messages for all
  using (false)
  with check (false);
