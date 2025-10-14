-- Migration: Add result_viewed_at to participants table
-- Description: Adds result_viewed_at field to track when participants view their Secret Santa results
-- This allows showing status "Zobaczył"/"Nie zobaczył" in the group view

-- Add result_viewed_at column
-- Using TIMESTAMPTZ type for timestamp with timezone
-- NULL by default - indicates participant hasn't viewed their result yet
alter table public.participants
    add column result_viewed_at timestamptz null;

-- Create index for performance (optional, but good for filtering)
create index participants_result_viewed_at_idx on public.participants(result_viewed_at);

-- Add comment
comment on column public.participants.result_viewed_at is 'Timestamp when the participant viewed their Secret Santa result. NULL if not viewed yet.';
