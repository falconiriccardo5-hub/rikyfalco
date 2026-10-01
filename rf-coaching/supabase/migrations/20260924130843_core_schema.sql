create extension if not exists pgcrypto;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  phone text,
  role text not null default 'none' check (role in ('admin','client','none')),
  client_id uuid,
  created_at timestamptz not null default now()
);
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  birth_date date,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add constraint profiles_client_fk foreign key (client_id) references public.clients(id) on delete set null;
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  type text not null check (type in ('live','online','misto')),
  duration text not null check (duration in ('3m','6m','12m','10l')),
  start_date date not null,
  end_date date not null,
  total_price numeric(10,2) not null default 0,
  lessons_total int not null default 0,
  lessons_completed int not null default 0 check (lessons_completed >= 0),
  installments int not null default 1 check (installments between 1 and 24),
  payment_method text not null default 'bonifico' check (payment_method in ('bonifico','contanti','carta','paypal','altro')),
  manual_status text check (manual_status in ('sospeso','terminato')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index on public.programs(client_id);
create index on public.programs(end_date);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  due_date date not null,
  paid_date date,
  paid_amount numeric(10,2),
  method text check (method in ('bonifico','contanti','carta','paypal','altro')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.payments(client_id);
create index on public.payments(due_date);
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  type text not null default 'allenamento' check (type in ('allenamento','consulenza','check','altro')),
  notes text,
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.appointments(starts_at);
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete cascade,
  type text not null check (type in ('rinnovo','rata','scadenza','pagamento_scaduto')),
  scheduled_at date not null,
  status text not null default 'aperto' check (status in ('aperto','gestito','annullato')),
  created_at timestamptz not null default now()
);
create unique index reminders_dedupe on public.reminders(type, coalesce(program_id,'00000000-0000-0000-0000-000000000000'::uuid), coalesce(payment_id,'00000000-0000-0000-0000-000000000000'::uuid));
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('pagamento_scaduto','pagamento_in_arrivo','percorso_in_scadenza','nuovo_appuntamento','pagamento_ricevuto','sistema')),
  title text not null,
  body text,
  client_id uuid references public.clients(id) on delete cascade,
  reminder_id uuid references public.reminders(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.email_templates (
  key text primary key check (key in ('rata','rinnovo','scadenza','manuale')),
  subject text not null,
  body text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  type text not null,
  to_email text,
  subject text,
  sent_at timestamptz,
  status text not null check (status in ('inviata','errore','non_configurato')),
  error text,
  created_at timestamptz not null default now()
);
create table public.settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
create table public.integrations (
  provider text primary key,
  account_email text,
  encrypted_refresh_token text,
  scopes text[],
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);
create table public.backups (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'manuale',
  status text not null check (status in ('in_corso','completato','errore')),
  destination text,
  file_ref text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid,
  source text not null default 'ui',
  action text not null,
  entity text not null,
  entity_id uuid,
  client_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs(created_at desc);
create index on public.audit_logs(client_id);
