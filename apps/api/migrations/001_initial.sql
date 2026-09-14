create extension if not exists pgcrypto;

create table if not exists workspace (
  id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 1 and 120), created_at timestamptz not null default now()
);
create table if not exists app_user (
  id uuid primary key default gen_random_uuid(), email text not null unique, display_name text not null, password_hash text not null, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists workspace_member (
  workspace_id uuid not null references workspace(id) on delete cascade,
  user_id uuid not null references app_user(id) on delete cascade,
  role text not null check (role in ('Super Admin','Admin','Project Manager','Product Manager','QA Lead','QA Engineer','Developer','Viewer')),
  primary key (workspace_id,user_id)
);
create table if not exists entity_record (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspace(id) on delete cascade,
  project_id uuid, entity_type text not null check (entity_type in ('project','rfc','user-story','requirement','test-case','test-run','bug','document','comment','link')),
  title text not null, status text not null, payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references app_user(id), updated_by uuid not null references app_user(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists entity_workspace_type_updated on entity_record(workspace_id,entity_type,updated_at desc);
create index if not exists entity_project_updated on entity_record(project_id,updated_at desc);
create table if not exists audit_event (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspace(id) on delete cascade,
  actor_id uuid not null references app_user(id), entity_id uuid not null references entity_record(id) on delete cascade,
  action text not null, before jsonb, after jsonb, created_at timestamptz not null default now()
);
create index if not exists audit_entity_created on audit_event(entity_id,created_at desc);
