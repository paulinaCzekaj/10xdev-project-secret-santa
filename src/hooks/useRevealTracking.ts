import { useCallback } from "react";

interface UseRevealTrackingOptions {
  participantId: number;
  accessToken?: string;
}

interface RevealTrackingResult {
  success: boolean;
  error?: string;
}

/**
 * Hook do śledzenia otwarć wyniku losowania przez uczestników
 *
 * Wywołuje API endpoint który rejestruje w bazie danych fakt otwarcia wyniku.
 * Błędy API nie blokują UI - użytkownik zawsze widzi wynik niezależnie od statusu trackingu.
 *
 * @param participantId - ID uczestnika
 * @param accessToken - Opcjonalny token dostępu dla niezalogowanych użytkowników
 * @returns Obiekt z funkcją trackReveal do wywołania
 *
 * @example
 * const { trackReveal } = useRevealTracking({
 *   participantId: 123,
 *   accessToken: 'abc123'
 * });
 *
 * // W handleReveal:
 * await trackReveal();
 */
export const useRevealTracking = ({ participantId, accessToken }: UseRevealTrackingOptions) => {
  const trackReveal = useCallback(async (): Promise<RevealTrackingResult> => {
    try {
      // Konstruuj URL z opcjonalnym tokenem
      const url = accessToken
        ? `/api/participants/${participantId}/reveal?token=${accessToken}`
        : `/api/participants/${participantId}/reveal`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn("Failed to track result reveal, but continuing with UI update");
        return { success: false, error: "API call failed" };
      }

      return { success: true };
    } catch (error) {
      console.warn("Error tracking result reveal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }, [participantId, accessToken]);

  return { trackReveal };
};
