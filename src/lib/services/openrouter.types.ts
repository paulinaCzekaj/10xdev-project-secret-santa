// Konfiguracja
export interface OpenRouterConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
  maxRetries?: number;
  baseDelay?: number;
}

// Request/Response
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: {
      type: "object";
      properties: Record<string, JsonSchemaProperty>;
      required: string[];
      additionalProperties: boolean;
    };
  };
}

export interface JsonSchemaProperty {
  type: "string" | "number" | "array" | "object" | "boolean";
  description?: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
}

export interface OpenRouterAPIResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Public API
export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  participantName?: string;
}

export interface SantaLetterResponse {
  letterContent: string;
  suggestedGifts: string[];
  metadata: {
    model: string;
    tokensUsed: number;
    generationTime: number;
  };
}

export interface RateLimitStatus {
  canGenerate: boolean;
  generationsUsed: number;
  generationsRemaining: number;
  maxGenerations: number;
  lastGeneratedAt: Date | null;
}

// Errors
export type ErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMIT_EXCEEDED"
  | "SERVER_ERROR"
  | "BAD_GATEWAY"
  | "SERVICE_UNAVAILABLE"
  | "GATEWAY_TIMEOUT"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE"
  | "INVALID_JSON"
  | "INVALID_INPUT"
  | "GENERATION_LIMIT_EXCEEDED"
  | "UNKNOWN_ERROR";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
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
