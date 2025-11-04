# OpenRouter Service

Serwis `OpenRouterService` stanowi warstwę abstrakcji nad OpenRouter API, umożliwiającą integrację z modelami Large Language Models (LLM) w aplikacji Secret Santa. Głównym celem serwisu jest generowanie spersonalizowanych listów do świętego Mikołaja na podstawie preferencji użytkownika.

## Spis treści

- [Instalacja](#instalacja)
- [Konfiguracja](#konfiguracja)
- [Szybki start](#szybki-start)
- [API Reference](#api-reference)
- [Obsługa błędów](#obsługa-błędów)
- [Rate limiting](#rate-limiting)
- [Bezpieczeństwo](#bezpieczeństwo)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Najlepsze praktyki](#najlepsze-praktyki)

## Instalacja

Serwis jest już zintegrowany z projektem. Wymagane zależności zostały zainstalowane:

- `zod` - walidacja konfiguracji
- `typescript` - typy i interfejsy

## Konfiguracja

### Zmienne środowiskowe

Dodaj do pliku `.env` następujące zmienne:

```bash
# Wymagane
OPENROUTER_API_KEY=your_api_key_here

# Opcjonalne
AI_MODEL=openai/gpt-4o-mini
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7
PUBLIC_SITE_URL=http://localhost:4321
```

### Domyślne wartości konfiguracji

```typescript
{
  apiKey: process.env.OPENROUTER_API_KEY, // wymagane
  model: 'openai/gpt-4o-mini',    // domyślne
  maxTokens: 1000,                        // domyślne
  temperature: 0.7,                       // domyślne
  topP: 1.0,                             // domyślne
  timeout: 15000,                         // 15 sekund
  maxRetries: 2,                          // maksymalnie 3 próby
  baseDelay: 1000                         // 1 sekunda bazowy delay
}
```

## Szybki start

### Użycie w API endpoint

```typescript
import { OpenRouterService } from "@/lib/services/openrouter.service";

export const POST: APIRoute = async ({ params, request, locals }) => {
  const supabase = locals.supabase;
  const openRouterService = new OpenRouterService(supabase);

  try {
    // Sprawdź rate limit
    const rateLimit = await openRouterService.validateRateLimit(participantId, isRegistered);

    if (!rateLimit.canGenerate) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
    }

    // Generuj list
    const result = await openRouterService.generateSantaLetter(userPreferences, { language: "pl" });

    // Inkrementuj licznik
    await openRouterService.incrementGenerationCount(participantId);

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error("Generation error:", error);
    return new Response(JSON.stringify({ error: "Generation failed" }), { status: 500 });
  }
};
```

### Użycie w React hook

```typescript
import { useAIGeneration } from '@/hooks/useAIGeneration';

function SantaLetterGenerator({ participantId, isRegistered }) {
  const {
    generate,
    isGenerating,
    error,
    generatedContent,
    suggestedGifts,
    remainingGenerations,
    canGenerateMore,
    clearError,
    reset
  } = useAIGeneration(participantId, isRegistered);

  const handleGenerate = async (preferences) => {
    await generate(preferences);
  };

  return (
    <div>
      {error && (
        <div className="error">
          {error}
          <button onClick={clearError}>Zamknij</button>
        </div>
      )}

      <textarea
        placeholder="Opisz swoje preferencje..."
        disabled={isGenerating || !canGenerateMore}
      />

      <button
        onClick={() => handleGenerate(prompt)}
        disabled={isGenerating || !canGenerateMore}
      >
        {isGenerating ? 'Generuję...' : 'Generuj list'}
      </button>

      {remainingGenerations !== null && (
        <p>Pozostało generowań: {remainingGenerations}</p>
      )}

      {generatedContent && (
        <div className="generated-letter">
          <h3>Wygenerowany list:</h3>
          <p>{generatedContent}</p>

          {suggestedGifts.length > 0 && (
            <div>
              <h4>Sugerowane prezenty:</h4>
              <ul>
                {suggestedGifts.map((gift, index) => (
                  <li key={index}>{gift}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## API Reference

### Konstruktor

```typescript
constructor(supabase: SupabaseClient, config?: OpenRouterConfig)
```

**Parametry:**

- `supabase`: Instancja SupabaseClient (wymagane)
- `config`: Opcjonalna konfiguracja nadpisująca domyślne wartości

### Metody publiczne

#### `generateSantaLetter(userPreferences, options?)`

Generuje spersonalizowany list do świętego Mikołaja.

```typescript
async generateSantaLetter(
  userPreferences: string,
  options?: GenerationOptions
): Promise<SantaLetterResponse>
```

**Parametry:**

- `userPreferences`: Preferencje użytkownika (10-1000 znaków)
- `options`: Opcjonalne parametry generowania

**Zwraca:**

```typescript
interface SantaLetterResponse {
  letterContent: string; // Wygenerowany list (max 1000 znaków)
  suggestedGifts: string[]; // Lista propozycji prezentów (3-5)
  metadata: {
    model: string; // Użyty model
    tokensUsed: number; // Zużyte tokeny
    generationTime: number; // Czas generowania w ms
  };
}
```

**Przykład:**

```typescript
const result = await service.generateSantaLetter("Uwielbiam fantasy książki i dobrą kawę", { language: "pl" });

console.log(result.letterContent);
// "Cześć Mikołaju! 🎅\n\nW tym roku byłam/em grzeczna/y..."

console.log(result.suggestedGifts);
// ["Fantastyczna książka fantasy", "Zestaw dobrej kawy", "Ciepły szalik"]
```

#### `validateRateLimit(participantId, isRegistered)`

Sprawdza czy użytkownik może wykonać generowanie.

```typescript
async validateRateLimit(
  participantId: string | number,
  isRegistered: boolean
): Promise<RateLimitStatus>
```

**Parametry:**

- `participantId`: ID uczestnika
- `isRegistered`: Czy użytkownik jest zarejestrowany

**Zwraca:**

```typescript
interface RateLimitStatus {
  canGenerate: boolean;
  generationsUsed: number;
  generationsRemaining: number;
  maxGenerations: number; // 5 dla zarejestrowanych, 3 dla niezarejestrowanych
  lastGeneratedAt: Date | null;
}
```

#### `incrementGenerationCount(participantId)`

Zwiększa licznik generowań dla użytkownika.

```typescript
async incrementGenerationCount(participantId: string | number): Promise<void>
```

#### `testConnection()`

Testuje połączenie z OpenRouter API.

```typescript
async testConnection(): Promise<boolean>
```

**Zwraca:** `true` jeśli połączenie działa, `false` w przeciwnym przypadku.

## Obsługa błędów

Serwis używa klasy `OpenRouterError` do obsługi błędów:

```typescript
import { OpenRouterError, getUserFriendlyMessage } from "./openrouter.error";

try {
  const result = await service.generateSantaLetter(preferences);
} catch (error) {
  if (error instanceof OpenRouterError) {
    console.error(`[${error.code}] ${error.message}`);

    // Pobierz przyjazny komunikat dla użytkownika
    const userMessage = getUserFriendlyMessage(error);

    // Sprawdź czy błąd jest ponawialny
    if (error.isRetryable) {
      // Można ponowić próbę
    }
  }
}
```

### Kody błędów

| Kod                         | Opis                           | HTTP Status | Ponawialny |
| --------------------------- | ------------------------------ | ----------- | ---------- |
| `INVALID_INPUT`             | Nieprawidłowe dane wejściowe   | 400         | Nie        |
| `UNAUTHORIZED`              | Nieprawidłowy API key          | 401         | Nie        |
| `FORBIDDEN`                 | Brak dostępu                   | 403         | Nie        |
| `NOT_FOUND`                 | Zasób nie znaleziony           | 404         | Nie        |
| `RATE_LIMIT_EXCEEDED`       | Przekroczono limit API         | 429         | Nie        |
| `SERVER_ERROR`              | Błąd serwera OpenRouter        | 500         | Tak        |
| `BAD_GATEWAY`               | Problem z gateway              | 502         | Tak        |
| `SERVICE_UNAVAILABLE`       | Serwis niedostępny             | 503         | Tak        |
| `GATEWAY_TIMEOUT`           | Timeout gateway                | 504         | Tak        |
| `TIMEOUT`                   | Timeout klienta                | 408         | Tak        |
| `NETWORK_ERROR`             | Błąd sieci                     | -           | Tak        |
| `INVALID_RESPONSE`          | Nieprawidłowa odpowiedź        | 502         | Tak        |
| `INVALID_JSON`              | Błąd parsowania JSON           | 502         | Tak        |
| `GENERATION_LIMIT_EXCEEDED` | Przekroczono limit użytkownika | 429         | Nie        |
| `UNKNOWN_ERROR`             | Nieznany błąd                  | 500         | Nie        |

## Rate limiting

Serwis implementuje dwupoziomowe rate limiting:

### Poziom aplikacji

- **Zarejestrowani użytkownicy**: 5 generowań na grupę
- **Niezarejestrowani użytkownicy**: 3 generowania na grupę

Licznik jest przechowywany w tabeli `wishes` w kolumnie `ai_generation_count_per_group`.

### Poziom API (OpenRouter)

- Zależy od planu OpenRouter
- Serwis automatycznie obsługuje rate limiting API
- Używa retry logic z exponential backoff

## Bezpieczeństwo

### Zarządzanie API key

- ✅ Klucz API przechowywany tylko w zmiennych środowiskowych
- ✅ Nigdy nie logowany ani wysyłany do klienta
- ✅ Sanitizacja metadanych błędów (usuwanie wrażliwych danych)

### Walidacja danych wejściowych

- ✅ Walidacja długości preferencji (10-1000 znaków)
- ✅ Basic XSS protection (usuwanie tagów `<script>` i `<iframe>`)
- ✅ Walidacja schematu odpowiedzi JSON

### Bezpieczeństwo API

- ✅ Timeout dla wszystkich żądań (15 sekund domyślnie)
- ✅ Retry tylko dla błędów przejściowych
- ✅ Bezpieczne nagłówki HTTP
- ✅ Walidacja referera

## Monitoring

### Logowanie

Serwis automatycznie loguje:

- Wszystkie błędy z kodem i komunikatem
- Informacje o retry próbach
- Czas generowania i zużycie tokenów
- Rate limiting events

### Metryki

Przechowywane w odpowiedzi API:

- `model`: Użyty model AI
- `tokensUsed`: Zużyte tokeny
- `generationTime`: Czas generowania w milisekundach

## Troubleshooting

### Problem: 401 Unauthorized

**Przyczyna:** Nieprawidłowy lub wygasły API key OpenRouter.

**Rozwiązanie:**

1. Sprawdź wartość `OPENROUTER_API_KEY` w `.env`
2. Upewnij się, że klucz jest aktywny w panelu OpenRouter
3. Sprawdź czy klucz nie zawiera dodatkowych znaków (spacje, nowe linie)

### Problem: Rate limit exceeded

**Przyczyna:** Przekroczono limit generowań użytkownika lub API.

**Rozwiązanie:**

1. Sprawdź `remainingGenerations` w odpowiedzi
2. Dla użytkowników: poczekaj na reset limitu lub zarejestruj konto
3. Dla API: poczekaj kilka minut, OpenRouter automatycznie resetuje limity

### Problem: Timeout

**Przyczyna:** Generowanie trwa zbyt długo.

**Rozwiązanie:**

1. Sprawdź połączenie internetowe
2. Spróbuj ponownie (serwis automatycznie retry)
3. Jeśli problem trwa, sprawdź status OpenRouter API

### Problem: Invalid response schema

**Przyczyna:** Model zwrócił odpowiedź w nieoczekiwanym formacie.

**Rozwiązanie:**

1. Sprawdź czy używasz poprawnego modelu
2. Problem zostanie automatycznie naprawiony w następnych próbach
3. Jeśli trwa, skontaktuj się z administratorem

### Problem: Database connection errors

**Przyczyna:** Problemy z połączeniem do Supabase.

**Rozwiązanie:**

1. Sprawdź konfigurację Supabase
2. Upewnij się, że migracje zostały wykonane
3. Sprawdź uprawnienia użytkownika

## Najlepsze praktyki

### Użycie w komponentach React

```typescript
function AIGenerator({ participantId }) {
  const { generate, isGenerating, error, canGenerateMore } = useAIGeneration(participantId);

  // Zawsze sprawdzaj canGenerateMore przed wywołaniem generate
  const handleSubmit = async (preferences) => {
    if (!canGenerateMore) {
      alert('Wykorzystałeś wszystkie dostępne generowania');
      return;
    }

    await generate(preferences);
  };

  // Obsługuj loading state
  return (
    <button disabled={isGenerating} onClick={handleSubmit}>
      {isGenerating ? 'Generuję...' : 'Generuj'}
    </button>
  );
}
```

### Obsługa błędów

```typescript
const { generate, error, clearError } = useAIGeneration(participantId);

useEffect(() => {
  if (error) {
    // Pokaż użytkownikowi błąd
    toast.error(error);

    // Automatycznie wyczyść błąd po 5 sekundach
    const timer = setTimeout(clearError, 5000);
    return () => clearTimeout(timer);
  }
}, [error, clearError]);
```

### Optymalizacja wydajności

```typescript
// Unikaj niepotrzebnych re-renderów
const { generate, isGenerating } = useAIGeneration(participantId);

// Memoize funkcję obsługującą submit
const handleSubmit = useCallback(
  async (preferences) => {
    await generate(preferences);
  },
  [generate]
);
```

### Testowanie

```typescript
// W testach mockuj fetch
import { vi } from "vitest";

global.fetch = vi.fn();

// Testuj różne scenariusze błędów
it("should handle API errors", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status: 429,
    json: async () => ({ error: { code: "RATE_LIMIT_EXCEEDED" } }),
  });

  // Test implementation
});
```

---

## Checklist przed deploymentem

- [ ] Zmienne środowiskowe skonfigurowane w środowisku produkcyjnym
- [ ] Migracja bazy danych wykonana na produkcji
- [ ] Testy jednostkowe przechodzą (100% pokrycie)
- [ ] Testy integracyjne wykonane
- [ ] Monitoring skonfigurowany (logi, alerty)
- [ ] Dokumentacja zaktualizowana
- [ ] Bezpieczeństwo sprawdzone (API key, rate limiting)

## Kontakt

W przypadku problemów z serwisem:

1. Sprawdź logi aplikacji
2. Zweryfikuj konfigurację środowiska
3. Skontaktuj się z zespołem developerskim
