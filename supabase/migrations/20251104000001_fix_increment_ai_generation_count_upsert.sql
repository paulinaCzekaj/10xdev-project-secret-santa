-- Migration: Fix increment_ai_generation_count to use UPSERT instead of UPDATE
-- FIX #7: Prevents silent failure when wishlist record doesn't exist yet
-- Description: Replaces UPDATE with INSERT ... ON CONFLICT to ensure record is created if needed
-- This fixes a critical bug where generation counter wouldn't increment for new wishlists

-- Drop existing function
DROP FUNCTION IF EXISTS increment_ai_generation_count(BIGINT);

-- Recreate function with UPSERT logic
-- FIX #7: Now uses INSERT ... ON CONFLICT instead of UPDATE
-- This ensures a wishes record is created if it doesn't exist, preventing silent failures
CREATE OR REPLACE FUNCTION increment_ai_generation_count(p_participant_id BIGINT)
RETURNS void AS $$
BEGIN
  -- Use UPSERT: Insert new record if doesn't exist, otherwise update
  INSERT INTO public.wishes (
    participant_id,
    wishlist,
    ai_generation_count_per_group,
    ai_last_generated_at,
    ai_generated,
    updated_at
  )
  VALUES (
    p_participant_id,
    '', -- Empty wishlist initially (user can fill it later)
    1,  -- First generation
    NOW(),
    TRUE,
    NOW()
  )
  ON CONFLICT (participant_id)
  DO UPDATE SET
    ai_generation_count_per_group = public.wishes.ai_generation_count_per_group + 1,
    ai_last_generated_at = NOW(),
    ai_generated = TRUE,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION increment_ai_generation_count TO authenticated, anon;

-- Update comment to reflect new behavior
COMMENT ON FUNCTION increment_ai_generation_count IS 'Atomically increments the AI generation count for a participant. Creates wishes record if it doesn''t exist (UPSERT). Prevents silent failures.';
