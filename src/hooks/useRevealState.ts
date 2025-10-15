import { useState, useEffect, useCallback } from "react";
import type { UseRevealStateReturn } from "../types";

/**
 * Custom hook do zarządzania stanem odkrycia wyniku
 * Sprawdza czy użytkownik już odkrył swój wynik na podstawie result_viewed_at z bazy danych
 */
export function useRevealState(participantId: number, resultViewedAt?: string): UseRevealStateReturn {
  // Stan odkrycia oparty na polu result_viewed_at z bazy danych
  const [isRevealed, setIsRevealed] = useState(!!resultViewedAt);

  /**
   * Wywołuje API do śledzenia odkrycia wyniku
   */
  const trackReveal = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/participants/${participantId}/reveal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Note: Authentication headers will be added by the browser for same-origin requests
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to track result reveal");
      }

      console.log("Successfully tracked result reveal");
    } catch (error) {
      console.error("Error tracking result reveal:", error);
      // Don't throw - we still want to show the result even if tracking fails
    }
  }, [participantId]);

  /**
   * Odkrywa wynik - wywołuje API i aktualizuje UI
   */
  const reveal = useCallback(async (): Promise<void> => {
    // Najpierw aktualizujemy UI
    setIsRevealed(true);

    // Następnie śledzimy w bazie danych
    await trackReveal();
  }, [trackReveal]);

  /**
   * Resetuje stan odkrycia (głównie do celów debugowania)
   * Uwaga: To nie resetuje bazy danych, tylko lokalny stan
   */
  const reset = useCallback((): void => {
    setIsRevealed(false);
  }, []);

  // Aktualizuj stan gdy zmieni się resultViewedAt
  useEffect(() => {
    setIsRevealed(!!resultViewedAt);
  }, [resultViewedAt]);

  return {
    isRevealed,
    reveal,
    reset,
  };
}
