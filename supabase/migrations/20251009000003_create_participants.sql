-- Migration: Create participants table
-- Description: Creates the participants table with RLS policies and necessary indexes
-- This table stores both registered and unregistered participants of Secret Santa groups

-- Enable citext extension for case-insensitive email handling
create extension if not exists citext;

-- Create participants table
create table public.participants (
    id bigserial primary key,
    group_id bigint not null references public.groups(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    name text not null,
    email citext,
    created_at timestamptz not null default now()
);

-- Create indexes
create index participants_group_id_idx on public.participants(group_id);
create index participants_user_id_idx on public.participants(user_id);

-- Create partial unique index for email uniqueness within a group
create unique index unique_participant_email_per_group 
    on public.participants(group_id, email) 
    where email is not null;

-- Enable RLS
-- DISABLED FOR DEVELOPMENT: alter table public.participants enable row level security;

-- Create policies

-- Policy: Group creators can manage all participants in their groups
-- DISABLED FOR DEVELOPMENT:
-- create policy "Group creators can manage participants"
--     on public.participants
--     for all
--     to authenticated
--     using (
--         exists (
--             select 1 
--             from public.groups 
--             where 
--                 id = public.participants.group_id 
--                 and creator_id = auth.uid()
--         )
--     )
--     with check (
--         exists (
--             select 1 
--             from public.groups 
--             where 
--                 id = public.participants.group_id 
--                 and creator_id = auth.uid()
--         )
--     );

-- Policy: Users can view their own participant records
-- DISABLED FOR DEVELOPMENT:
-- create policy "Users can view their own participant records"
--     on public.participants
--     for select
--     to authenticated
--     using (user_id = auth.uid());

-- Policy: Users can view other participants in groups they're in
-- DISABLED FOR DEVELOPMENT:
-- create policy "Users can view participants in their groups"
--     on public.participants
--     for select
--     to authenticated
--     using (
--         exists (
--             select 1 
--             from public.participants as my_participation
--             where 
--                 my_participation.group_id = public.participants.group_id 
--                 and my_participation.user_id = auth.uid()
--         )
--     );

-- Add policy to groups table now that participants exists
-- DISABLED FOR DEVELOPMENT:
-- create policy "Participants can view their groups"
--     on public.groups
--     for select
--     to authenticated
--     using (
--         exists (
--             select 1 
--             from public.participants 
--             where 
--                 group_id = public.groups.id 
--                 and user_id = auth.uid()
--         )
--     );

-- Grant access
grant usage on sequence public.participants_id_seq to authenticated;
grant all on public.participants to authenticated;

comment on table public.participants is 'Participants in Secret Santa groups, both registered and unregistered';
comment on column public.participants.group_id is 'Reference to the Secret Santa group';
comment on column public.participants.user_id is 'Optional reference to registered user account';
comment on column public.participants.name is 'Display name of the participant';
comment on column public.participants.email is 'Optional email for unregistered participants';
