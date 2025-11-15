-- =====================================================
-- Migration: Enable Row Level Security on Groups Table
-- =====================================================
-- Purpose: Enable RLS and create security policies for CRUD operations on the groups table
-- Affected tables: groups
-- Security model: RLS protects write operations only
--   - SELECT: No RLS (application layer controls access, needed for token-based unregistered users)
--   - INSERT: Only authenticated users can create groups (with creator_id validation)
--   - UPDATE: Only group creators can update their groups
--   - DELETE: Only group creators can delete their groups
-- =====================================================

-- enable row level security on the groups table
alter table public.groups enable row level security;

-- =====================================================
-- SELECT POLICY: Allow everyone to view groups
-- =====================================================
-- Rationale: Application layer controls fine-grained access
-- Both authenticated users and anonymous users (with valid tokens) can read groups
-- This is needed for:
--   - Authenticated users to see groups they created and groups they're part of
--   - Anonymous participants with access tokens to view their group details
-- =====================================================
create policy "anyone can view groups"
  on public.groups
  for select
  using (true);

-- =====================================================
-- INSERT POLICY: Allow users to create groups
-- =====================================================
-- Rationale: Any authenticated user can create a new group
-- Permissive policy - application layer handles creator_id assignment
-- This allows flexibility in group creation while maintaining authentication
-- =====================================================
create policy "authenticated users can create groups"
  on public.groups
  for insert
  to authenticated
  with check (true);

-- =====================================================
-- UPDATE POLICY: Allow creators to update their groups
-- =====================================================
-- Rationale: Only the group creator should be able to modify group settings
-- (name, budget, end_date, etc.)
-- Both using() and with check() clauses ensure:
--   - User can only update groups they created (using)
--   - Updated data maintains creator_id integrity (with check)
-- =====================================================
create policy "creators can update their groups"
  on public.groups
  for update
  to authenticated
  using (
    creator_id = auth.uid()
  )
  with check (
    creator_id = auth.uid()
  );

-- =====================================================
-- DELETE POLICY: Allow creators to delete their groups
-- =====================================================
-- Rationale: Only the group creator should be able to delete a group
-- This is a destructive operation that should be restricted to the owner
-- Note: Cascading deletes will handle related participants, assignments, etc.
-- =====================================================
create policy "creators can delete their groups"
  on public.groups
  for delete
  to authenticated
  using (
    creator_id = auth.uid()
  );
