# OpenRouter Service - Implementation Guide

## 1. Opis usługi

Usługa `OpenRouterService` stanowi warstwę abstrakcji nad OpenRouter API, umożliwiającą integrację z modelami Large Language Models (LLM) w aplikacji Secret Santa. Głównym celem usługi jest generowanie spersonalizowanych listów do świętego Mikołaja na podstawie preferencji użytkownika.

**Kluczowe funkcjonalności:**
- Komunikacja z OpenRouter API wykorzystując model openai/gpt-4o-mini
- Zarządzanie konfiguracją modelu (parametry, prompty)
- Obsługa strukturyzowanych odpowiedzi JSON
- Implementacja retry logic z exponential backoff
- Rate limiting i monitoring użycia API
- Kompleksowa obsługa błędów
- Bezpieczne zarządzanie kluczami API

**Lokalizacja w projekcie:**
```
./src/lib/services/openrouter.service.ts
```

## 2. Opis konstruktora

```typescript
class OpenRouterService {
  constructor(config?: OpenRouterConfig)
}
```

### Parametry konfiguracyjne (OpenRouterConfig):

```typescript
interface OpenRouterConfig {
  apiKey?: string;           // Domyślnie: process.env.OPENROUTER_API_KEY
  model?: string;            // Domyślnie: 'openai/gpt-4o-mini'
  maxTokens?: number;        // Domyślnie: 1000
  temperature?: number;      // Domyślnie: 0.7
  topP?: number;            // Domyślnie: 1.0
  timeout?: number;         // Domyślnie: 15000 (15s)
  maxRetries?: number;      // Domyślnie: 2
  baseDelay?: number;       // Domyślnie: 1000 (1s)
}
```

### Walidacja konfiguracji:

```typescript
const ConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().default('openai/gpt-4o-mini'),
  maxTokens: z.number().int().min(1).max(4096).default(1000),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(1.0),
  timeout: z.number().int().min(1000).max(60000).default(15000),
  maxRetries: z.number().int().min(0).max(5).default(2),
  baseDelay: z.number().int().min(500).max(5000).default(1000),
});
```

## 3. Publiczne metody i pola

### 3.1. `generateSantaLetter()`

Generuje spersonalizowany list do świętego Mikołaja na podstawie preferencji użytkownika.

```typescript
async generateSantaLetter(
  userPreferences: string,
  options?: GenerationOptions
): Promise<SantaLetterResponse>
```

**Parametry:**
- `userPreferences`: Preferencje/zainteresowania użytkownika (10-1000 znaków)
- `options`: Opcjonalne parametry nadpisujące domyślną konfigurację

**Typy:**

```typescript
interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  language?: 'pl' | 'en';
}

interface SantaLetterResponse {
  letterContent: string;        // Wygenerowany list (max 1000 znaków)
  suggestedGifts: string[];    // Lista konkretnych propozycji prezentów (3-5)
  metadata: {
    model: string;
    tokensUsed: number;
    generationTime: number;    // w milisekundach
  };
}
```

**Przykład użycia:**

```typescript
const openRouterService = new OpenRouterService();

try {
  const result = await openRouterService.generateSantaLetter(
    "Uwielbiam fantasy, dobrą kawę i ciepłe szaliki",
    { language: 'pl' }
  );

  console.log(result.letterContent);
  // "Cześć Mikołaju! 🎅\n\nW tym roku byłam/em grzeczna/y..."
} catch (error) {
  if (error instanceof OpenRouterError) {
    console.error(`[${error.code}] ${error.message}`);
  }
}
```

### 3.2. `validateRateLimit()`

Sprawdza czy użytkownik może wykonać kolejne generowanie.

```typescript
async validateRateLimit(
  participantId: string,
  isRegistered: boolean
): Promise<RateLimitStatus>
```

**Parametry:**
- `participantId`: ID uczestnika w systemie
- `isRegistered`: Czy użytkownik jest zarejestrowany (5 generowań vs 3)

**Typy:**

```typescript
interface RateLimitStatus {
  canGenerate: boolean;
  generationsUsed: number;
  generationsRemaining: number;
  maxGenerations: number;
  lastGeneratedAt: Date | null;
}
```

**Przykład użycia:**

```typescript
const status = await openRouterService.validateRateLimit(
  'participant-123',
  true
);

if (!status.canGenerate) {
  throw new Error(`Wykorzystałeś wszystkie ${status.maxGenerations} generowania`);
}
```

### 3.3. `incrementGenerationCount()`

Zwiększa licznik generowań dla użytkownika (wywołaj po pomyślnym generowaniu).

```typescript
async incrementGenerationCount(
  participantId: string
): Promise<void>
```

### 3.4. `testConnection()`

Testuje połączenie z OpenRouter API (użyteczne w health checks).

```typescript
async testConnection(): Promise<boolean>
```

## 4. Prywatne metody i pola

### 4.1. Pola prywatne

```typescript
private readonly config: Required<OpenRouterConfig>;
private readonly httpClient: typeof fetch;
private readonly apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
```

### 4.2. `buildSystemPrompt()`

Konstruuje system prompt z dynamicznymi parametrami.

```typescript
private buildSystemPrompt(language: string): string
```

**Implementacja:**

```typescript
private buildSystemPrompt(language: string = 'pl'): string {
  const prompts = {
    pl: `Jesteś asystentem pomagającym tworzyć listy do świętego Mikołaja na Gwiazdkę (Secret Santa).

Zadanie:
Na podstawie preferencji użytkownika wygeneruj ciepły, narracyjny list do Mikołaja zawierający listę życzeń.

Wytyczne:
1. Użyj formy listu (np. "Drogi Mikołaju,..." lub "Hej Mikołaju!")
2. Ton ma być ciepły, personalny i świąteczny (nie oficjalny czy suchy)
3. Zawrzyj 3-5 konkretnych pomysłów na prezenty w narracji listu
4. Bądź konkretny - podawaj tytuły książek, gatunki muzyki, rodzaje produktów
5. Dodaj emoji świąteczne (🎁, 🎄, ⭐, 🎅, ❄️, 🔔)
6. Maksymalnie 1000 znaków
7. Odpowiadaj TYLKO po polsku
8. Zakończ list w ciepły, świąteczny sposób

Przykład struktury:
Cześć Mikołaju! 🎅

[Wprowadzenie z ciepłym tonem]
[2-3 zdania z konkretnymi propozycjami prezentów, wplecionymi w narrację]
[Ciepłe zakończenie ze świątecznymi życzeniami]

Wesołych Świąt! ⭐`,
    en: `You are an assistant helping to create Christmas wishlists for Secret Santa.

Task:
Based on user preferences, generate a warm, narrative letter to Santa containing a wishlist.

Guidelines:
1. Use letter format (e.g., "Dear Santa,..." or "Hey Santa!")
2. Tone should be warm, personal, and festive (not formal or dry)
3. Include 3-5 specific gift ideas woven into the narrative
4. Be specific - mention book titles, music genres, product types
5. Add Christmas emoji (🎁, 🎄, ⭐, 🎅, ❄️, 🔔)
6. Maximum 1000 characters
7. Respond ONLY in English
8. End with warm, festive wishes`
  };

  return prompts[language as keyof typeof prompts] || prompts.pl;
}
```

### 4.3. `buildMessages()`

Konstruuje tablicę messages dla OpenRouter API.

```typescript
private buildMessages(
  systemPrompt: string,
  userPrompt: string
): Message[]
```

**Typy:**

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

**Implementacja:**

```typescript
private buildMessages(systemPrompt: string, userPrompt: string): Message[] {
  return [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: this.sanitizeUserInput(userPrompt)
    }
  ];
}
```

### 4.4. `buildResponseFormat()`

Definiuje JSON schema dla strukturyzowanej odpowiedzi.

```typescript
private buildResponseFormat(): ResponseFormat
```

**Typy:**

```typescript
interface ResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: {
      type: 'object';
      properties: Record<string, JsonSchemaProperty>;
      required: string[];
      additionalProperties: boolean;
    };
  };
}

interface JsonSchemaProperty {
  type: 'string' | 'number' | 'array' | 'object' | 'boolean';
  description?: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
}
```

**Implementacja:**

```typescript
private buildResponseFormat(): ResponseFormat {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'santa_letter_response',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          letter_content: {
            type: 'string',
            description: 'Generated letter to Santa with wishlist in narrative form'
          },
          suggested_gifts: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of 3-5 concrete gift suggestions extracted from the letter'
          }
        },
        required: ['letter_content', 'suggested_gifts'],
        additionalProperties: false
      }
    }
  };
}
```

### 4.5. `makeRequest()`

Wykonuje HTTP request do OpenRouter API z retry logic.

```typescript
private async makeRequest(
  messages: Message[],
  responseFormat: ResponseFormat
): Promise<OpenRouterAPIResponse>
```

**Implementacja:**

```typescript
private async makeRequest(
  messages: Message[],
  responseFormat: ResponseFormat
): Promise<OpenRouterAPIResponse> {
  const requestBody = {
    model: this.config.model,
    messages,
    response_format: responseFormat,
    max_tokens: this.config.maxTokens,
    temperature: this.config.temperature,
    top_p: this.config.topP
  };

  const headers = {
    'Authorization': `Bearer ${this.config.apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
    'X-Title': 'Secret Santa App'
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await this.handleAPIError(response);
      }

      const data = await response.json();
      return data as OpenRouterAPIResponse;

    } catch (error) {
      lastError = error as Error;

      // Nie retry dla non-recoverable errors
      if (error instanceof OpenRouterError && !error.isRetryable) {
        throw error;
      }

      // Retry z exponential backoff
      if (attempt < this.config.maxRetries) {
        const delay = this.config.baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
        continue;
      }
    }
  }

  throw lastError || new OpenRouterError(
    'REQUEST_FAILED',
    'Failed to complete request after retries'
  );
}
```

### 4.6. `handleAPIError()`

Klasyfikuje i transformuje błędy API.

```typescript
private async handleAPIError(response: Response): Promise<OpenRouterError>
```

**Implementacja:**

```typescript
private async handleAPIError(response: Response): Promise<OpenRouterError> {
  let errorBody: any;
  try {
    errorBody = await response.json();
  } catch {
    errorBody = { message: response.statusText };
  }

  const errorMap: Record<number, { code: ErrorCode; isRetryable: boolean }> = {
    400: { code: 'INVALID_REQUEST', isRetryable: false },
    401: { code: 'UNAUTHORIZED', isRetryable: false },
    403: { code: 'FORBIDDEN', isRetryable: false },
    404: { code: 'NOT_FOUND', isRetryable: false },
    429: { code: 'RATE_LIMIT_EXCEEDED', isRetryable: false },
    500: { code: 'SERVER_ERROR', isRetryable: true },
    502: { code: 'BAD_GATEWAY', isRetryable: true },
    503: { code: 'SERVICE_UNAVAILABLE', isRetryable: true },
    504: { code: 'GATEWAY_TIMEOUT', isRetryable: true },
  };

  const errorInfo = errorMap[response.status] || {
    code: 'UNKNOWN_ERROR',
    isRetryable: false
  };

  return new OpenRouterError(
    errorInfo.code,
    errorBody.error?.message || errorBody.message || 'Unknown error',
    errorInfo.isRetryable,
    { status: response.status, body: errorBody }
  );
}
```

### 4.7. `sanitizeUserInput()`

Sanityzuje i waliduje input użytkownika.

```typescript
private sanitizeUserInput(input: string): string
```

**Implementacja:**

```typescript
private sanitizeUserInput(input: string): string {
  // Trim whitespace
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > 1000) {
    sanitized = sanitized.slice(0, 1000);
  }

  // Validate minimum length
  if (sanitized.length < 10) {
    throw new OpenRouterError(
      'INVALID_INPUT',
      'User preferences must be at least 10 characters',
      false
    );
  }

  // Remove potentially harmful characters (basic XSS protection)
  sanitized = sanitized
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');

  return sanitized;
}
```

### 4.8. `parseResponse()`

Parsuje i waliduje odpowiedź z API.

```typescript
private parseResponse(
  apiResponse: OpenRouterAPIResponse
): SantaLetterResponse
```

**Implementacja:**

```typescript
private parseResponse(
  apiResponse: OpenRouterAPIResponse
): SantaLetterResponse {
  try {
    const content = apiResponse.choices[0]?.message?.content;

    if (!content) {
      throw new OpenRouterError(
        'INVALID_RESPONSE',
        'No content in API response',
        false
      );
    }

    // Parse JSON response
    const parsed = JSON.parse(content);

    // Validate structure
    if (!parsed.letter_content || !Array.isArray(parsed.suggested_gifts)) {
      throw new OpenRouterError(
        'INVALID_RESPONSE',
        'Response does not match expected schema',
        false
      );
    }

    // Validate letter length
    if (parsed.letter_content.length > 1000) {
      parsed.letter_content = parsed.letter_content.slice(0, 1000);
    }

    return {
      letterContent: parsed.letter_content,
      suggestedGifts: parsed.suggested_gifts.slice(0, 5), // Max 5 suggestions
      metadata: {
        model: apiResponse.model,
        tokensUsed: apiResponse.usage?.total_tokens || 0,
        generationTime: 0 // Will be set by caller
      }
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new OpenRouterError(
        'INVALID_JSON',
        'Failed to parse JSON response',
        false,
        { originalError: error }
      );
    }
    throw error;
  }
}
```

### 4.9. `sleep()`

Utility dla exponential backoff.

```typescript
private sleep(ms: number): Promise<void>
```

**Implementacja:**

```typescript
private sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 5. Obsługa błędów

### 5.1. Klasa OpenRouterError

```typescript
class OpenRouterError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public isRetryable: boolean = false,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'OpenRouterError';

    // Sanitize metadata to avoid leaking API keys
    if (this.metadata) {
      this.metadata = this.sanitizeMetadata(this.metadata);
    }
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata };

    // Remove sensitive fields
    delete sanitized.apiKey;
    delete sanitized.authorization;

    // Redact Authorization header if present
    if (sanitized.headers?.Authorization) {
      sanitized.headers.Authorization = '[REDACTED]';
    }

    return sanitized;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      isRetryable: this.isRetryable,
      metadata: this.metadata
    };
  }
}
```

### 5.2. Error Codes

```typescript
type ErrorCode =
  | 'INVALID_REQUEST'        // 400 - Błędne parametry requestu
  | 'UNAUTHORIZED'           // 401 - Nieprawidłowy API key
  | 'FORBIDDEN'              // 403 - Brak uprawnień
  | 'NOT_FOUND'              // 404 - Endpoint nie istnieje
  | 'RATE_LIMIT_EXCEEDED'    // 429 - Przekroczono limit API
  | 'SERVER_ERROR'           // 500 - Błąd serwera OpenRouter
  | 'BAD_GATEWAY'            // 502 - Problem z gateway
  | 'SERVICE_UNAVAILABLE'    // 503 - Serwis niedostępny
  | 'GATEWAY_TIMEOUT'        // 504 - Timeout gateway
  | 'TIMEOUT'                // Timeout na poziomie klienta
  | 'NETWORK_ERROR'          // Błąd sieci
  | 'INVALID_RESPONSE'       // Niepoprawna struktura odpowiedzi
  | 'INVALID_JSON'           // Błąd parsowania JSON
  | 'INVALID_INPUT'          // Niepoprawny input użytkownika
  | 'GENERATION_LIMIT_EXCEEDED' // Przekroczono limit generowań użytkownika
  | 'UNKNOWN_ERROR';         // Nieznany błąd
```

### 5.3. User-Friendly Error Messages

```typescript
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_REQUEST: 'Nieprawidłowe dane wejściowe. Spróbuj ponownie.',
  UNAUTHORIZED: 'Problem z konfiguracją systemu. Skontaktuj się z administratorem.',
  FORBIDDEN: 'Brak dostępu do zasobu.',
  NOT_FOUND: 'Zasób nie został znaleziony.',
  RATE_LIMIT_EXCEEDED: 'Osiągnięto limit API. Spróbuj ponownie za chwilę.',
  SERVER_ERROR: 'Problem z serwerem AI. Spróbuj ponownie.',
  BAD_GATEWAY: 'Problem z połączeniem. Spróbuj ponownie.',
  SERVICE_UNAVAILABLE: 'Serwis AI jest tymczasowo niedostępny.',
  GATEWAY_TIMEOUT: 'Przekroczono czas oczekiwania na odpowiedź.',
  TIMEOUT: 'Generowanie trwa dłużej niż zwykle. Spróbuj ponownie.',
  NETWORK_ERROR: 'Problem z połączeniem sieciowym.',
  INVALID_RESPONSE: 'Otrzymano niepoprawną odpowiedź z serwera.',
  INVALID_JSON: 'Błąd przetwarzania odpowiedzi.',
  INVALID_INPUT: 'Wprowadzone dane są niepoprawne.',
  GENERATION_LIMIT_EXCEEDED: 'Wykorzystałeś wszystkie dostępne generowania AI.',
  UNKNOWN_ERROR: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'
};

function getUserFriendlyMessage(error: OpenRouterError): string {
  return ERROR_MESSAGES[error.code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}
```

### 5.4. Przykłady obsługi błędów

```typescript
// W API endpoint
try {
  const result = await openRouterService.generateSantaLetter(
    userPreferences
  );
  return { success: true, data: result };
} catch (error) {
  if (error instanceof OpenRouterError) {
    console.error(`[OpenRouter Error] ${error.code}:`, error.message, error.metadata);

    return {
      success: false,
      error: {
        code: error.code,
        message: getUserFriendlyMessage(error),
        isRetryable: error.isRetryable
      }
    };
  }

  // Unexpected error
  console.error('[Unexpected Error]', error);
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      isRetryable: false
    }
  };
}
```

## 6. Kwestie bezpieczeństwa

### 6.1. Zarządzanie API Key

**✅ DO:**
- Przechowuj API key w zmiennych środowiskowych
- Używaj `process.env.OPENROUTER_API_KEY`
- Dodaj `.env` do `.gitignore`
- Rotuj klucze co 90 dni
- Używaj różnych kluczy dla dev/staging/production

**❌ DON'T:**
- Nigdy nie hardcode API key w kodzie
- Nigdy nie commituj `.env` do repozytorium
- Nigdy nie loguj API key (nawet w error messages)
- Nigdy nie wysyłaj API key do klienta (frontend)

### 6.2. Sanityzacja danych

```typescript
// Input validation
const UserPreferencesSchema = z.string()
  .min(10, 'Preferences must be at least 10 characters')
  .max(1000, 'Preferences cannot exceed 1000 characters')
  .refine(
    (val) => !/<script/i.test(val),
    'Invalid characters detected'
  );

// Usage
const sanitizedPreferences = UserPreferencesSchema.parse(userInput);
```

### 6.3. Rate Limiting na poziomie aplikacji

```typescript
// Database query (Supabase)
async function checkUserRateLimit(
  participantId: string,
  isRegistered: boolean
): Promise<boolean> {
  const { data, error } = await supabase
    .from('wishes')
    .select('ai_generation_count_per_group')
    .eq('participant_id', participantId)
    .single();

  if (error) throw error;

  const maxGenerations = isRegistered ? 5 : 3;
  const currentCount = data.ai_generation_count_per_group || 0;

  return currentCount < maxGenerations;
}

// Atomic increment
async function incrementGenerationCount(participantId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_ai_generation_count', {
    p_participant_id: participantId
  });

  if (error) throw error;
}
```

**SQL Function (Supabase):**

```sql
CREATE OR REPLACE FUNCTION increment_ai_generation_count(p_participant_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE wishes
  SET
    ai_generation_count_per_group = COALESCE(ai_generation_count_per_group, 0) + 1,
    ai_last_generated_at = NOW()
  WHERE participant_id = p_participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.4. Content Security Policy

```typescript
// W API endpoint - validacja output
function validateGeneratedContent(content: string): boolean {
  // Sprawdź czy nie zawiera potencjalnie szkodliwych treści
  const blockedPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i // event handlers
  ];

  return !blockedPatterns.some(pattern => pattern.test(content));
}
```

### 6.5. Monitoring i Logging

```typescript
// Nie loguj wrażliwych danych
function logRequest(participantId: string): void {
  console.log({
    timestamp: new Date().toISOString(),
    action: 'ai_generation_request',
    participantId, // OK - internal ID
    // ❌ NIE loguj: userPreferences, apiKey, tokens
  });
}

function logError(error: OpenRouterError): void {
  console.error({
    timestamp: new Date().toISOString(),
    errorCode: error.code,
    errorMessage: error.message,
    isRetryable: error.isRetryable,
    // metadata już jest sanitized przez OpenRouterError
    metadata: error.metadata
  });
}
```

### 6.6. CORS i HTTP Headers

```typescript
// W API endpoint
const allowedOrigins = [
  process.env.PUBLIC_SITE_URL,
  'http://localhost:4321' // dev only
];

function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return origin ? allowedOrigins.includes(origin) : false;
}
```

## 7. Plan wdrożenia krok po kroku

### Krok 1: Setup środowiska (15 min)

1. **Utwórz zmienne środowiskowe:**

```bash
# .env
OPENROUTER_API_KEY=your_api_key_here
AI_MODEL=openai/gpt-4o-mini
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7
PUBLIC_SITE_URL=http://localhost:4321
```

2. **Dodaj typy dla environment:**

```typescript
// src/env.d.ts
interface ImportMetaEnv {
  readonly OPENROUTER_API_KEY: string;
  readonly AI_MODEL?: string;
  readonly AI_MAX_TOKENS?: string;
  readonly AI_TEMPERATURE?: string;
  readonly PUBLIC_SITE_URL?: string;
}
```

3. **Zainstaluj zależności (jeśli potrzebne):**

```bash
npm install zod
```

### Krok 2: Utwórz strukturę typów (20 min)

**Lokalizacja: `src/lib/services/openrouter.types.ts`**

```typescript
// Konfiguracja
export interface OpenRouterConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  timeout?: number;
  maxRetries?: number;
  baseDelay?: number;
}

// Request/Response
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: {
      type: 'object';
      properties: Record<string, JsonSchemaProperty>;
      required: string[];
      additionalProperties: boolean;
    };
  };
}

export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'array' | 'object' | 'boolean';
  description?: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
}

export interface OpenRouterAPIResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
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
  language?: 'pl' | 'en';
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
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SERVER_ERROR'
  | 'BAD_GATEWAY'
  | 'SERVICE_UNAVAILABLE'
  | 'GATEWAY_TIMEOUT'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'INVALID_JSON'
  | 'INVALID_INPUT'
  | 'GENERATION_LIMIT_EXCEEDED'
  | 'UNKNOWN_ERROR';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_REQUEST: 'Nieprawidłowe dane wejściowe. Spróbuj ponownie.',
  UNAUTHORIZED: 'Problem z konfiguracją systemu. Skontaktuj się z administratorem.',
  FORBIDDEN: 'Brak dostępu do zasobu.',
  NOT_FOUND: 'Zasób nie został znaleziony.',
  RATE_LIMIT_EXCEEDED: 'Osiągnięto limit API. Spróbuj ponownie za chwilę.',
  SERVER_ERROR: 'Problem z serwerem AI. Spróbuj ponownie.',
  BAD_GATEWAY: 'Problem z połączeniem. Spróbuj ponownie.',
  SERVICE_UNAVAILABLE: 'Serwis AI jest tymczasowo niedostępny.',
  GATEWAY_TIMEOUT: 'Przekroczono czas oczekiwania na odpowiedź.',
  TIMEOUT: 'Generowanie trwa dłużej niż zwykle. Spróbuj ponownie.',
  NETWORK_ERROR: 'Problem z połączeniem sieciowym.',
  INVALID_RESPONSE: 'Otrzymano niepoprawną odpowiedź z serwera.',
  INVALID_JSON: 'Błąd przetwarzania odpowiedzi.',
  INVALID_INPUT: 'Wprowadzone dane są niepoprawne.',
  GENERATION_LIMIT_EXCEEDED: 'Wykorzystałeś wszystkie dostępne generowania AI.',
  UNKNOWN_ERROR: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'
};
```

### Krok 3: Utwórz klasę OpenRouterError (15 min)

**Lokalizacja: `src/lib/services/openrouter.error.ts`**

```typescript
import type { ErrorCode } from './openrouter.types';

export class OpenRouterError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public isRetryable: boolean = false,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'OpenRouterError';

    if (this.metadata) {
      this.metadata = this.sanitizeMetadata(this.metadata);
    }
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata };

    delete sanitized.apiKey;
    delete sanitized.authorization;

    if (sanitized.headers?.Authorization) {
      sanitized.headers.Authorization = '[REDACTED]';
    }

    return sanitized;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      isRetryable: this.isRetryable,
      metadata: this.metadata
    };
  }
}

export function getUserFriendlyMessage(error: OpenRouterError): string {
  const ERROR_MESSAGES = {
    // ... copy from types
  };
  return ERROR_MESSAGES[error.code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}
```

### Krok 4: Implementuj główną klasę OpenRouterService (60 min)

**Lokalizacja: `src/lib/services/openrouter.service.ts`**

```typescript
import { z } from 'zod';
import { OpenRouterError } from './openrouter.error';
import type {
  OpenRouterConfig,
  Message,
  ResponseFormat,
  OpenRouterAPIResponse,
  SantaLetterResponse,
  GenerationOptions,
  RateLimitStatus
} from './openrouter.types';

const ConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().default('openai/gpt-4o-mini'),
  maxTokens: z.number().int().min(1).max(4096).default(1000),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(1.0),
  timeout: z.number().int().min(1000).max(60000).default(15000),
  maxRetries: z.number().int().min(0).max(5).default(2),
  baseDelay: z.number().int().min(500).max(5000).default(1000),
});

export class OpenRouterService {
  private readonly config: Required<OpenRouterConfig>;
  private readonly httpClient: typeof fetch;
  private readonly apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(config?: OpenRouterConfig) {
    const mergedConfig = {
      apiKey: config?.apiKey || import.meta.env.OPENROUTER_API_KEY,
      model: config?.model || import.meta.env.AI_MODEL || 'openai/gpt-4o-mini',
      maxTokens: config?.maxTokens || parseInt(import.meta.env.AI_MAX_TOKENS || '1000'),
      temperature: config?.temperature || parseFloat(import.meta.env.AI_TEMPERATURE || '0.7'),
      topP: config?.topP || 1.0,
      timeout: config?.timeout || 15000,
      maxRetries: config?.maxRetries || 2,
      baseDelay: config?.baseDelay || 1000,
    };

    this.config = ConfigSchema.parse(mergedConfig);
    this.httpClient = fetch;
  }

  // === PUBLIC METHODS ===

  async generateSantaLetter(
    userPreferences: string,
    options?: GenerationOptions
  ): Promise<SantaLetterResponse> {
    const startTime = Date.now();

    const systemPrompt = this.buildSystemPrompt(
      options?.language || 'pl'
    );

    const messages = this.buildMessages(systemPrompt, userPreferences);
    const responseFormat = this.buildResponseFormat();

    const apiResponse = await this.makeRequest(messages, responseFormat);
    const parsedResponse = this.parseResponse(apiResponse);

    parsedResponse.metadata.generationTime = Date.now() - startTime;

    return parsedResponse;
  }

  async validateRateLimit(
    participantId: string,
    isRegistered: boolean
  ): Promise<RateLimitStatus> {
    // TODO: Implement database query
    // For now, return mock data
    return {
      canGenerate: true,
      generationsUsed: 0,
      generationsRemaining: isRegistered ? 5 : 3,
      maxGenerations: isRegistered ? 5 : 3,
      lastGeneratedAt: null
    };
  }

  async incrementGenerationCount(participantId: string): Promise<void> {
    // TODO: Implement database update
  }

  async testConnection(): Promise<boolean> {
    try {
      const messages = [
        { role: 'user' as const, content: 'test' }
      ];
      await this.makeRequest(messages, this.buildResponseFormat());
      return true;
    } catch {
      return false;
    }
  }

  // === PRIVATE METHODS ===

  private buildSystemPrompt(language: string = 'pl'): string {
    const prompts = {
      pl: `Jesteś asystentem pomagającym tworzyć listy do świętego Mikołaja na Gwiazdkę (Secret Santa).

Zadanie:
Na podstawie preferencji użytkownika wygeneruj ciepły, narracyjny list do Mikołaja zawierający listę życzeń.

Wytyczne:
1. Użyj formy listu (np. "Drogi Mikołaju,..." lub "Hej Mikołaju!")
2. Ton ma być ciepły, personalny i świąteczny (nie oficjalny czy suchy)
3. Zawrzyj 3-5 konkretnych pomysłów na prezenty w narracji listu
4. Bądź konkretny - podawaj tytuły książek, gatunki muzyki, rodzaje produktów
5. Dodaj emoji świąteczne (🎁, 🎄, ⭐, 🎅, ❄️, 🔔)
6. Maksymalnie 1000 znaków
7. Odpowiadaj TYLKO po polsku
8. Zakończ list w ciepły, świąteczny sposób

Przykład struktury:
Cześć Mikołaju! 🎅

[Wprowadzenie z ciepłym tonem]
[2-3 zdania z konkretnymi propozycjami prezentów, wplecionymi w narrację]
[Ciepłe zakończenie ze świątecznymi życzeniami]

Wesołych Świąt! ⭐`
    };

    return prompts[language as keyof typeof prompts] || prompts.pl;
  }

  private buildMessages(systemPrompt: string, userPrompt: string): Message[] {
    return [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: this.sanitizeUserInput(userPrompt)
      }
    ];
  }

  private buildResponseFormat(): ResponseFormat {
    return {
      type: 'json_schema',
      json_schema: {
        name: 'santa_letter_response',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            letter_content: {
              type: 'string',
              description: 'Generated letter to Santa with wishlist in narrative form'
            },
            suggested_gifts: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of 3-5 concrete gift suggestions'
            }
          },
          required: ['letter_content', 'suggested_gifts'],
          additionalProperties: false
        }
      }
    };
  }

  private async makeRequest(
    messages: Message[],
    responseFormat: ResponseFormat
  ): Promise<OpenRouterAPIResponse> {
    const requestBody = {
      model: this.config.model,
      messages,
      response_format: responseFormat,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      top_p: this.config.topP
    };

    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321',
      'X-Title': 'Secret Santa App'
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        const response = await this.httpClient(this.apiEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw await this.handleAPIError(response);
        }

        const data = await response.json();
        return data as OpenRouterAPIResponse;

      } catch (error) {
        lastError = error as Error;

        if (error instanceof OpenRouterError && !error.isRetryable) {
          throw error;
        }

        if (attempt < this.config.maxRetries) {
          const delay = this.config.baseDelay * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }
      }
    }

    throw lastError || new OpenRouterError(
      'UNKNOWN_ERROR',
      'Failed to complete request after retries'
    );
  }

  private async handleAPIError(response: Response): Promise<OpenRouterError> {
    let errorBody: any;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: response.statusText };
    }

    const errorMap: Record<number, { code: any; isRetryable: boolean }> = {
      400: { code: 'INVALID_REQUEST', isRetryable: false },
      401: { code: 'UNAUTHORIZED', isRetryable: false },
      403: { code: 'FORBIDDEN', isRetryable: false },
      404: { code: 'NOT_FOUND', isRetryable: false },
      429: { code: 'RATE_LIMIT_EXCEEDED', isRetryable: false },
      500: { code: 'SERVER_ERROR', isRetryable: true },
      502: { code: 'BAD_GATEWAY', isRetryable: true },
      503: { code: 'SERVICE_UNAVAILABLE', isRetryable: true },
      504: { code: 'GATEWAY_TIMEOUT', isRetryable: true },
    };

    const errorInfo = errorMap[response.status] || {
      code: 'UNKNOWN_ERROR',
      isRetryable: false
    };

    return new OpenRouterError(
      errorInfo.code,
      errorBody.error?.message || errorBody.message || 'Unknown error',
      errorInfo.isRetryable,
      { status: response.status, body: errorBody }
    );
  }

  private sanitizeUserInput(input: string): string {
    let sanitized = input.trim();

    if (sanitized.length > 1000) {
      sanitized = sanitized.slice(0, 1000);
    }

    if (sanitized.length < 10) {
      throw new OpenRouterError(
        'INVALID_INPUT',
        'User preferences must be at least 10 characters',
        false
      );
    }

    sanitized = sanitized
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');

    return sanitized;
  }

  private parseResponse(apiResponse: OpenRouterAPIResponse): SantaLetterResponse {
    try {
      const content = apiResponse.choices[0]?.message?.content;

      if (!content) {
        throw new OpenRouterError(
          'INVALID_RESPONSE',
          'No content in API response',
          false
        );
      }

      const parsed = JSON.parse(content);

      if (!parsed.letter_content || !Array.isArray(parsed.suggested_gifts)) {
        throw new OpenRouterError(
          'INVALID_RESPONSE',
          'Response does not match expected schema',
          false
        );
      }

      if (parsed.letter_content.length > 1000) {
        parsed.letter_content = parsed.letter_content.slice(0, 1000);
      }

      return {
        letterContent: parsed.letter_content,
        suggestedGifts: parsed.suggested_gifts.slice(0, 5),
        metadata: {
          model: apiResponse.model,
          tokensUsed: apiResponse.usage?.total_tokens || 0,
          generationTime: 0
        }
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new OpenRouterError(
          'INVALID_JSON',
          'Failed to parse JSON response',
          false,
          { originalError: error }
        );
      }
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Krok 5: Rozszerz bazę danych (20 min)

**Utwórz migration w Supabase:**

```sql
-- Migration: Add AI generation tracking to wishes table

-- Add columns
ALTER TABLE wishes
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_generation_count_per_group INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_last_generated_at TIMESTAMPTZ;

-- Add index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_wishes_ai_generation_count
ON wishes(participant_id, ai_generation_count_per_group);

-- Create function for atomic increment
CREATE OR REPLACE FUNCTION increment_ai_generation_count(p_participant_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE wishes
  SET
    ai_generation_count_per_group = COALESCE(ai_generation_count_per_group, 0) + 1,
    ai_last_generated_at = NOW(),
    ai_generated = TRUE
  WHERE participant_id = p_participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_ai_generation_count TO authenticated, anon;
```

### Krok 6: Utwórz API Endpoint (30 min)

**Lokalizacja: `src/pages/api/participants/[participantId]/wishlist/generate-ai.ts`**

```typescript
import type { APIRoute } from 'astro';
import { OpenRouterService } from '@/lib/services/openrouter.service';
import { OpenRouterError, getUserFriendlyMessage } from '@/lib/services/openrouter.error';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const { participantId } = params;

    if (!participantId) {
      return new Response(
        JSON.stringify({ error: 'Participant ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await request.json();
    const { prompt, isRegistered } = body;

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize service
    const openRouterService = new OpenRouterService();

    // Check rate limit
    const rateLimitStatus = await openRouterService.validateRateLimit(
      participantId,
      isRegistered || false
    );

    if (!rateLimitStatus.canGenerate) {
      return new Response(
        JSON.stringify({
          error: 'GENERATION_LIMIT_EXCEEDED',
          message: 'Wykorzystałeś wszystkie dostępne generowania AI',
          remaining_generations: 0
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate letter
    const result = await openRouterService.generateSantaLetter(
      prompt,
      { language: 'pl' }
    );

    // Increment counter
    await openRouterService.incrementGenerationCount(participantId);

    // Return success response
    return new Response(
      JSON.stringify({
        generated_content: result.letterContent,
        suggested_gifts: result.suggestedGifts,
        remaining_generations: rateLimitStatus.generationsRemaining - 1,
        can_generate_more: rateLimitStatus.generationsRemaining - 1 > 0,
        metadata: result.metadata
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AI Generation Error]', error);

    if (error instanceof OpenRouterError) {
      return new Response(
        JSON.stringify({
          error: error.code,
          message: getUserFriendlyMessage(error),
          is_retryable: error.isRetryable
        }),
        {
          status: error.code === 'INVALID_INPUT' ? 400 : 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'UNKNOWN_ERROR',
        message: 'Wystąpił nieoczekiwany błąd'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### Krok 7: Utwórz testy jednostkowe (40 min)

**Lokalizacja: `src/lib/services/__tests__/openrouter.service.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenRouterService } from '../openrouter.service';
import { OpenRouterError } from '../openrouter.error';

describe('OpenRouterService', () => {
  let service: OpenRouterService;

  beforeEach(() => {
    service = new OpenRouterService({
      apiKey: 'test-key',
      timeout: 5000,
      maxRetries: 1
    });
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultService = new OpenRouterService();
      expect(defaultService).toBeDefined();
    });

    it('should throw error if API key is missing', () => {
      expect(() => new OpenRouterService({ apiKey: '' })).toThrow();
    });
  });

  describe('generateSantaLetter', () => {
    it('should generate letter successfully', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'openai/gpt-4o-mini,
          choices: [{
            message: {
              content: JSON.stringify({
                letter_content: 'Test letter',
                suggested_gifts: ['gift1', 'gift2']
              })
            }
          }],
          usage: { total_tokens: 100 }
        })
      });

      const result = await service.generateSantaLetter('test preferences');

      expect(result.letterContent).toBe('Test letter');
      expect(result.suggestedGifts).toEqual(['gift1', 'gift2']);
      expect(result.metadata.tokensUsed).toBe(100);
    });

    it('should throw error for short preferences', async () => {
      await expect(
        service.generateSantaLetter('short')
      ).rejects.toThrow(OpenRouterError);
    });

    it('should sanitize long preferences', async () => {
      const longText = 'a'.repeat(2000);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'test',
          choices: [{
            message: {
              content: JSON.stringify({
                letter_content: 'Test',
                suggested_gifts: []
              })
            }
          }]
        })
      });

      await service.generateSantaLetter(longText);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.messages[1].content.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('error handling', () => {
    it('should handle timeout', async () => {
      global.fetch = vi.fn().mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 10000))
      );

      await expect(
        service.generateSantaLetter('test preferences')
      ).rejects.toThrow();
    });

    it('should retry on 500 error', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ message: 'Server error' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            model: 'test',
            choices: [{
              message: {
                content: JSON.stringify({
                  letter_content: 'Test',
                  suggested_gifts: []
                })
              }
            }]
          })
        });
      });

      await service.generateSantaLetter('test preferences');
      expect(callCount).toBe(2);
    });

    it('should not retry on 401 error', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Unauthorized' })
        });
      });

      await expect(
        service.generateSantaLetter('test preferences')
      ).rejects.toThrow(OpenRouterError);

      expect(callCount).toBe(1);
    });
  });
});
```

### Krok 8: Integracja z frontendem (45 min)

**Utwórz React hook:**

**Lokalizacja: `src/hooks/useAIGeneration.ts`**

```typescript
import { useState } from 'react';

interface UseAIGenerationResult {
  generate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
  generatedContent: string | null;
  remainingGenerations: number | null;
}

export function useAIGeneration(
  participantId: string,
  isRegistered: boolean
): UseAIGenerationResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [remainingGenerations, setRemainingGenerations] = useState<number | null>(null);

  const generate = async (prompt: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/participants/${participantId}/wishlist/generate-ai`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, isRegistered })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Wystąpił błąd podczas generowania');
      }

      setGeneratedContent(data.generated_content);
      setRemainingGenerations(data.remaining_generations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generate,
    isGenerating,
    error,
    generatedContent,
    remainingGenerations
  };
}
```

### Krok 9: Dokumentacja i monitoring (20 min)

**Utwórz README dla service:**

**Lokalizacja: `src/lib/services/README.md`**

```markdown
# OpenRouter Service

## Quick Start

```typescript
import { OpenRouterService } from '@/lib/services/openrouter.service';

const service = new OpenRouterService();

const result = await service.generateSantaLetter(
  'Lubię książki fantasy i dobrą kawę',
);

console.log(result.letterContent);
```

## Configuration

Environment variables:
- `OPENROUTER_API_KEY` - Required
- `AI_MODEL` - Optional (default: openai/gpt-4o-mini)
- `AI_MAX_TOKENS` - Optional (default: 1000)
- `AI_TEMPERATURE` - Optional (default: 0.7)

## Error Handling

```typescript
try {
  const result = await service.generateSantaLetter(...);
} catch (error) {
  if (error instanceof OpenRouterError) {
    console.error(error.code, error.message);
    if (error.isRetryable) {
      // Can retry
    }
  }
}
```

## Rate Limiting

- Unregistered users: 3 generations per group
- Registered users: 5 generations per group

Check before generating:
```typescript
const status = await service.validateRateLimit(participantId, isRegistered);
if (!status.canGenerate) {
  // Show error message
}
```
```

### Krok 10: Testy integracyjne i deployment (30 min)

1. **Test lokalnie:**

```bash
npm run dev
# Testuj endpoint ręcznie lub przez Postman
```

2. **Uruchom testy:**

```bash
npm run test
```

3. **Sprawdź pokrycie kodu:**

```bash
npm run test:coverage
```

4. **Deploy do Cloudflare Pages:**

```bash
npm run build
# Cloudflare Pages automatycznie deployuje z GitHub
```

5. **Monitoruj logi produkcyjne:**

- Sprawdź logi w Cloudflare Dashboard
- Monitoruj koszty w OpenRouter Dashboard
- Ustaw alerty dla przekroczenia budżetu

---

## Checklist wdrożenia

- [ ] Zmienne środowiskowe skonfigurowane
- [ ] Typy TypeScript zdefiniowane
- [ ] Klasa OpenRouterError utworzona
- [ ] Główna klasa OpenRouterService zaimplementowana
- [ ] Migracja bazy danych wykonana
- [ ] API endpoint utworzony
- [ ] Testy jednostkowe napisane i przechodzą
- [ ] Hook React utworzony
- [ ] Dokumentacja napisana
- [ ] Testy integracyjne wykonane
- [ ] Aplikacja zdeployowana
- [ ] Monitoring skonfigurowany

## Szacowany czas implementacji

- Krok 1-3: ~50 minut (setup + typy + error handling)
- Krok 4: ~60 minut (główna logika service)
- Krok 5: ~20 minut (baza danych)
- Krok 6: ~30 minut (API endpoint)
- Krok 7: ~40 minut (testy jednostkowe)
- Krok 8: ~45 minut (integracja frontend)
- Krok 9-10: ~50 minut (dokumentacja + deployment)

**Total: ~5 godzin**

## Troubleshooting

### Problem: API zwraca 401 Unauthorized
- Sprawdź czy `OPENROUTER_API_KEY` jest prawidłowo ustawiony
- Sprawdź czy klucz nie wygasł w panelu OpenRouter

### Problem: Timeout przy generowaniu
- Zwiększ `timeout` w konfiguracji
- Sprawdź połączenie sieciowe
- Sprawdź status OpenRouter API (status.openrouter.ai)

### Problem: Niepoprawny format JSON w odpowiedzi
- Sprawdź czy `response_format` jest prawidłowo sformatowany
- Zweryfikuj czy model wspiera structured outputs
- Dodaj fallback na plain text parsing

### Problem: Przekroczono rate limit
- Zaimplementuj queue dla requestów
- Dodaj user-facing komunikat o limicie
- Rozważ upgrade planu OpenRouter
