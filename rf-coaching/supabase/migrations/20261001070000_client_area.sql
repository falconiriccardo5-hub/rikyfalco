-- Area cliente: il cliente apre il suo link personale (/c/<portal_token>) e vede
-- soltanto i propri dati. Nessun login: il token è l'unica credenziale, quindi la
-- funzione è security definer e restituisce un insieme di campi volutamente ristretto
-- (niente note interne, niente anagrafica altrui, niente importi di altri clienti).
create or replace function public.client_area(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.clients; pr public.program_overview;
begin
  if p_token is null or length(p_token) < 20 then return null; end if;
  select * into c from public.clients where portal_token = p_token and archived_at is null;
  if c.id is null then return null; end if;

  select * into pr from public.program_overview
   where client_id = c.id and archived_at is null order by start_date desc limit 1;

  return jsonb_build_object(
    'first_name', c.first_name,
    'last_name', c.last_name,
    'program', case when pr.id is null then null else jsonb_build_object(
      'type', pr.type, 'duration', pr.duration,
      'start_date', pr.start_date, 'end_date', pr.end_date, 'days_left', pr.days_left,
      'lessons_total', pr.lessons_total, 'lessons_completed', pr.lessons_completed,
      'lessons_remaining', pr.lessons_remaining,
      'installments_count', pr.installments_count, 'installments_paid', pr.installments_paid) end,
    'payments', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'amount', p.amount, 'due_date', p.due_date, 'paid_date', p.paid_date,
               'status', p.status) order by p.due_date), '[]')
      from public.payment_overview p where p.client_id = c.id),
    'appointments', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'starts_at', a.starts_at, 'ends_at', a.ends_at, 'type', a.type) order by a.starts_at), '[]')
      from public.appointments a
      where a.client_id = c.id and a.starts_at >= now() and a.starts_at < now() + interval '30 days'),
    'last_appointment', (
      select max(a.starts_at) from public.appointments a
      where a.client_id = c.id and a.starts_at < now()),
    'open_visit', exists (
      select 1 from public.visits v where v.client_id = c.id and v.status = 'da_compilare'));
end $$;

revoke all on function public.client_area(text) from public;
grant execute on function public.client_area(text) to anon, authenticated;
