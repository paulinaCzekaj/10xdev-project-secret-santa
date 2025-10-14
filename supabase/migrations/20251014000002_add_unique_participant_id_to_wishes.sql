-- Migration: Add unique constraint to wishes.participant_id
-- Description: Adds a unique constraint to ensure one wishlist per participant
-- This is required for upsert operations with onConflict

-- First, remove any duplicate entries (keep the most recent one)
DELETE FROM public.wishes
WHERE id NOT IN (
    SELECT DISTINCT ON (participant_id) id
    FROM public.wishes
    ORDER BY participant_id, updated_at DESC
);

-- Add unique constraint
ALTER TABLE public.wishes
ADD CONSTRAINT wishes_participant_id_unique UNIQUE (participant_id);

COMMENT ON CONSTRAINT wishes_participant_id_unique ON public.wishes IS 'Ensures one wishlist per participant';
