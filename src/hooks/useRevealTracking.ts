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
 * Hook for tracking the opening of the drawing result by participants
 *
 * Calls the API endpoint which records the fact of opening the result in the database.
 * API errors do not block the UI - the user always sees the result regardless of the tracking status.
 *
 * @param participantId - ID of the participant
 * @param accessToken - Optional access token for unregistered users
 * @returns Object with the trackReveal function to call
 *
 * @example
 * const { trackReveal } = useRevealTracking({
 *   participantId: 123,
 *   accessToken: 'abc123'
 * });
 *
 * // In handleReveal:
 * await trackReveal();
 */
export const useRevealTracking = ({ participantId, accessToken }: UseRevealTrackingOptions) => {
  const trackReveal = useCallback(async (): Promise<RevealTrackingResult> => {
    try {
      // Construct URL with optional token
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
