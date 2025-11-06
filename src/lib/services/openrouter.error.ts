import type { ErrorCode } from "./openrouter.types";

export class OpenRouterError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public isRetryable = false,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = "OpenRouterError";

    if (this.metadata) {
      this.metadata = this.sanitizeMetadata(this.metadata);
    }
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...metadata };

    delete sanitized.apiKey;
    delete sanitized.authorization;

    if (sanitized.headers && typeof sanitized.headers === "object" && sanitized.headers !== null) {
      const headers = sanitized.headers as Record<string, unknown>;
      if (headers.Authorization) {
        headers.Authorization = "[REDACTED]";
      }
    }

    return sanitized;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      isRetryable: this.isRetryable,
      metadata: this.metadata,
    };
  }
}

export function getUserFriendlyMessage(error: OpenRouterError): string {
  const ERROR_MESSAGES = {
    INVALID_REQUEST: "Nieprawidłowe dane wejściowe. Spróbuj ponownie.",
    UNAUTHORIZED: "Problem z konfiguracją systemu. Skontaktuj się z administratorem.",
    FORBIDDEN: "Brak dostępu do zasobu.",
    NOT_FOUND: "Zasób nie został znaleziony.",
    RATE_LIMIT_EXCEEDED: "Osiągnięto limit API. Spróbuj ponownie za chwilę.",
    SERVER_ERROR: "Problem z serwerem AI. Spróbuj ponownie.",
    BAD_GATEWAY: "Problem z połączeniem. Spróbuj ponownie.",
    SERVICE_UNAVAILABLE: "Serwis AI jest tymczasowo niedostępny.",
    GATEWAY_TIMEOUT: "Przekroczono czas oczekiwania na odpowiedź.",
    TIMEOUT: "Generowanie trwa dłużej niż zwykle. Spróbuj ponownie.",
    NETWORK_ERROR: "Problem z połączeniem sieciowym.",
    INVALID_RESPONSE: "Otrzymano niepoprawną odpowiedź z serwera.",
    INVALID_JSON: "Błąd przetwarzania odpowiedzi.",
    INVALID_INPUT: "Wprowadzone dane są niepoprawne.",
    GENERATION_LIMIT_EXCEEDED: "Wykorzystałeś wszystkie dostępne generowania AI.",
    UNKNOWN_ERROR: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
  };
  return ERROR_MESSAGES[error.code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}
