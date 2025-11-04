import { useState, useCallback } from "react";

interface UseAIGenerationResult {
  generate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
  generatedContent: string | null;
  suggestedGifts: string[];
  remainingGenerations: number | null;
  canGenerateMore: boolean;
  clearError: () => void;
  reset: () => void;
}

interface GenerationResponse {
  generated_content: string;
  suggested_gifts: string[];
  remaining_generations: number;
  can_generate_more: boolean;
  metadata: {
    model: string;
    tokensUsed: number;
    generationTime: number;
  };
}

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    isRetryable?: boolean;
  };
}

export function useAIGeneration(participantId: string | number, isRegistered = false): UseAIGenerationResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [suggestedGifts, setSuggestedGifts] = useState<string[]>([]);
  const [remainingGenerations, setRemainingGenerations] = useState<number | null>(null);

  const generate = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) {
        setError("Treść preferencji nie może być pusta");
        return;
      }

      if (prompt.trim().length < 10) {
        setError("Preferencje muszą mieć co najmniej 10 znaków");
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const response = await fetch(`/api/participants/${participantId}/wishlist/generate-ai`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: prompt.trim(),
            isRegistered,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorData = data as ApiErrorResponse;

          // Map common error codes to user-friendly messages
          const errorMessages: Record<string, string> = {
            INVALID_INPUT: "Wprowadzone dane są nieprawidłowe. Spróbuj ponownie.",
            UNAUTHORIZED: "Problem z konfiguracją systemu. Skontaktuj się z administratorem.",
            FORBIDDEN: "Brak dostępu do tej funkcji.",
            NOT_FOUND: "Uczestnik nie został znaleziony.",
            RATE_LIMIT_EXCEEDED: "Wykorzystałeś wszystkie dostępne generowania AI.",
            GENERATION_LIMIT_EXCEEDED: "Wykorzystałeś wszystkie dostępne generowania AI.",
            SERVER_ERROR: "Problem z serwerem AI. Spróbuj ponownie za chwilę.",
            BAD_GATEWAY: "Problem z połączeniem. Spróbuj ponownie.",
            SERVICE_UNAVAILABLE: "Serwis AI jest tymczasowo niedostępny.",
            GATEWAY_TIMEOUT: "Generowanie trwa dłużej niż zwykle. Spróbuj ponownie.",
            TIMEOUT: "Generowanie trwa dłużej niż zwykle. Spróbuj ponownie.",
            NETWORK_ERROR: "Problem z połączeniem sieciowym.",
            INVALID_RESPONSE: "Otrzymano nieprawidłową odpowiedź z serwera.",
            INVALID_JSON: "Błąd przetwarzania odpowiedzi.",
          };

          const userMessage =
            errorMessages[errorData.error.code] || errorData.error.message || "Wystąpił nieoczekiwany błąd";

          // Add retry suggestion for retryable errors
          if (errorData.error.isRetryable) {
            throw new Error(`${userMessage} Spróbuj ponownie za chwilę.`);
          }

          throw new Error(userMessage);
        }

        const result = data as GenerationResponse;

        setGeneratedContent(result.generated_content);
        setSuggestedGifts(result.suggested_gifts);
        setRemainingGenerations(result.remaining_generations);
      } catch (err) {
        // For network errors or unexpected errors, use a generic message
        let errorMessage = "Wystąpił nieoczekiwany błąd podczas generowania listy";

        if (err instanceof Error) {
          // If it's an API error (has response), it was already handled above
          // For network errors or other unexpected errors, use generic message
          if (
            !err.message.includes("Spróbuj ponownie") &&
            !err.message.includes("Wykorzystałeś") &&
            !err.message.includes("Problem z")
          ) {
            errorMessage = "Wystąpił nieoczekiwany błąd podczas generowania listy";
          } else {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);
        console.error("[useAIGeneration] Error:", err);
      } finally {
        setIsGenerating(false);
      }
    },
    [participantId, isRegistered]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setError(null);
    setGeneratedContent(null);
    setSuggestedGifts([]);
    setRemainingGenerations(null);
  }, []);

  const canGenerateMore = remainingGenerations === null || remainingGenerations > 0;

  return {
    generate,
    isGenerating,
    error,
    generatedContent,
    suggestedGifts,
    remainingGenerations,
    canGenerateMore,
    clearError,
    reset,
  };
}
