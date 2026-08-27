-- ============================================================
-- AUDIT LOG
-- Infraestrutura genérica de auditoria da aplicação.
-- ============================================================

create schema if not exists audit;

revoke all on schema audit from public;
revoke all on schema audit from anon;
revoke all on schema audit from authenticated;

grant usage on schema audit to service_role;


-- ============================================================
-- TABELA DE EVENTOS
-- ============================================================

create table if not exists audit.events (
  id uuid primary key default gen_random_uuid(),

  event_type text not null,

  outcome text not null,

  actor_user_id uuid null,

  resource_type text null,

  resource_id text null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint audit_events_event_type_length
    check (
      char_length(event_type)
      between 3 and 120
    ),

  constraint audit_events_outcome_valid
    check (
      outcome in (
        'success',
        'failure',
        'denied'
      )
    ),

  constraint audit_events_resource_type_length
    check (
      resource_type is null
      or char_length(resource_type) <= 100
    ),

  constraint audit_events_resource_id_length
    check (
      resource_id is null
      or char_length(resource_id) <= 200
    ),

  constraint audit_events_metadata_object
    check (
      jsonb_typeof(metadata) = 'object'
    ),

  constraint audit_events_metadata_size
    check (
      pg_column_size(metadata) <= 16384
    )
);


-- ============================================================
-- ÍNDICES
-- ============================================================

create index if not exists audit_events_created_at_idx
  on audit.events (created_at desc);

create index if not exists audit_events_actor_user_id_idx
  on audit.events (actor_user_id);

create index if not exists audit_events_event_type_idx
  on audit.events (event_type);

create index if not exists audit_events_resource_idx
  on audit.events (
    resource_type,
    resource_id
  );


-- ============================================================
-- RLS
-- ============================================================

alter table audit.events
  enable row level security;


-- ============================================================
-- PRIVILÉGIOS
--
-- anon/authenticated:
--   nenhum acesso
--
-- service_role:
--   SELECT para consultas administrativas
--   INSERT para registrar eventos
--
-- UPDATE / DELETE / TRUNCATE:
--   proibidos para a aplicação.
-- ============================================================

revoke all on table audit.events
  from public, anon, authenticated, service_role;

grant select, insert
  on table audit.events
  to service_role;


-- ============================================================
-- FUNÇÃO DE ESCRITA
-- ============================================================

create or replace function public.write_audit_event(
  p_event_type text,
  p_outcome text,
  p_actor_user_id uuid default null,
  p_resource_type text default null,
  p_resource_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_id uuid := gen_random_uuid();
begin

  insert into audit.events (
    id,
    event_type,
    outcome,
    actor_user_id,
    resource_type,
    resource_id,
    metadata
  )
  values (
    v_event_id,
    p_event_type,
    p_outcome,
    p_actor_user_id,
    p_resource_type,
    p_resource_id,
    coalesce(
      p_metadata,
      '{}'::jsonb
    )
  );

  return v_event_id;

end;
$$;


-- ============================================================
-- PERMISSÕES DA FUNÇÃO
-- ============================================================

revoke execute on function public.write_audit_event(
  text,
  text,
  uuid,
  text,
  text,
  jsonb
)
from public;

revoke execute on function public.write_audit_event(
  text,
  text,
  uuid,
  text,
  text,
  jsonb
)
from anon;

revoke execute on function public.write_audit_event(
  text,
  text,
  uuid,
  text,
  text,
  jsonb
)
from authenticated;

grant execute on function public.write_audit_event(
  text,
  text,
  uuid,
  text,
  text,
  jsonb
)
to service_role;


-- Atualiza o cache da Data API.
notify pgrst, 'reload schema';