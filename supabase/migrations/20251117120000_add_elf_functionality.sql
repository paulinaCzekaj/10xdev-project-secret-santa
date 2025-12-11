-- Migration: Add Elf functionality to Secret Santa
-- Version: 1.1.0
-- Date: 2025-11-17
-- Description: Adds elf_for_participant_id column to participants table
--              for assigning helper role and tracking elf access
-- Tables affected: participants
-- Columns added: elf_for_participant_id, elf_accessed_at
-- Constraints added: fk_elf_for_participant, different_elf_participant
-- Indexes added: unique_elf_assignment_per_group, participants_elf_for_idx, participants_elf_accessed_at_idx

begin;

-- Add elf_for_participant_id column to participants table
alter table participants
add column elf_for_participant_id bigint null;

-- Add foreign key constraint for elf relationship
alter table participants
add constraint fk_elf_for_participant
foreign key (elf_for_participant_id)
references participants(id)
on delete set null;

-- Add check constraint: participant cannot be elf for themselves
alter table participants
add constraint different_elf_participant
check (
  id != elf_for_participant_id
  or elf_for_participant_id is null
);

-- Add unique constraint: one participant can have max one elf per group (DEPRECATED - see migration for new constraint)
-- create unique index unique_elf_assignment_per_group
-- on participants(group_id, elf_for_participant_id)
-- where elf_for_participant_id is not null;

-- Add index for efficient elf lookups
create index participants_elf_for_idx
on participants(elf_for_participant_id);

-- Add column for tracking when elf accessed the result
alter table participants
add column elf_accessed_at timestamptz null;

-- Add index for elf access tracking
create index participants_elf_accessed_at_idx
on participants(elf_accessed_at);

-- Add comments explaining the elf relationship
comment on column participants.elf_for_participant_id is
  'id of the participant this user is helping as an elf. null if not an elf.';

comment on column participants.elf_accessed_at is
  'timestamp when the elf first accessed the result of the participant they are helping.';

commit;
