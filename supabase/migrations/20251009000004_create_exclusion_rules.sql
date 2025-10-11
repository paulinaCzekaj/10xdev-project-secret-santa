-- Migration: Create exclusion_rules table
-- Description: Creates the exclusion_rules table with RLS policies and necessary indexes
-- This table stores rules about which participants cannot be matched with each other

-- Create exclusion_rules table
create table public.exclusion_rules (
    id bigserial primary key,
    group_id bigint not null references public.groups(id) on delete cascade,
    blocker_participant_id bigint not null references public.participants(id) on delete cascade,
    blocked_participant_id bigint not null references public.participants(id) on delete cascade,
    created_at timestamptz not null default now(),
    
    -- Ensure blocker and blocked are different participants
    constraint different_participants check (blocker_participant_id != blocked_participant_id),
    
    -- Ensure unique rules per group
    constraint unique_exclusion_rule unique (group_id, blocker_participant_id, blocked_participant_id)
);

-- Create indexes
create index exclusion_rules_group_id_idx on public.exclusion_rules(group_id);
create index exclusion_rules_blocker_participant_id_idx on public.exclusion_rules(blocker_participant_id);
create index exclusion_rules_blocked_participant_id_idx on public.exclusion_rules(blocked_participant_id);

-- Enable RLS
-- DISABLED FOR DEVELOPMENT: alter table public.exclusion_rules enable row level security;

-- Create policies

-- Policy: Group creators can manage exclusion rules
-- DISABLED FOR DEVELOPMENT:
-- create policy "Group creators can manage exclusion rules"
--     on public.exclusion_rules
--     for all
--     to authenticated
--     using (
--         exists (
--             select 1 
--             from public.groups 
--             where 
--                 id = public.exclusion_rules.group_id 
--                 and creator_id = auth.uid()
--         )
--     )
--     with check (
--         exists (
--             select 1 
--             from public.groups 
--             where 
--                 id = public.exclusion_rules.group_id 
--                 and creator_id = auth.uid()
--         )
--     );

-- Policy: Participants can view exclusion rules in their groups
-- DISABLED FOR DEVELOPMENT:
-- create policy "Participants can view exclusion rules in their groups"
--     on public.exclusion_rules
--     for select
--     to authenticated
--     using (
--         exists (
--             select 1 
--             from public.participants 
--             where 
--                 group_id = public.exclusion_rules.group_id 
--                 and user_id = auth.uid()
--         )
--     );

-- Grant access
grant usage on sequence public.exclusion_rules_id_seq to authenticated;
grant all on public.exclusion_rules to authenticated;

comment on table public.exclusion_rules is 'Rules defining which participants cannot be matched with each other';
comment on column public.exclusion_rules.group_id is 'Reference to the Secret Santa group';
comment on column public.exclusion_rules.blocker_participant_id is 'Participant who cannot give a gift to the blocked participant';
comment on column public.exclusion_rules.blocked_participant_id is 'Participant who cannot receive a gift from the blocker participant';
