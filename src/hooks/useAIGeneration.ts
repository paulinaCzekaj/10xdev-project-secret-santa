import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabaseClient } from "@/db/supabase.client";
import type { GenerateAIRequest, GenerateAIResponse, AIGenerationError, UseAIGenerationReturn } from "@/types";

// Mapowanie kodów błędów na user-friendly komunikaty
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

// Timeout dla pojedynczego requesta (15 sekund)
const REQUEST_TIMEOUT = 15000;

/**
 * Helper: fetch z timeoutem
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("GATEWAY_TIMEOUT");
    }
    throw error;
  }
}

/**
 * Helper: sleep dla retry backoff
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Hook do zarządzania procesem AI-generowania listu do Mikołaja
 *
 * @param participantId - ID uczestnika
 * @param token - Token dostępu (dla niezarejestrowanych)
 * @param onStatusChange - Callback wywoływany po zmianach (dla refetch status)
 * @returns Stan generowania, funkcje akcji
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
   * Wywołanie API z retry logic
   */
  const callGenerateAPI = useCallback(
    async (prompt: string, retries = 2): Promise<GenerateAIResponse> => {
      const url = new URL(`/api/participants/${participantId}/wishlist/generate-ai`, window.location.origin);

      if (token) {
        url.searchParams.append("token", token);
      }

      // Pobieramy Bearer token z sesji Supabase
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
              headers: {
                "Content-Type": "application/json",
                ...(token ? {} : session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
              },
              body: JSON.stringify(requestBody),
            },
            REQUEST_TIMEOUT
          );

          if (response.ok) {
            return await response.json();
          }

          // Retry dla 5xx i 504
          if (attempt < retries && [500, 502, 503, 504].includes(response.status)) {
            const backoff = Math.pow(2, attempt) * 1000;
            await sleep(backoff);
            continue;
          }

          // Błąd nie nadający się do retry
          const errorData = await response.json();
          const errorCode = errorData.error.code || "AI_API_ERROR";
          const errorMessage = ERROR_MESSAGES[errorCode] || errorData.error.message;

          throw {
            code: errorCode,
            message: errorMessage,
          } as AIGenerationError;
        } catch (err) {
          // Retry dla network errors
          if (attempt < retries && err instanceof TypeError) {
            const backoff = Math.pow(2, attempt) * 1000;
            await sleep(backoff);
            continue;
          }

          // Błąd timeout
          if (err.message === "GATEWAY_TIMEOUT") {
            throw {
              code: "GATEWAY_TIMEOUT",
              message: ERROR_MESSAGES.GATEWAY_TIMEOUT,
            } as AIGenerationError;
          }

          // Inne błędy - mapuj na AIGenerationError jeśli to nie jest już taki błąd
          if (err.code && err.message) {
            throw err; // już jest AIGenerationError
          }
          throw {
            code: "AI_API_ERROR",
            message: err.message || "Wystąpił nieoczekiwany błąd",
          } as AIGenerationError;
        }
      }

      // Max retries exceeded
      throw {
        code: "AI_API_ERROR",
        message: "Przekroczono maksymalną liczbę prób. Spróbuj ponownie później.",
      } as AIGenerationError;
    },
    [participantId, token]
  );

  /**
   * Generowanie nowego listu
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
   * Regeneracja z tym samym promptem
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
   * Akceptacja wygenerowanego listu
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
   * Odrzucenie wygenerowanego listu
   */
  const rejectLetter = useCallback(async () => {
    setGeneratedContent(null);
    setCurrentPrompt(null);
    setError(null);

    // Refetch AI status (licznik został zmniejszony)
    await onStatusChange?.();

    toast.info("List został odrzucony. Wykorzystałeś 1 generowanie.");
  }, [onStatusChange]);

  /**
   * Reset stanu (np. przy unmount)
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
