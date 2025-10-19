import { useState, useEffect, useCallback } from "react";

interface UseConfettiOptions {
  duration?: number;
  colors?: string[];
  numberOfPieces?: number;
  gravity?: number;
}

/**
 * Hook do zarządzania efektem konfetti
 *
 * Obsługuje wyświetlanie animacji konfetti z automatycznym wyłączeniem po określonym czasie.
 * Śledzi wymiary okna dla responsywności animacji.
 * SSR-safe - sprawdza dostępność window przed użyciem.
 *
 * @param duration - Czas wyświetlania konfetti w ms (domyślnie 3000ms)
 * @param colors - Tablica kolorów konfetti
 * @param numberOfPieces - Liczba elementów konfetti
 * @param gravity - Siła grawitacji dla konfetti
 * @returns Obiekt z funkcją triggerConfetti i komponentem do renderowania
 *
 * @example
 * const { showConfetti, triggerConfetti, windowSize, confettiConfig } = useConfetti({
 *   duration: 3000,
 *   colors: ['#dc2626', '#16a34a']
 * });
 *
 * // W komponencie renderuj konfetti używając showConfetti i config
 */
export const useConfetti = ({
  duration = 3000,
  colors = ["#dc2626", "#16a34a", "#fbbf24", "#ef4444", "#22c55e"],
  numberOfPieces = 300,
  gravity = 0.3,
}: UseConfettiOptions = {}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Handle window resize - SSR safe
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
