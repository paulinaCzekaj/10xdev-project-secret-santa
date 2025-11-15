import { useState, useEffect, useCallback } from "react";

interface UseConfettiOptions {
  duration?: number;
  colors?: string[];
  numberOfPieces?: number;
  gravity?: number;
}

/**
 * Hook for managing the confetti effect
 *
 * Handles displaying the confetti animation with automatic disabling after a specified time.
 * Tracks the window dimensions for responsive animation.
 * SSR-safe - checks for the availability of window before using it.
 *
 * @param duration - Duration of the confetti display in ms (default 3000ms)
 * @param colors - Array of confetti colors
 * @param numberOfPieces - Number of confetti pieces
 * @param gravity - Gravity for the confetti
 * @returns Object with the triggerConfetti function and the component to render
 *
 * @example
 * const { showConfetti, triggerConfetti, windowSize, confettiConfig } = useConfetti({
 *   duration: 3000,
 *   colors: ['#dc2626', '#16a34a']
 * });
 *
 * // In the component, render the confetti using showConfetti and config
 */
export const useConfetti = ({
  duration = 3000,
  colors = ["#dc2626", "#16a34a", "#fbbf24", "#ef4444", "#22c55e"],
  numberOfPieces = 300,
  gravity = 0.3,
}: UseConfettiOptions = {}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Handle window resize - SSR-safe
  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateSize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };

      updateSize();
      window.addEventListener("resize", updateSize);

      return () => window.removeEventListener("resize", updateSize);
    }
  }, []);

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);

    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  return {
    showConfetti,
    triggerConfetti,
    windowSize,
    confettiConfig: {
      numberOfPieces,
      gravity,
      colors,
    },
  };
};
