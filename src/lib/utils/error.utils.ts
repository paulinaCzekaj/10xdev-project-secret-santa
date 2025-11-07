import type { AIGenerationError } from "@/types";

/**
 * Type guard for API error response
 * Checks if the response has the standard error structure
 */
export function isApiErrorResponse(data: unknown): data is { error: { code?: string; message: string } } {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "object" &&
    data.error !== null &&
    "message" in data.error &&
    typeof data.error.message === "string"
  );
}

/**
 * Type guard for AIGenerationError
 * Checks if the error object conforms to AIGenerationError interface
 */
export function isAIGenerationError(err: unknown): err is AIGenerationError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "message" in err &&
    typeof err.code === "string" &&
    typeof err.message === "string"
  );
}

/**
 * Factory function for creating AIGenerationError objects
 */
export function createAIError(code: string, message: string): AIGenerationError {
  return { code, message };
}

/**
 * Normalize any error to AIGenerationError
 * Converts various error types into a consistent AIGenerationError format
 */
export function normalizeToAIError(err: unknown, errorMessages: Record<string, string> = {}): AIGenerationError {
  // Already an AIGenerationError
  if (isAIGenerationError(err)) {
    return err;
  }

  // Timeout error
  if (err instanceof Error && err.message === "GATEWAY_TIMEOUT") {
    const message = errorMessages.GATEWAY_TIMEOUT || "Request timed out";
    return createAIError("GATEWAY_TIMEOUT", message);
  }

  // Generic fallback
  const message = err instanceof Error ? err.message : errorMessages.AI_API_ERROR || "An unexpected error occurred";

  return createAIError("AI_API_ERROR", message);
}
