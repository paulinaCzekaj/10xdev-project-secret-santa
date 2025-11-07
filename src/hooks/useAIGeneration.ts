import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabaseClient } from "@/db/supabase.client";
import type { GenerateAIRequest, GenerateAIResponse, AIGenerationError, UseAIGenerationReturn } from "@/types";
import { sleep, calculateBackoff } from "@/lib/utils/async.utils";
import { fetchWithTimeout, isRetryableStatusCode, isNetworkError, buildAuthHeaders } from "@/lib/utils/http.utils";
import { isApiErrorResponse, normalizeToAIError, createAIError } from "@/lib/utils/error.utils";

// Mapping error codes to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  END_DATE_PASSED: "Data zakończenia wydarzenia minęła. Nie możesz już generować listy życzeń.",
  INVALID_PROMPT: "Prompt musi mieć od 10 do 2000 znaków.",
  UNAUTHORIZED: "Wymagana autoryzacja. Zaloguj się ponownie.",
  FORBIDDEN: "Nie masz uprawnień do generowania listy dla tego uczestnika.",
  NOT_FOUND: "Nie znaleziono uczestnika. Odśwież stronę.",
  AI_GENERATION_LIMIT_REACHED: "Wykorzystałeś wszystkie dostępne generowania AI.",
  AI_API_ERROR: "Wystąpił błąd podczas generowania. Spróbuj ponownie później.",
  GATEWAY_TIMEOUT: "Generowanie trwa zbyt długo. Spróbuj ponownie.",
  NETWORK_ERROR: "Błąd połączenia. Sprawdź swoje połączenie internetowe.",
};

// Timeout for a single request (15 seconds)
const REQUEST_TIMEOUT = 15000;

/**
 * Hook to manage the AI-generated letter process
 *
 * @param participantId - ID participant
 * @param token - Access token (for unregistered users)
 * @param onStatusChange - Callback called on changes (for refetch status)
 * @returns Generating state, action functions
 */
export function useAIGeneration(
  participantId: number,
  token?: string,
  onStatusChange?: () => void
): UseAIGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<AIGenerationError | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [remainingGenerations, setRemainingGenerations] = useState<number | null>(null);

  /**
   * Calling API with retry logic
   */
  const callGenerateAPI = useCallback(
    async (prompt: string, retries = 2): Promise<GenerateAIResponse> => {
      const url = new URL(`/api/participants/${participantId}/wishlist/generate-ai`, window.location.origin);

      if (token) {
        url.searchParams.append("token", token);
      }

      // Get Bearer token from Supabase session
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      const requestBody: GenerateAIRequest = { prompt };

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await fetchWithTimeout(
            url.toString(),
            {
              method: "POST",
              headers: buildAuthHeaders(token, session?.access_token),
              body: JSON.stringify(requestBody),
            },
            REQUEST_TIMEOUT
          );

          if (response.ok) {
            return await response.json();
          }

          // Check if error is retryable
          if (attempt < retries && isRetryableStatusCode(response.status)) {
            await sleep(calculateBackoff(attempt));
            continue;
          }

          // Parse and throw non-retryable error
          const errorData = await response.json();

          if (isApiErrorResponse(errorData)) {
            const errorCode = errorData.error.code || "AI_API_ERROR";
            const errorMessage = ERROR_MESSAGES[errorCode] || errorData.error.message;

            throw createAIError(errorCode, errorMessage);
          }

          // Fallback for unexpected error format
          throw createAIError("AI_API_ERROR", ERROR_MESSAGES.AI_API_ERROR);
        } catch (err) {
          // Retry for network errors
          if (attempt < retries && isNetworkError(err)) {
            await sleep(calculateBackoff(attempt));
            continue;
          }

          // Normalize and throw error
          throw normalizeToAIError(err, ERROR_MESSAGES);
        }
      }

      // This should be unreachable, but needed for TypeScript
      throw createAIError("AI_API_ERROR", "Przekroczono maksymalną liczbę prób. Spróbuj ponownie później.");
    },
    [participantId, token]
  );

  /**
   * Generating a new letter
   */
  const generateLetter = useCallback(
    async (prompt: string) => {
      setIsGenerating(true);
      setError(null);
      setCurrentPrompt(prompt);

      try {
        const response = await callGenerateAPI(prompt);
        setGeneratedContent(response.generated_content);
        setRemainingGenerations(response.remaining_generations);
        toast.success("List został wygenerowany!");
      } catch (err) {
        const error = err as AIGenerationError;
        setError(error);
        toast.error(error.message);
        console.error("[useAIGeneration] generateLetter error:", err);
      } finally {
        setIsGenerating(false);
      }
    },
    [callGenerateAPI]
  );

  /**
   * Regenerating with the same prompt
   */
  const regenerateLetter = useCallback(async () => {
    if (!currentPrompt) {
      toast.error("Brak zapisanego promptu do regeneracji");
      return;
    }

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await callGenerateAPI(currentPrompt);
      setGeneratedContent(response.generated_content);
      setRemainingGenerations(response.remaining_generations);
      toast.success("List został zregenerowany!");
    } catch (err) {
      const error = err as AIGenerationError;
      setError(error);
      toast.error(error.message);
      console.error("[useAIGeneration] regenerateLetter error:", err);
    } finally {
      setIsRegenerating(false);
    }
  }, [currentPrompt, callGenerateAPI]);

  /**
   * Accepting the generated letter
   */
  const acceptLetter = useCallback(async () => {
    if (!generatedContent) return;

    // Callback dla parent component (wstawienie do textarea)
    // Reset stanu
    setGeneratedContent(null);
    setCurrentPrompt(null);
    setError(null);

    // Refetch AI status
    await onStatusChange?.();

    toast.success("List został dodany do Twojej listy życzeń");
  }, [generatedContent, onStatusChange]);

  /**
   * Rejecting the generated letter
   */
  const rejectLetter = useCallback(async () => {
    setGeneratedContent(null);
    setCurrentPrompt(null);
    setError(null);

    // Refetch AI status (counter was decreased)
    await onStatusChange?.();

    toast.info("List został odrzucony. Wykorzystałeś 1 generowanie.");
  }, [onStatusChange]);

  /**
   * Reset state (e.g. when unmounting)
   */
  const reset = useCallback(() => {
    setIsGenerating(false);
    setIsRegenerating(false);
    setError(null);
    setGeneratedContent(null);
    setCurrentPrompt(null);
    setRemainingGenerations(null);
  }, []);

  return {
    isGenerating,
    isRegenerating,
    error,
    generatedContent,
    currentPrompt,
    remainingGenerations,
    generateLetter,
    regenerateLetter,
    acceptLetter,
    rejectLetter,
    reset,
  };
}
