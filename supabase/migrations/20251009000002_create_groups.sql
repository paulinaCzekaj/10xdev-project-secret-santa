-- Migration: Create groups table
-- Description: Creates the groups table with RLS policies and necessary indexes
-- This table stores Secret Santa groups created by users

-- Create groups table
create table public.groups (
    id bigserial primary key,
    name text not null,
    budget numeric not null check (budget > 0),
    end_date timestamptz not null,
    creator_id uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create indexes
create index groups_creator_id_idx on public.groups(creator_id);
create index groups_end_date_idx on public.groups(end_date);

-- Create updated_at trigger
create trigger handle_groups_updated_at
    before update on public.groups
    for each row
    execute procedure public.handle_updated_at();

-- Enable RLS
-- DISABLED FOR DEVELOPMENT: alter table public.groups enable row level security;

-- Create policies

-- Policy: Creators can do everything with their own groups
-- DISABLED FOR DEVELOPMENT:
-- create policy "Creators have full access to their groups"
--     on public.groups
--     for all
--     to authenticated
--     using (auth.uid() = creator_id)
--     with check (auth.uid() = creator_id);

-- Grant access
grant usage on sequence public.groups_id_seq to authenticated;
grant all on public.groups to authenticated;

comment on table public.groups is 'Secret Santa groups created by users';
comment on column public.groups.name is 'Name of the Secret Santa group';
comment on column public.groups.budget is 'Budget limit for gifts in the group';
comment on column public.groups.end_date is 'Deadline for the Secret Santa event';
comment on column public.groups.creator_id is 'Reference to the user who created the group';
