-- Migration: Disable all existing policies
-- Description: Drops all RLS policies from groups, participants, exclusion_rules, and wishes tables

-- Drop policies from groups table
drop policy if exists "Creators have full access to their groups" on public.groups;
drop policy if exists "Participants can view their groups" on public.groups;

-- Drop policies from participants table
drop policy if exists "Group creators can manage participants" on public.participants;
drop policy if exists "Users can view their own participant records" on public.participants;
drop policy if exists "Users can view participants in their groups" on public.participants;

-- Drop policies from exclusion_rules table
drop policy if exists "Group creators can manage exclusion rules" on public.exclusion_rules;
drop policy if exists "Participants can view exclusion rules in their groups" on public.exclusion_rules;

-- Drop policies from wishes table
drop policy if exists "Group creators can view all wishes" on public.wishes;
drop policy if exists "Participants can manage their own wishes" on public.wishes;
drop policy if exists "Participants can view wishes in their groups" on public.wishes;

-- Note: RLS remains enabled on all tables, but no policies are active
comment on table public.groups is 'Warning: RLS policies have been disabled for this table';
comment on table public.participants is 'Warning: RLS policies have been disabled for this table';
comment on table public.exclusion_rules is 'Warning: RLS policies have been disabled for this table';
comment on table public.wishes is 'Warning: RLS policies have been disabled for this table';
