-- Recuperata dal database di produzione (supabase_migrations.schema_migrations).
create extension if not exists pgcrypto with schema extensions;
create or replace function public.calendar_feed(p_token text)
returns table(id uuid, starts_at timestamptz, ends_at timestamptz, type text, notes text, status text, client_name text, updated_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
declare h text;
begin
  select value #>> '{}' into h from public.settings where key = 'calendar_feed_hash';
  if h is null or p_token is null or length(p_token) < 20 or encode(extensions.digest(p_token, 'sha256'), 'hex') <> h then
    return;
  end if;
  return query
    select a.id, a.starts_at, a.ends_at, a.type::text, a.notes, a.status::text,
           nullif(trim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')), ''), a.updated_at
    from public.appointments a left join public.clients c on c.id = a.client_id
    where a.starts_at > now() - interval '60 days' and a.starts_at < now() + interval '180 days'
    order by a.starts_at;
end $$;
revoke all on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated;
