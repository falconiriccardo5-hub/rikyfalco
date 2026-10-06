-- Recuperata dal database di produzione (supabase_migrations.schema_migrations).
alter table public.appointments
  add column if not exists status text not null default 'programmato' check (status in ('programmato','fatto','saltato')),
  add column if not exists series_id uuid;
create index if not exists appointments_series on public.appointments(series_id);

-- "fatto" automatically counts a lesson on the client's program active on that date
create or replace function public.on_attendance() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pid uuid; delta int := 0;
begin
  if new.client_id is null then return new; end if;
  if new.status = 'fatto' and old.status is distinct from 'fatto' then delta := 1;
  elsif old.status = 'fatto' and new.status is distinct from 'fatto' then delta := -1; end if;
  if delta = 0 then return new; end if;
  select id into pid from public.programs
   where client_id = new.client_id and start_date <= (new.starts_at at time zone 'Europe/Rome')::date
   order by start_date desc limit 1;
  if pid is null then
    select id into pid from public.programs where client_id = new.client_id order by start_date desc limit 1;
  end if;
  if pid is not null then
    update public.programs set lessons_completed = greatest(0, lessons_completed + delta) where id = pid;
  end if;
  return new;
end $$;
revoke execute on function public.on_attendance() from public, anon, authenticated;
create trigger appointments_attendance after update of status on public.appointments for each row execute function public.on_attendance();

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy admin_all on public.push_subscriptions for all to authenticated using (public.is_admin()) with check (public.is_admin());
