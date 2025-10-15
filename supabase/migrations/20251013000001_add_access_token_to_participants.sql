-- Migration: Add access_token to participants table
-- Description: Adds access_token field to participants table for unregistered user access
-- This allows unregistered participants to access their Secret Santa results via unique link

-- Add access_token column
-- Using TEXT type for UUID-based tokens
-- NOT NULL with default ensures all participants get a token
alter table public.participants
    add column access_token text not null default gen_random_uuid()::text;

-- Create unique index for access_token (for fast lookup and uniqueness)
create unique index participants_access_token_idx on public.participants(access_token);

-- Generate tokens for existing participants (if any)
-- This backfills tokens for participants created before this migration
update public.participants
    set access_token = gen_random_uuid()::text
    where access_token is null;

-- Add comment
comment on column public.participants.access_token is 'Unique access token for unregistered participants to view their Secret Santa results';
