-- Recuperata dal database di produzione (supabase_migrations.schema_migrations).
alter table public.clients add column if not exists portal_token text unique;

create or replace function public.client_portal(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.clients;
begin
  if p_token is null or length(p_token) < 20 then return null; end if;
  select * into c from public.clients where portal_token = p_token and archived_at is null;
  if c.id is null then return null; end if;
  return jsonb_build_object(
    'first_name', c.first_name,
    'program', (select to_jsonb(x) from (
        select type, duration, start_date, end_date, status, days_left, lessons_total, lessons_completed, lessons_remaining,
               total_price, paid_total, installments_count, installments_paid
        from public.program_overview where client_id = c.id order by start_date desc limit 1) x),
    'next', coalesce((select jsonb_agg(to_jsonb(a) order by a.starts_at) from (
        select starts_at, ends_at, type from public.appointments
        where client_id = c.id and starts_at >= now() and status <> 'saltato' order by starts_at limit 8) a), '[]'),
    'last', coalesce((select jsonb_agg(to_jsonb(a) order by a.starts_at desc) from (
        select starts_at, type, status from public.appointments
        where client_id = c.id and starts_at < now() order by starts_at desc limit 5) a), '[]'),
    'payments', coalesce((select jsonb_agg(to_jsonb(p) order by p.due_date) from (
        select amount, due_date, paid_date, paid_amount, status from public.payment_overview
        where client_id = c.id and program_id = (select id from public.programs where client_id = c.id order by start_date desc limit 1)
        order by due_date) p), '[]')
  );
end $$;
revoke all on function public.client_portal(text) from public;
grant execute on function public.client_portal(text) to anon, authenticated;
