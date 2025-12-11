-- Migration: Update Elf relationship schema for 1:many support
-- Version: 1.1.1
-- Date: 2025-12-11
-- Description: Changes elf relationship so one elf can help multiple participants,
--              but each participant can still have only one elf. Changes column from
--              elf_for_participant_id to elf_participant_id with reversed meaning.
-- Tables affected: participants
-- Columns renamed: elf_for_participant_id -> elf_participant_id
-- Constraints modified: unique_participant_has_one_elf (created)
-- Indexes affected: participants_elf_participant_idx

begin;

-- Rename column from elf_for_participant_id to elf_participant_id
alter table participants
rename column elf_for_participant_id to elf_participant_id;

-- Remove old unique constraint that was wrong
drop index if exists unique_elf_assignment_per_group;

-- Remove old index
drop index if exists participants_elf_for_idx;

-- Add new unique constraint: one participant can have max one elf per group
-- This ensures each person has at most one elf
create unique index unique_participant_has_one_elf
on participants(group_id, id)
where elf_participant_id is not null;

-- Add new index for efficient elf lookups
create index participants_elf_participant_idx
on participants(elf_participant_id);

-- Update comments to reflect new relationship
comment on column participants.elf_participant_id is
  'id of the participant who is this person''s elf helper. One elf can help multiple participants, but each participant has at most one elf.';

commit;
