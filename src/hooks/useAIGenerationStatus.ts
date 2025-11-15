import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/db/supabase.client";
import type { AIGenerationStatusResponse, AIGenerationError, UseAIGenerationStatusReturn } from "@/types";

/**
 * Hook for fetching and managing the AI generation status
 *
 * @param participantId - ID participant
 * @param token - Access token (for unregistered users)
 * @param enabled - Whether the hook is active (default: true)
 * @returns Status AI generation, loading state, error, function to refetch
 *
 * @example
 * const { status, isLoading, error, refetch } = useAIGenerationStatus(participantId, token);
 */
export function useAIGenerationStatus(
  participantId: number,
  token?: string,
  enabled = true
): UseAIGenerationStatusReturn {
  const [status, setStatus] = useState<AIGenerationStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<AIGenerationError | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = new URL(`/api/participants/${participantId}/wishlist/ai-status`, window.location.origin);

      if (token) {
        url.searchParams.append("token", token);
      }

      // Get the Bearer token from the Supabase session instead of localStorage
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      const accessToken = session?.access_token;

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? {} : accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || "Failed to fetch AI status");
      }

      const data: AIGenerationStatusResponse = await response.json();
      setStatus(data);
    } catch (err) {
      const error: AIGenerationError = {
        code: "AI_API_ERROR",
        message: err instanceof Error ? err.message : "Unknown error",
      };
      setError(error);
      console.error("[useAIGenerationStatus] Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [participantId, token, enabled]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
  };
}
