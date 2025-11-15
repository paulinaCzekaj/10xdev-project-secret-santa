import { useState, useCallback } from "react";

interface UseRevealAnimationOptions {
  isRevealed: boolean;
  onRevealComplete: () => void;
  animationDuration?: number;
}

/**
 * Hook for managing the animation of the result discovery
 *
 * @param isRevealed - Whether the result is already revealed
 * @param onRevealComplete - Callback called after the animation completes
 * @param animationDuration - Duration of the animation in ms (default 800ms)
 * @returns Object with the animation state and function to start it
 *
 * @example
 * const { isAnimating, startAnimation } = useRevealAnimation({
 *   isRevealed: false,
 *   onRevealComplete: () => console.log('Revealed!'),
 *   animationDuration: 800
 * });
 */
export const useRevealAnimation = ({
  isRevealed,
  onRevealComplete,
  animationDuration = 800,
}: UseRevealAnimationOptions) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const startAnimation = useCallback(() => {
    // Guard: do not start animation if already revealed or animation is in progress
    if (isRevealed || isAnimating) return;

    setIsAnimating(true);

    const timer = setTimeout(() => {
      onRevealComplete();
      setIsAnimating(false);
    }, animationDuration);

    // Cleanup function (returned for potential use in useEffect hook)
    return () => clearTimeout(timer);
  }, [isRevealed, isAnimating, onRevealComplete, animationDuration]);

  return {
    isAnimating,
    startAnimation,
  };
};
