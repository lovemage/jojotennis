drop policy if exists "matches prelaunch public write" on public.matches;
drop policy if exists "match applications prelaunch public write" on public.match_applications;

drop policy if exists "matches public read" on public.matches;
drop policy if exists "match applications public read" on public.match_applications;

create policy "matches public read"
  on public.matches
  for select
  to anon, authenticated
  using (is_deleted = false);

create policy "match applications public read"
  on public.match_applications
  for select
  to anon, authenticated
  using (is_deleted = false);
