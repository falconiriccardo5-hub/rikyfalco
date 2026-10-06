-- Sezione "Visita": modello visita (anamnesi iniziale + check ogni 2 mesi) assegnato a ogni cliente.
-- Il cliente compila le sue domande dal portale (token), il coach compila misure, osservazioni, macro e voti.

create table if not exists public.visit_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version int not null default 1,
  body jsonb not null, -- { name, version, intervalDays, kinds: { iniziale: {title, sections}, check: {...} } }
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists visit_templates_one_default on public.visit_templates(is_default) where is_default;

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  template_id uuid references public.visit_templates(id) on delete set null,
  kind text not null check (kind in ('iniziale','check')),
  -- copia della sezione del modello usata: le visite passate restano leggibili anche se il modello cambia
  template jsonb not null,
  visit_date date not null default current_date,
  status text not null default 'da_compilare'
    check (status in ('da_compilare','compilata_cliente','completata')),
  answers jsonb not null default '{}', -- { field_id: { value, note } }
  client_submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists visits_client on public.visits(client_id, visit_date desc);
create index if not exists visits_status on public.visits(status);

create trigger visit_templates_touch before update on public.visit_templates for each row execute function public.touch_updated_at();
create trigger visits_touch before update on public.visits for each row execute function public.touch_updated_at();
create trigger visits_audit after insert or update or delete on public.visits for each row execute function public.audit_trigger();

alter table public.visit_templates enable row level security;
alter table public.visits enable row level security;
create policy admin_all on public.visit_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.visits for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy client_read on public.visits for select to authenticated
  using (client_id = (select client_id from public.profiles where id = auth.uid() and role = 'client'));

insert into public.settings(key, value) values ('visit_interval_days', '60'::jsonb), ('visit_reminder_days', '7'::jsonb)
on conflict (key) do nothing;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'pagamento_scaduto','pagamento_in_arrivo','percorso_in_scadenza','nuovo_appuntamento','pagamento_ricevuto','sistema',
  'visita_in_scadenza','visita_compilata'));

-- Stato visite per cliente: ultima visita completata e prossimo check (ogni visit_interval_days, default 60).
create or replace view public.visit_overview with (security_invoker = true) as
select c.id as client_id, c.first_name, c.last_name, c.archived_at,
       last.visit_date as last_visit_date,
       last.kind as last_visit_kind,
       (select count(*) from public.visits v where v.client_id = c.id and v.status = 'completata') as visits_done,
       open.id as open_visit_id,
       open.status as open_visit_status,
       case when last.visit_date is null then null
            else last.visit_date + public.setting_int('visit_interval_days', 60) end as next_due,
       case when open.id is not null then 'aperta'
            when last.visit_date is null then 'mai_fatta'
            when last.visit_date + public.setting_int('visit_interval_days', 60) < current_date then 'scaduta'
            when last.visit_date + public.setting_int('visit_interval_days', 60)
                 <= current_date + public.setting_int('visit_reminder_days', 7) then 'in_scadenza'
            else 'in_regola' end as visit_state
from public.clients c
left join lateral (select v.visit_date, v.kind from public.visits v
                   where v.client_id = c.id and v.status = 'completata'
                   order by v.visit_date desc limit 1) last on true
left join lateral (select v.id, v.status from public.visits v
                   where v.client_id = c.id and v.status <> 'completata'
                   order by v.visit_date desc limit 1) open on true;

-- Id dei campi che il cliente può compilare, letti dalla copia del modello salvata sulla visita.
create or replace function public.visit_client_fields(p_template jsonb) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(f->>'id'), '{}')
  from jsonb_array_elements(p_template->'sections') s, jsonb_array_elements(s->'fields') f
  where s->>'who' = 'cliente' and f->>'type' <> 'computed';
$$;

-- Portale cliente: visita aperta da compilare (solo le sezioni del cliente).
create or replace function public.client_visit(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.clients; v public.visits;
begin
  if p_token is null or length(p_token) < 20 then return null; end if;
  select * into c from public.clients where portal_token = p_token and archived_at is null;
  if c.id is null then return null; end if;
  select * into v from public.visits
   where client_id = c.id and status = 'da_compilare' order by visit_date desc limit 1;
  if v.id is null then return null; end if;
  return jsonb_build_object(
    'id', v.id, 'kind', v.kind, 'visit_date', v.visit_date,
    'title', v.template->>'title',
    'sections', (select coalesce(jsonb_agg(s), '[]') from jsonb_array_elements(v.template->'sections') s
                 where s->>'who' = 'cliente'),
    'answers', (select coalesce(jsonb_object_agg(k, val), '{}') from jsonb_each(v.answers) e(k, val)
                where k = any(public.visit_client_fields(v.template))));
end $$;

-- Portale cliente: salva le risposte (bozza o invio finale). Accetta solo i campi del cliente.
create or replace function public.client_visit_submit(p_token text, p_visit_id uuid, p_answers jsonb, p_final boolean default false)
returns boolean language plpgsql security definer set search_path = public as $$
declare c public.clients; v public.visits; clean jsonb;
begin
  if p_token is null or length(p_token) < 20 or jsonb_typeof(p_answers) <> 'object' then return false; end if;
  select * into c from public.clients where portal_token = p_token and archived_at is null;
  if c.id is null then return false; end if;
  select * into v from public.visits where id = p_visit_id and client_id = c.id and status = 'da_compilare' for update;
  if v.id is null then return false; end if;
  select coalesce(jsonb_object_agg(k, val), '{}') into clean from jsonb_each(p_answers) e(k, val)
   where k = any(public.visit_client_fields(v.template)) and jsonb_typeof(val) = 'object';
  perform set_config('app.source', 'ui', true);
  update public.visits set answers = answers || clean,
         status = case when p_final then 'compilata_cliente' else status end,
         client_submitted_at = case when p_final then now() else client_submitted_at end
   where id = v.id;
  if p_final then
    insert into public.notifications(type, title, body, client_id)
    values ('visita_compilata', 'Modulo visita compilato — ' || c.first_name || ' ' || c.last_name,
            'Il cliente ha compilato il modulo del ' || to_char(v.visit_date, 'DD/MM/YYYY') || '. Completa misure e appunti.', c.id);
  end if;
  return true;
end $$;

-- Automazione giornaliera: per ogni cliente con percorso attivo, quando il check è in scadenza
-- crea la visita "check" dal modello predefinito (così il cliente la trova nel portale) e avvisa il coach.
create or replace function public.run_visit_automations() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.visit_templates; n int := 0;
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'forbidden'; end if;
  select * into t from public.visit_templates where is_default limit 1;
  if t.id is null then return jsonb_build_object('visits_created', 0); end if;
  perform set_config('app.source', 'cron', true);
  with due as (
    select o.client_id, o.first_name, o.last_name, o.next_due from public.visit_overview o
    where o.archived_at is null and o.visit_state in ('in_scadenza','scaduta')
      and exists (select 1 from public.programs p where p.client_id = o.client_id
                  and p.manual_status is null and p.end_date >= current_date)
  ), ins as (
    insert into public.visits(client_id, template_id, kind, template, visit_date)
    select d.client_id, t.id, 'check', t.body->'kinds'->'check', greatest(d.next_due, current_date) from due d
    returning client_id, visit_date
  )
  insert into public.notifications(type, title, body, client_id)
  select 'visita_in_scadenza', 'Check in scadenza — ' || d.first_name || ' ' || d.last_name,
         'Check di monitoraggio previsto per il ' || to_char(i.visit_date, 'DD/MM/YYYY') || '. Il modulo è nel portale del cliente.',
         i.client_id
  from ins i join due d on d.client_id = i.client_id;
  get diagnostics n = row_count;
  return jsonb_build_object('visits_created', n, 'ran_at', now());
end $$;

revoke execute on function public.visit_client_fields(jsonb) from public, anon, authenticated;
revoke all on function public.client_visit(text), public.client_visit_submit(text, uuid, jsonb, boolean) from public;
grant execute on function public.client_visit(text), public.client_visit_submit(text, uuid, jsonb, boolean) to anon, authenticated;
revoke execute on function public.run_visit_automations() from public, anon;
grant execute on function public.run_visit_automations() to authenticated;

select cron.schedule('rf-visit-automations', '5 6 * * *', 'select public.run_visit_automations()');
