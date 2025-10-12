-- Migration: Add indexes for GET /api/groups endpoint optimization
-- Description: Creates additional indexes to optimize the groups list endpoint
-- This migration adds indexes for sorting by created_at and composite index for participants

-- Index for sorting groups by created_at (descending order)
-- Used in: GroupService.listGroups() for ORDER BY created_at DESC
create index if not exists idx_groups_created_at_desc
    on public.groups(created_at desc);

-- Composite index for efficient filtering participants by group_id and user_id
-- Used in: GroupService.listGroups() for checking if user is participant
-- This optimizes the JOIN operation between groups and participants
create index if not exists idx_participants_group_user
    on public.participants(group_id, user_id);

-- Add comments
comment on index idx_groups_created_at_desc is 'Optimizes sorting groups by creation date in descending order';
comment on index idx_participants_group_user is 'Optimizes participant lookup by group and user for access control checks';
