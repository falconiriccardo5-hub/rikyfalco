-- Backup e ripristino includono le visite (senza questo il ripristino le cancellava: visits → clients on delete cascade).
create or replace function public.export_snapshot() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'version', 1, 'exported_at', now(),
    'clients', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.clients c), '[]'),
    'programs', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.programs p), '[]'),
    'payments', coalesce((select jsonb_agg(to_jsonb(p) order by p.due_date) from public.payments p), '[]'),
    'appointments', coalesce((select jsonb_agg(to_jsonb(a) order by a.starts_at) from public.appointments a), '[]'),
    'visits', coalesce((select jsonb_agg(to_jsonb(v) order by v.visit_date) from public.visits v), '[]'),
    'visit_templates', coalesce((select jsonb_agg(to_jsonb(t)) from public.visit_templates t), '[]'),
    'email_templates', coalesce((select jsonb_agg(to_jsonb(t)) from public.email_templates t), '[]'),
    'settings', coalesce((select jsonb_agg(to_jsonb(s)) from public.settings s), '[]'));
end $$;

create or replace function public.restore_snapshot(snap jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare safety uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  if (snap->>'version') is distinct from '1' or jsonb_typeof(snap->'clients') <> 'array' then raise exception 'File di backup non valido'; end if;
  insert into public.backups(kind, status, destination, snapshot, finished_at)
  values ('pre-restore', 'completato', 'database', public.export_snapshot(), now()) returning id into safety;
  perform set_config('app.source', 'restore', true);
  delete from public.visits; delete from public.appointments; delete from public.payments; delete from public.programs; delete from public.clients;
  insert into public.clients select * from jsonb_populate_recordset(null::public.clients, snap->'clients');
  insert into public.programs select * from jsonb_populate_recordset(null::public.programs, snap->'programs');
  insert into public.payments select * from jsonb_populate_recordset(null::public.payments, snap->'payments');
  insert into public.appointments select * from jsonb_populate_recordset(null::public.appointments, coalesce(snap->'appointments','[]'));
  -- il modello non si cancella: se una visita punta a un modello che non esiste più, resta leggibile dalla sua copia
  insert into public.visit_templates select * from jsonb_populate_recordset(null::public.visit_templates, coalesce(snap->'visit_templates','[]')) t
  where not exists (select 1 from public.visit_templates x where x.id = t.id) and not (t.is_default and exists (select 1 from public.visit_templates d where d.is_default));
  insert into public.visits
  select v.id, v.client_id, case when exists (select 1 from public.visit_templates t where t.id = v.template_id) then v.template_id end,
         v.kind, v.template, v.visit_date, v.status, v.answers, v.client_submitted_at, v.completed_at, v.created_at, v.updated_at
  from jsonb_populate_recordset(null::public.visits, coalesce(snap->'visits','[]')) v;
  return jsonb_build_object('safety_backup', safety,
    'clients', jsonb_array_length(snap->'clients'), 'programs', jsonb_array_length(snap->'programs'), 'payments', jsonb_array_length(snap->'payments'),
    'visits', jsonb_array_length(coalesce(snap->'visits','[]')));
end $$;
