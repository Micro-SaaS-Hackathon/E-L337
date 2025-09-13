-- Migration script to change task assignment system
-- Tasks are now assigned to teams (not individuals)
-- Subtasks are assigned to individual team members

-- First, let's modify the tasks table to remove individual assignments
-- since tasks will be assigned to teams (via team_id which already exists)
ALTER TABLE public.tasks DROP COLUMN IF EXISTS assigned_to;

-- Add a new table for subtask assignments to individual team members
CREATE TABLE IF NOT EXISTS public.subtask_assignments (
  id uuid not null default gen_random_uuid(),
  subtask_id uuid not null,
  assigned_to uuid not null,
  assigned_by uuid not null,
  assigned_at timestamp with time zone null default now(),
  constraint subtask_assignments_pkey primary key (id),
  constraint subtask_assignments_subtask_id_fkey foreign key (subtask_id) references subtasks (id) on delete cascade,
  constraint subtask_assignments_assigned_to_fkey foreign key (assigned_to) references auth.users (id),
  constraint subtask_assignments_assigned_by_fkey foreign key (assigned_by) references auth.users (id),
  constraint subtask_assignments_unique unique (subtask_id, assigned_to)
) tablespace pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subtask_assignments_subtask_id ON public.subtask_assignments USING btree (subtask_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_subtask_assignments_assigned_to ON public.subtask_assignments USING btree (assigned_to) TABLESPACE pg_default;

-- Add assigned_to column to subtasks for direct assignment
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS assigned_to uuid;
ALTER TABLE public.subtasks ADD CONSTRAINT subtasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users (id);

-- Create index for subtasks assigned_to
CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON public.subtasks USING btree (assigned_to) TABLESPACE pg_default;

-- Drop the old task_assignments table since tasks are no longer assigned to individuals
DROP TABLE IF EXISTS public.task_assignments CASCADE;

-- Update any existing data if needed
-- Since we're removing assigned_to from tasks, any existing assignments will be lost
-- This is intentional as per the new assignment system

-- Add a status column to subtasks to track their progress
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'todo';
ALTER TABLE public.subtasks ADD CONSTRAINT subtasks_status_check CHECK (
  status = ANY (ARRAY['todo'::text, 'in-progress'::text, 'completed'::text])
);

-- Create index for subtask status
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON public.subtasks USING btree (status) TABLESPACE pg_default;

-- Add trigger to update subtasks updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger exists for subtasks
DROP TRIGGER IF EXISTS update_subtasks_updated_at ON subtasks;
CREATE TRIGGER update_subtasks_updated_at 
  BEFORE UPDATE ON subtasks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add a priority column to both tasks and subtasks for better organization
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check CHECK (
  priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])
);

ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE public.subtasks ADD CONSTRAINT subtasks_priority_check CHECK (
  priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])
);

-- Create indexes for priority columns
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks USING btree (priority) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_subtasks_priority ON public.subtasks USING btree (priority) TABLESPACE pg_default;

-- Add estimated hours columns for better project planning
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_hours integer;
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS estimated_hours integer;

-- Add actual hours columns for tracking
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS actual_hours integer;

-- Add deadline column to subtasks for individual deadline tracking
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS deadline timestamp with time zone;