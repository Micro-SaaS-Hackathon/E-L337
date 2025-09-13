create table public.subtasks (
  id uuid not null default gen_random_uuid (),
  task_id uuid not null,
  title text not null,
  description text null,
  is_completed boolean null default false,
  position integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint subtasks_pkey primary key (id),
  constraint subtasks_task_id_fkey foreign KEY (task_id) references tasks (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_subtasks_task_id on public.subtasks using btree (task_id) TABLESPACE pg_default;

create index IF not exists idx_subtasks_position on public.subtasks using btree ("position") TABLESPACE pg_default;

create trigger update_subtasks_updated_at BEFORE
update on subtasks for EACH row
execute FUNCTION update_updated_at_column ();

create table public.task_assignments (
  id uuid not null default gen_random_uuid (),
  task_id uuid not null,
  assigned_to uuid not null,
  assigned_by uuid not null,
  assigned_at timestamp with time zone null default now(),
  constraint task_assignments_pkey primary key (id),
  constraint task_assignments_assigned_by_fkey foreign KEY (assigned_by) references auth.users (id),
  constraint task_assignments_assigned_to_fkey foreign KEY (assigned_to) references auth.users (id),
  constraint task_assignments_task_id_fkey foreign KEY (task_id) references tasks (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_task_assignments_task_id on public.task_assignments using btree (task_id) TABLESPACE pg_default;

create index IF not exists idx_task_assignments_assigned_to on public.task_assignments using btree (assigned_to) TABLESPACE pg_default;

create table public.tasks (
  id uuid not null default gen_random_uuid (),
  team_id uuid not null,
  title text not null,
  description text null,
  status text not null default 'todo'::text,
  assigned_to uuid null,
  deadline timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  position integer null default 0,
  tags text[] null default '{}'::text[],
  constraint tasks_pkey primary key (id),
  constraint tasks_assigned_to_fkey foreign KEY (assigned_to) references auth.users (id),
  constraint tasks_team_id_fkey foreign KEY (team_id) references teams (id) on delete CASCADE,
  constraint tasks_status_check check (
    (
      status = any (
        array[
          'todo'::text,
          'in-progress'::text,
          'completed'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_tasks_team_id on public.tasks using btree (team_id) TABLESPACE pg_default;

create index IF not exists idx_tasks_assigned_to on public.tasks using btree (assigned_to) TABLESPACE pg_default;

create index IF not exists idx_tasks_status on public.tasks using btree (status) TABLESPACE pg_default;

create index IF not exists idx_tasks_tags on public.tasks using gin (tags) TABLESPACE pg_default;

create trigger update_tasks_updated_at BEFORE
update on tasks for EACH row
execute FUNCTION update_updated_at_column ();

create table public.team_goals (
  id uuid not null default gen_random_uuid (),
  team_id uuid not null,
  goal_text text not null,
  created_by uuid not null,
  created_at timestamp with time zone null default now(),
  is_processed boolean null default false,
  constraint team_goals_pkey primary key (id),
  constraint team_goals_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint team_goals_team_id_fkey foreign KEY (team_id) references teams (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_team_goals_team_id on public.team_goals using btree (team_id) TABLESPACE pg_default;


create table public.team_members (
  team_id uuid not null,
  user_id uuid not null,
  role text not null default 'member'::text,
  joined_at timestamp with time zone not null default now(),
  constraint team_members_pkey primary key (team_id, user_id),
  constraint team_members_team_id_fkey foreign KEY (team_id) references teams (id) on delete CASCADE,
  constraint team_members_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint team_members_role_check check (
    (
      role = any (
        array['owner'::text, 'admin'::text, 'member'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_team_members_user_id on public.team_members using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_team_members_team_id on public.team_members using btree (team_id) TABLESPACE pg_default;

create table public.teams (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  created_by uuid null,
  created_at timestamp with time zone not null default now(),
  tech_stack jsonb null,
  constraint teams_pkey primary key (id),
  constraint teams_name_key unique (name),
  constraint teams_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_teams_tech_stack on public.teams using gin (tech_stack) TABLESPACE pg_default;

create trigger on_team_created
after INSERT on teams for EACH row
execute FUNCTION handle_new_team ();
