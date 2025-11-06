-- Migration: Add AI generation tracking to wishes table
-- Description: Adds columns for tracking AI-generated wishlists and rate limiting
-- This enables proper monitoring and limiting of AI usage per participant per group

-- Add columns to wishes table
ALTER TABLE public.wishes
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_generation_count_per_group INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_last_generated_at TIMESTAMPTZ;

-- Add index for rate limiting queries (participant_id + count)
CREATE INDEX IF NOT EXISTS idx_wishes_ai_generation_count
ON public.wishes(participant_id, ai_generation_count_per_group);

-- Add comment to new columns
COMMENT ON COLUMN public.wishes.ai_generated IS 'Whether this wishlist was generated using AI';
COMMENT ON COLUMN public.wishes.ai_generation_count_per_group IS 'Number of AI generations used by this participant in their group';
COMMENT ON COLUMN public.wishes.ai_last_generated_at IS 'Timestamp of the last AI generation for this participant';

-- Create function for atomic increment of AI generation count
CREATE OR REPLACE FUNCTION increment_ai_generation_count(p_participant_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.wishes
  SET
    ai_generation_count_per_group = COALESCE(ai_generation_count_per_group, 0) + 1,
    ai_last_generated_at = NOW(),
    ai_generated = TRUE
  WHERE participant_id = p_participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_ai_generation_count TO authenticated, anon;

-- Add comment to function
COMMENT ON FUNCTION increment_ai_generation_count IS 'Atomically increments the AI generation count for a participant and updates the timestamp';
