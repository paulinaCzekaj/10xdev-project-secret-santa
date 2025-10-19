import { useState, useCallback } from "react";

interface UseRevealAnimationOptions {
  isRevealed: boolean;
  onRevealComplete: () => void;
  animationDuration?: number;
}

/**
 * Hook do zarządzania animacją odkrycia wyniku losowania
 *
 * @param isRevealed - Czy wynik jest już odkryty
 * @param onRevealComplete - Callback wywoływany po zakończeniu animacji
 * @param animationDuration - Czas trwania animacji w ms (domyślnie 800ms)
 * @returns Obiekt z stanem animacji i funkcją do jej rozpoczęcia
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
    // Guard: nie rozpoczynaj animacji jeśli już odkryto lub animacja trwa
    if (isRevealed || isAnimating) return;

    setIsAnimating(true);

    const timer = setTimeout(() => {
      onRevealComplete();
      setIsAnimating(false);
    }, animationDuration);

    // Cleanup function (zwracana dla potencjalnego użycia w useEffect)
    return () => clearTimeout(timer);
  }, [isRevealed, isAnimating, onRevealComplete, animationDuration]);

  return {
    isAnimating,
    startAnimation,
  };
};
