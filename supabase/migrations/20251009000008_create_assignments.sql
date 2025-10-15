-- Migration: Create assignments table
-- Description: Creates the assignments table for storing Secret Santa draw results
-- This table stores which participant (giver) should buy a gift for which other participant (receiver)

-- Create assignments table
create table public.assignments (
    id bigserial primary key,
    group_id bigint not null references public.groups(id) on delete cascade,
    giver_participant_id bigint not null references public.participants(id) on delete cascade,
    receiver_participant_id bigint not null references public.participants(id) on delete cascade,
    created_at timestamptz not null default now(),

    -- Each participant can only have ONE assignment per group (one person to buy for)
    constraint unique_giver_per_group unique(group_id, giver_participant_id),

    -- A participant cannot be assigned to themselves (no self-gifting)
    constraint no_self_assignment check(giver_participant_id != receiver_participant_id)
);

-- Create indexes for performance
create index assignments_group_id_idx on public.assignments(group_id);
create index assignments_giver_idx on public.assignments(giver_participant_id);
create index assignments_receiver_idx on public.assignments(receiver_participant_id);

-- Enable RLS
-- DISABLED FOR DEVELOPMENT: alter table public.assignments enable row level security;

-- Create policies
-- Policy: Users can view assignments for groups they are part of
-- DISABLED FOR DEVELOPMENT:
-- create policy "Users can view assignments for their groups"
--     on public.assignments
--     for select
--     to authenticated
--     using (
--         exists (
--             select 1 from public.participants
--             where participants.group_id = assignments.group_id
--             and participants.user_id = auth.uid()
--         )
--     );

-- Grant access
grant usage on sequence public.assignments_id_seq to authenticated;
grant all on public.assignments to authenticated;

-- Add table and column comments
comment on table public.assignments is 'Stores Secret Santa draw results. Each row represents a giver-receiver pair.';
comment on column public.assignments.group_id is 'Reference to the Secret Santa group this assignment belongs to';
comment on column public.assignments.giver_participant_id is 'Participant who will give the gift (the "Santa")';
comment on column public.assignments.receiver_participant_id is 'Participant who will receive the gift';
comment on column public.assignments.created_at is 'Timestamp when the assignment was created (when draw was performed)';
