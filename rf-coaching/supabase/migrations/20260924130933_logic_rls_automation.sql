-- helpers
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.setting_int(k text, fallback int) returns int language sql stable security definer set search_path = '' as $$
  select coalesce((select (value)::text::int from public.settings where key = k), fallback);
$$;
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['clients','programs','payments','appointments'] loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;
-- audit trigger (final version is in 20260924161031_phase45_integrations.sql)
create or replace function public.audit_trigger() returns trigger language plpgsql security definer set search_path = '' as $$
begin return coalesce(new, old); end $$;
do $$ declare t text; begin
  foreach t in array array['clients','programs','payments','appointments'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t, t);
  end loop;
end $$;
-- payment received -> notification + close reminders
create or replace function public.on_payment_paid() returns trigger language plpgsql security definer set search_path = '' as $$
declare nm text;
begin
  if new.paid_date is not null and (old.paid_date is null) then
    select first_name || ' ' || last_name into nm from public.clients where id = new.client_id;
    insert into public.notifications(type, title, body, client_id)
    values ('pagamento_ricevuto', 'Pagamento ricevuto — ' || nm, '€' || coalesce(new.paid_amount, new.amount)::text, new.client_id);
    update public.reminders set status = 'gestito' where payment_id = new.id and status = 'aperto';
  end if;
  return new;
end $$;
create trigger payments_paid after update on public.payments for each row execute function public.on_payment_paid();
-- computed-status views
create view public.payment_overview with (security_invoker = true) as
select p.*,
  case
    when p.paid_date is not null and coalesce(p.paid_amount, p.amount) >= p.amount then 'pagato'
    when coalesce(p.paid_amount,0) > 0 then 'parziale'
    when p.due_date < current_date then 'scaduto'
    when p.due_date <= current_date + public.setting_int('payment_reminder_days', 7) then 'in_attesa'
    else 'programmato'
  end as status,
  (p.due_date - current_date) as days_to_due,
  c.first_name, c.last_name
from public.payments p join public.clients c on c.id = p.client_id;
create view public.program_overview with (security_invoker = true) as
select pr.*,
  case
    when pr.manual_status is not null then pr.manual_status
    when pr.end_date < current_date then 'scaduto'
    when pr.end_date <= current_date + public.setting_int('renewal_reminder_days', 30) then 'in_scadenza'
    else 'attivo'
  end as status,
  (pr.end_date - current_date) as days_left,
  greatest(pr.lessons_total - pr.lessons_completed, 0) as lessons_remaining,
  coalesce(pay.paid_total, 0) as paid_total,
  coalesce(pay.n_total, 0) as installments_count,
  coalesce(pay.n_paid, 0) as installments_paid,
  coalesce(pay.n_overdue, 0) as installments_overdue,
  case
    when coalesce(pay.n_overdue,0) > 0 then 'scaduto'
    when coalesce(pay.n_total,0) > 0 and pay.n_paid = pay.n_total then 'pagato'
    when coalesce(pay.paid_total,0) > 0 then 'parziale'
    else 'in_attesa'
  end as payment_state,
  c.first_name, c.last_name, c.email as client_email, c.archived_at
from public.programs pr
join public.clients c on c.id = pr.client_id
left join lateral (
  select sum(case when po.paid_date is not null then coalesce(po.paid_amount, po.amount) else coalesce(po.paid_amount,0) end) as paid_total,
         count(*) as n_total,
         count(*) filter (where po.status = 'pagato') as n_paid,
         count(*) filter (where po.status = 'scaduto') as n_overdue
  from public.payment_overview po where po.program_id = pr.id
) pay on true;
-- daily automation (pg_cron) — creates reminders + notifications, idempotent
create or replace function public.guard_automations() returns void language plpgsql security definer set search_path = '' as $$
begin if auth.uid() is not null and not public.is_admin() then raise exception 'forbidden'; end if; end $$;
create or replace function public.run_daily_automations() returns jsonb language plpgsql security definer set search_path = '' as $$
declare r_days int := public.setting_int('renewal_reminder_days', 30);
        p_days int := public.setting_int('payment_reminder_days', 7);
        n int := 0; c int;
begin
  perform public.guard_automations();
  perform set_config('app.source', case when auth.uid() is null then 'cron' else 'ui' end, true);
  with ins as (
    insert into public.reminders(client_id, program_id, type, scheduled_at)
    select pr.client_id, pr.id, 'rinnovo', pr.end_date - r_days
    from public.programs pr join public.clients cl on cl.id = pr.client_id
    where pr.manual_status is null and cl.archived_at is null and pr.end_date between current_date and current_date + r_days
    on conflict do nothing returning *)
  insert into public.notifications(type, title, body, client_id, reminder_id)
  select 'percorso_in_scadenza', 'Rinnovo cliente — ' || cl.first_name || ' ' || cl.last_name,
         'Il percorso termina il ' || to_char(pr.end_date, 'DD/MM/YYYY') || ' (' || (pr.end_date - current_date) || ' giorni).', ins.client_id, ins.id
  from ins join public.clients cl on cl.id = ins.client_id join public.programs pr on pr.id = ins.program_id;
  get diagnostics c = row_count; n := n + c;
  with ins as (
    insert into public.reminders(client_id, program_id, type, scheduled_at)
    select pr.client_id, pr.id, 'scadenza', pr.end_date
    from public.programs pr join public.clients cl on cl.id = pr.client_id
    where pr.manual_status is null and cl.archived_at is null and pr.end_date < current_date
    on conflict do nothing returning *)
  insert into public.notifications(type, title, body, client_id, reminder_id)
  select 'percorso_in_scadenza', 'Percorso scaduto — ' || cl.first_name || ' ' || cl.last_name,
         'Scaduto il ' || to_char(pr.end_date, 'DD/MM/YYYY') || '.', ins.client_id, ins.id
  from ins join public.clients cl on cl.id = ins.client_id join public.programs pr on pr.id = ins.program_id;
  get diagnostics c = row_count; n := n + c;
  with ins as (
    insert into public.reminders(client_id, program_id, payment_id, type, scheduled_at)
    select p.client_id, p.program_id, p.id, 'rata', p.due_date - p_days
    from public.payments p join public.clients cl on cl.id = p.client_id
    where p.paid_date is null and cl.archived_at is null and p.due_date between current_date and current_date + p_days
    on conflict do nothing returning *)
  insert into public.notifications(type, title, body, client_id, reminder_id)
  select 'pagamento_in_arrivo', 'Rata in arrivo — ' || cl.first_name || ' ' || cl.last_name,
         '€' || p.amount || ' in scadenza il ' || to_char(p.due_date, 'DD/MM/YYYY') || '.', ins.client_id, ins.id
  from ins join public.clients cl on cl.id = ins.client_id join public.payments p on p.id = ins.payment_id;
  get diagnostics c = row_count; n := n + c;
  with ins as (
    insert into public.reminders(client_id, program_id, payment_id, type, scheduled_at)
    select p.client_id, p.program_id, p.id, 'pagamento_scaduto', p.due_date
    from public.payments p join public.clients cl on cl.id = p.client_id
    where p.paid_date is null and cl.archived_at is null and p.due_date < current_date
    on conflict do nothing returning *)
  insert into public.notifications(type, title, body, client_id, reminder_id)
  select 'pagamento_scaduto', 'Pagamento scaduto — ' || cl.first_name || ' ' || cl.last_name,
         '€' || p.amount || ' scaduto il ' || to_char(p.due_date, 'DD/MM/YYYY') || '.', ins.client_id, ins.id
  from ins join public.clients cl on cl.id = ins.client_id join public.payments p on p.id = ins.payment_id;
  get diagnostics c = row_count; n := n + c;
  insert into public.settings(key, value) values ('last_automation_run', to_jsonb(now()))
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return jsonb_build_object('notifications_created', n, 'ran_at', now());
end $$;
create extension if not exists pg_cron;
select cron.schedule('rf-daily-automations', '0 6 * * *', 'select public.run_daily_automations()');
-- RLS: admin can do everything, future CLIENT role reads only own data
do $$ declare t text; begin
  foreach t in array array['profiles','clients','programs','payments','appointments','reminders','notifications','email_templates','email_logs','settings','integrations','backups','api_tokens','audit_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;
create policy self_read on public.profiles for select to authenticated using (id = auth.uid());
create policy client_read on public.clients for select to authenticated using (id = (select client_id from public.profiles where id = auth.uid() and role = 'client'));
create policy client_read on public.programs for select to authenticated using (client_id = (select client_id from public.profiles where id = auth.uid() and role = 'client'));
create policy client_read on public.payments for select to authenticated using (client_id = (select client_id from public.profiles where id = auth.uid() and role = 'client'));
create policy client_read on public.appointments for select to authenticated using (client_id = (select client_id from public.profiles where id = auth.uid() and role = 'client'));
drop policy admin_all on public.audit_logs;
create policy admin_read on public.audit_logs for select to authenticated using (public.is_admin()); -- append-only
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email, name) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name',''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
alter publication supabase_realtime add table public.clients, public.programs, public.payments, public.appointments, public.notifications;
-- grants hardening
revoke execute on function public.handle_new_user(), public.on_payment_paid(), public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.is_admin(), public.setting_int(text,int), public.guard_automations() from public, anon;
revoke execute on function public.run_daily_automations() from public, anon;
grant execute on function public.is_admin(), public.setting_int(text,int), public.run_daily_automations() to authenticated;
-- defaults
insert into public.settings(key, value) values
 ('renewal_reminder_days', '30'), ('payment_reminder_days', '7'), ('expiry_email_offset_days', '0'), ('backup_frequency', '"daily"');
insert into public.email_templates(key, subject, body) values
 ('rinnovo', 'Il tuo percorso con Riccardo sta per terminare', E'Ciao {{nome}},\n\nil tuo percorso di coaching terminerà il {{data_fine}}.\n\nSe vuoi continuare il percorso con Riccardo puoi procedere con il rinnovo.\n\nA presto,\nRiccardo Falconi\nCoaching'),
 ('rata', 'Promemoria rata in scadenza', E'Ciao {{nome}},\n\nti ricordo che la rata di €{{importo}} scade il {{data_scadenza}}.\n\nGrazie,\nRiccardo Falconi\nCoaching'),
 ('scadenza', 'Il tuo percorso è terminato', E'Ciao {{nome}},\n\nil tuo percorso di coaching si è concluso il {{data_fine}}. Grazie per il lavoro fatto insieme!\n\nSe vuoi ripartire, rispondi a questa email.\n\nRiccardo Falconi\nCoaching'),
 ('manuale', '', E'Ciao {{nome}},\n\n\n\nRiccardo Falconi\nCoaching');
