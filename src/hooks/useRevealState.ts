import { useState, useEffect, useCallback } from "react";
import type { UseRevealStateReturn } from "../types";

/**
 * Custom hook for managing the state of the result discovery
 * Checks if the user has already revealed their result based on the result_viewed_at field in the database
 */
export function useRevealState(participantId: number, resultViewedAt?: string): UseRevealStateReturn {
  // State of the discovery based on the result_viewed_at field in the database
  const [isRevealed, setIsRevealed] = useState(!!resultViewedAt);

  /**
   * Calls the API to track the result discovery by the participant
   */
  const trackReveal = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/participants/${participantId}/reveal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Note: Authentication headers will be added by the browser for requests to the same origin
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
   * Reveals the result - calls the API and updates the UI
   */
  const reveal = useCallback(async (): Promise<void> => {
    // First update the UI
    setIsRevealed(true);

    // Then track the result in the database
    await trackReveal();
  }, [trackReveal]);

  /**
   * Resets the state of the discovery (mainly for debugging purposes)
   * Note: This does not reset the database, only the local state
   */
  const reset = useCallback((): void => {
    setIsRevealed(false);
  }, []);

  // Update the state when resultViewedAt changes
  useEffect(() => {
    setIsRevealed(!!resultViewedAt);
  }, [resultViewedAt]);

  return {
    isRevealed,
    reveal,
    reset,
  };
}
