alter table public.email_logs add column if not exists reminder_id uuid references public.reminders(id) on delete set null;
create unique index if not exists email_logs_reminder_once on public.email_logs(reminder_id) where reminder_id is not null and status = 'inviata';
alter table public.backups add column if not exists snapshot jsonb, add column if not exists size_bytes int, add column if not exists file_url text;
alter table public.api_tokens add column if not exists prefix text;
insert into public.settings(key,value) values ('email_provider','"resend"') on conflict do nothing;
-- audit: before/after diff; source from app.source, x-app-source header (AI/cron) or session
create or replace function public.audit_trigger() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  od jsonb; nd jsonb; k text; cid uuid; src text;
begin
  if tg_op = 'UPDATE' then
    od := '{}'; nd := '{}';
    for k in select jsonb_object_keys(n) loop
      if k not in ('updated_at') and (o->k) is distinct from (n->k) then
        od := od || jsonb_build_object(k, o->k); nd := nd || jsonb_build_object(k, n->k);
      end if;
    end loop;
    if nd = '{}'::jsonb then return new; end if;
  else od := o; nd := n; end if;
  cid := case when tg_table_name = 'clients' then coalesce(n->>'id', o->>'id')::uuid
              else nullif(coalesce(n->>'client_id', o->>'client_id'), '')::uuid end;
  src := coalesce(
    nullif(current_setting('app.source', true), ''),
    nullif(current_setting('request.headers', true)::jsonb->>'x-app-source', ''),
    case when auth.uid() is null then 'system' else 'ui' end);
  if src not in ('ui','ai','cron','seed','system','restore') then src := 'system'; end if;
  insert into public.audit_logs(user_id, source, action, entity, entity_id, client_id, old_value, new_value)
  values (auth.uid(), src, lower(tg_op), tg_table_name, coalesce(n->>'id', o->>'id')::uuid,
          case when tg_op = 'DELETE' and tg_table_name = 'clients' then null else cid end, od, nd);
  return coalesce(new, old);
end $$;
revoke execute on function public.audit_trigger() from public, anon, authenticated;
create or replace function public.export_snapshot() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'version', 1, 'exported_at', now(),
    'clients', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.clients c), '[]'),
    'programs', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.programs p), '[]'),
    'payments', coalesce((select jsonb_agg(to_jsonb(p) order by p.due_date) from public.payments p), '[]'),
    'appointments', coalesce((select jsonb_agg(to_jsonb(a) order by a.starts_at) from public.appointments a), '[]'),
    'email_templates', coalesce((select jsonb_agg(to_jsonb(t)) from public.email_templates t), '[]'),
    'settings', coalesce((select jsonb_agg(to_jsonb(s)) from public.settings s), '[]'));
end $$;
revoke execute on function public.export_snapshot() from public, anon;
grant execute on function public.export_snapshot() to authenticated;
create or replace function public.restore_snapshot(snap jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare safety uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  if (snap->>'version') is distinct from '1' or jsonb_typeof(snap->'clients') <> 'array' then raise exception 'File di backup non valido'; end if;
  insert into public.backups(kind, status, destination, snapshot, finished_at)
  values ('pre-restore', 'completato', 'database', public.export_snapshot(), now()) returning id into safety;
  perform set_config('app.source', 'restore', true);
  delete from public.appointments; delete from public.payments; delete from public.programs; delete from public.clients;
  insert into public.clients select * from jsonb_populate_recordset(null::public.clients, snap->'clients');
  insert into public.programs select * from jsonb_populate_recordset(null::public.programs, snap->'programs');
  insert into public.payments select * from jsonb_populate_recordset(null::public.payments, snap->'payments');
  insert into public.appointments select * from jsonb_populate_recordset(null::public.appointments, coalesce(snap->'appointments','[]'));
  return jsonb_build_object('safety_backup', safety,
    'clients', jsonb_array_length(snap->'clients'), 'programs', jsonb_array_length(snap->'programs'), 'payments', jsonb_array_length(snap->'payments'));
end $$;
revoke execute on function public.restore_snapshot(jsonb) from public, anon;
grant execute on function public.restore_snapshot(jsonb) to authenticated;
create or replace function public.prune_backups() returns void language sql security definer set search_path = '' as $$
  update public.backups set snapshot = null where id in (select id from public.backups where snapshot is not null order by created_at desc offset 30);
$$;
revoke execute on function public.prune_backups() from public, anon, authenticated;
