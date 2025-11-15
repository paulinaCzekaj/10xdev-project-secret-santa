-- Migration: Enable Row Level Security policies on all tables
-- Description: Enables RLS and creates comprehensive security policies for all CRUD operations
-- Affected tables: groups, participants, exclusion_rules, wishes, assignments
-- Security considerations: Implements granular access control based on user roles and group membership

-- ===========================================
-- GROUPS TABLE POLICIES
-- ===========================================

-- Enable RLS on groups table
alter table public.groups enable row level security;

-- Policy: Authenticated users can view groups they created or participate in
create policy "Users can view their groups"
    on public.groups
    for select
    to authenticated
    using (
        creator_id = auth.uid() or
        exists (
            select 1 from public.participants
            where participants.group_id = groups.id
            and participants.user_id = auth.uid()
        )
    );

-- Policy: Authenticated users can create groups
create policy "Users can create groups"
    on public.groups
    for insert
    to authenticated
    with check (creator_id = auth.uid());

-- Policy: Only group creators can update their groups
create policy "Creators can update their groups"
    on public.groups
    for update
    to authenticated
    using (creator_id = auth.uid())
    with check (creator_id = auth.uid());

-- Policy: Only group creators can delete their groups
create policy "Creators can delete their groups"
    on public.groups
    for delete
    to authenticated
    using (creator_id = auth.uid());

-- ===========================================
-- PARTICIPANTS TABLE POLICIES
-- ===========================================

-- Enable RLS on participants table
alter table public.participants enable row level security;

-- Policy: Users can view participants in groups they are part of (including themselves)
create policy "Users can view participants in their groups"
    on public.participants
    for select
    to authenticated
    using (
        user_id = auth.uid() or
        exists (
            select 1 from public.participants p2
            where p2.group_id = participants.group_id
            and p2.user_id = auth.uid()
        )
    );

-- Policy: Group creators can add participants to their groups
create policy "Group creators can add participants"
    on public.participants
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.groups
            where groups.id = participants.group_id
            and groups.creator_id = auth.uid()
        )
    );

-- Policy: Group creators can update participants in their groups
create policy "Group creators can update participants"
    on public.participants
    for update
    to authenticated
    using (
        exists (
            select 1 from public.groups
            where groups.id = participants.group_id
            and groups.creator_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.groups
            where groups.id = participants.group_id
            and groups.creator_id = auth.uid()
        )
    );

-- Policy: Group creators can delete participants from their groups
create policy "Group creators can delete participants"
    on public.participants
    for delete
    to authenticated
    using (
        exists (
            select 1 from public.groups
            where groups.id = participants.group_id
            and groups.creator_id = auth.uid()
        )
    );

-- ===========================================
-- EXCLUSION_RULES TABLE POLICIES
-- ===========================================

-- Enable RLS on exclusion_rules table
alter table public.exclusion_rules enable row level security;

-- Policy: Users can view exclusion rules in groups they participate in
create policy "Users can view exclusion rules in their groups"
    on public.exclusion_rules
    for select
    to authenticated
    using (
        exists (
            select 1 from public.participants
            where participants.group_id = exclusion_rules.group_id
            and participants.user_id = auth.uid()
        )
    );

-- Policy: Group creators can create exclusion rules for their groups
create policy "Group creators can create exclusion rules"
    on public.exclusion_rules
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.groups
            where groups.id = exclusion_rules.group_id
            and groups.creator_id = auth.uid()
        )
    );

-- Policy: Group creators can update exclusion rules in their groups
create policy "Group creators can update exclusion rules"
    on public.exclusion_rules
    for update
    to authenticated
    using (
        exists (
            select 1 from public.groups
            where groups.id = exclusion_rules.group_id
            and groups.creator_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.groups
            where groups.id = exclusion_rules.group_id
            and groups.creator_id = auth.uid()
        )
    );

-- Policy: Group creators can delete exclusion rules from their groups
create policy "Group creators can delete exclusion rules"
    on public.exclusion_rules
    for delete
    to authenticated
    using (
        exists (
            select 1 from public.groups
            where groups.id = exclusion_rules.group_id
            and groups.creator_id = auth.uid()
        )
    );

-- ===========================================
-- WISHES TABLE POLICIES
-- ===========================================

-- Enable RLS on wishes table
alter table public.wishes enable row level security;

-- Policy: Users can view wishes in groups they participate in
create policy "Users can view wishes in their groups"
    on public.wishes
    for select
    to authenticated
    using (
        exists (
            select 1 from public.participants
            where participants.id = wishes.participant_id
            and exists (
                select 1 from public.participants p2
                where p2.group_id = participants.group_id
                and p2.user_id = auth.uid()
            )
        )
    );

-- Policy: Users can create wishes for themselves
create policy "Users can create their own wishes"
    on public.wishes
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.participants
            where participants.id = wishes.participant_id
            and participants.user_id = auth.uid()
        )
    );

-- Policy: Users can update their own wishes
create policy "Users can update their own wishes"
    on public.wishes
    for update
    to authenticated
    using (
        exists (
            select 1 from public.participants
            where participants.id = wishes.participant_id
            and participants.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.participants
            where participants.id = wishes.participant_id
            and participants.user_id = auth.uid()
        )
    );

-- Policy: Users can delete their own wishes
create policy "Users can delete their own wishes"
    on public.wishes
    for delete
    to authenticated
    using (
        exists (
            select 1 from public.participants
            where participants.id = wishes.participant_id
            and participants.user_id = auth.uid()
        )
    );

-- ===========================================
-- ASSIGNMENTS TABLE POLICIES
-- ===========================================

-- Enable RLS on assignments table
alter table public.assignments enable row level security;

-- Policy: Users can view assignments for groups they participate in
create policy "Users can view assignments for their groups"
    on public.assignments
    for select
    to authenticated
    using (
        exists (
            select 1 from public.participants
            where participants.group_id = assignments.group_id
            and participants.user_id = auth.uid()
        )
    );

-- Policy: Only service role can create assignments (draw results)
-- This prevents users from manually creating assignments
create policy "Service role can create assignments"
    on public.assignments
    for insert
    to service_role
    with check (true);

-- Policy: Only service role can update assignments
create policy "Service role can update assignments"
    on public.assignments
    for update
    to service_role
    using (true)
    with check (true);

-- Policy: Only service role can delete assignments
create policy "Service role can delete assignments"
    on public.assignments
    for delete
    to service_role
    using (true);

-- ===========================================
-- UPDATE TABLE COMMENTS
-- ===========================================

-- Remove warning comments since RLS is now properly configured
comment on table public.groups is 'Secret Santa groups with RLS enabled';
comment on table public.participants is 'Group participants with RLS enabled';
comment on table public.exclusion_rules is 'Exclusion rules between participants with RLS enabled';
comment on table public.wishes is 'Participant wishlists with RLS enabled';
comment on table public.assignments is 'Secret Santa draw results with RLS enabled';
