# API Endpoint Implementation Plan: Elf Access Endpoints (v1.1.0)

## 1. Przegląd punktów końcowych

### 1.1. GET /api/participants/:participantId/elf-result

Endpoint umożliwia zalogowanemu elfowi (zarejestrowanemu użytkownikowi) wyświetlenie wyniku losowania uczestnika, któremu elf pomaga. Elf widzi, kogo wylosował pomagany uczestnik, wraz z listą życzeń tej osoby oraz szczegółami grupy.

**Kluczowe wymagania:**
- Elf musi być zalogowany (mieć `user_id`)
- Elf musi mieć przypisany `elf_for_participant_id`
- Losowanie musi być zakończone (assignment exists)
- Dostęp jest śledzony przez timestamp `elf_accessed_at`

### 1.2. POST /api/participants/:participantId/track-elf-access

Endpoint śledzi, kiedy elf po raz pierwszy uzyskał dostęp do wyniku losowania pomaganego uczestnika. Ustawia timestamp `elf_accessed_at` tylko przy pierwszym dostępie (jeśli pole jest NULL).

**Kluczowe wymagania:**
- Elf musi być zalogowany
- Timestamp jest ustawiany tylko raz (idempotentność)
- Służy do analityki zaangażowania elfów

## 2. Szczegóły żądania

### 2.1. GET /api/participants/:participantId/elf-result

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/participants/:participantId/elf-result`
- **Parametry:**
  - **Wymagane:**
    - `participantId` (path parameter): ID uczestnika (elf), który wykonuje żądanie
    - `Authorization` (header): Bearer token zalogowanego użytkownika
  - **Opcjonalne:** Brak

- **Request Headers:**
  ```
  Authorization: Bearer {supabase_access_token}
  ```

- **Request Body:** Brak

### 2.2. POST /api/participants/:participantId/track-elf-access

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/participants/:participantId/track-elf-access`
- **Parametry:**
  - **Wymagane:**
    - `participantId` (path parameter): ID uczestnika (elf)
    - `Authorization` (header): Bearer token zalogowanego użytkownika
  - **Opcjonalne:** Brak

- **Request Headers:**
  ```
  Authorization: Bearer {supabase_access_token}
  ```

- **Request Body:** Brak

## 3. Wykorzystywane typy

### 3.1. Response DTOs

**ElfResultResponseDTO** (`src/types.ts`):
```typescript
export interface ElfResultResponseDTO {
  assignment: {
    receiverName: string;
    receiverWishlist: string;
    receiverWishlistHtml: string;
  };
  group: {
    id: number;
    name: string;
    budget: number;
    endDate: string; // ISO 8601 format
  };
  helpedParticipant: {
    id: number;
    name: string;
  };
}
```

**TrackElfAccessResponseDTO** (`src/types.ts`):
```typescript
export interface TrackElfAccessResponseDTO {
  success: boolean;
}
```

### 3.2. Command Models

**GetElfResultCommand** (wewnętrzny typ serwisu):
```typescript
interface GetElfResultCommand {
  participantId: number;
  userId: string; // UUID z Supabase Auth
}
```

**TrackElfAccessCommand** (wewnętrzny typ serwisu):
```typescript
interface TrackElfAccessCommand {
  participantId: number;
  userId: string; // UUID z Supabase Auth
}
```

### 3.3. Zod Schemas (walidacja)

**ParticipantIdParamSchema** (`src/pages/api/participants/[participantId]/elf-result.ts`):
```typescript
import { z } from 'zod';

const ParticipantIdParamSchema = z.object({
  participantId: z.string().regex(/^\d+$/).transform(Number)
});
```

## 4. Szczegóły odpowiedzi

### 4.1. GET /api/participants/:participantId/elf-result

**Sukces (200):**
```json
{
  "assignment": {
    "receiverName": "Alice Johnson",
    "receiverWishlist": "I would love a new book about space exploration...",
    "receiverWishlistHtml": "<p>I would love a new book about space exploration...</p>"
  },
  "group": {
    "id": 1,
    "name": "Family Christmas 2025",
    "budget": 150,
    "endDate": "2025-12-25T23:59:59.000Z"
  },
  "helpedParticipant": {
    "id": 3,
    "name": "John Doe"
  }
}
```

**Błędy:**
- **400 Bad Request:**
  ```json
  {
    "error": "Invalid participant ID format",
    "details": "participantId must be a positive integer"
  }
  ```

- **401 Unauthorized:**
  ```json
  {
    "error": "Unauthorized",
    "message": "Missing or invalid authentication token"
  }
  ```

- **403 Forbidden:**
  ```json
  {
    "error": "Forbidden",
    "message": "You are not authorized to access this resource"
  }
  ```
  Przypadki 403:
  - Participant nie należy do zalogowanego użytkownika
  - Participant nie jest elfem (brak `elf_for_participant_id`)

- **404 Not Found:**
  ```json
  {
    "error": "Not Found",
    "message": "Participant not found"
  }
  ```
  Przypadki 404:
  - Participant o podanym ID nie istnieje
  - Pomagany uczestnik nie istnieje
  - Assignment nie istnieje (losowanie nie zostało przeprowadzone)

- **500 Internal Server Error:**
  ```json
  {
    "error": "Internal Server Error",
    "message": "An unexpected error occurred"
  }
  ```

### 4.2. POST /api/participants/:participantId/track-elf-access

**Sukces (200):**
```json
{
  "success": true
}
```

**Błędy:** (Identyczne kody jak w GET, z wyjątkiem 404 dla assignment)
- 400, 401, 403, 404, 500 (jak powyżej)

## 5. Przepływ danych

### 5.1. GET /api/participants/:participantId/elf-result

```
1. [Client] → GET /api/participants/:participantId/elf-result
   Headers: Authorization: Bearer {token}

2. [API Route] → Walidacja parametrów (Zod)
   ↓ (error) → 400 Bad Request

3. [API Route] → Ekstrakcja user.id z Bearer token (Supabase Auth)
   ↓ (error) → 401 Unauthorized

4. [Elf Service] → getElfResult(command)
   ↓
5. [DB Query] → SELECT participant WHERE id = participantId
   ↓ (not found) → 404 Not Found
   ↓ (user_id !== authenticated user) → 403 Forbidden
   ↓ (elf_for_participant_id IS NULL) → 403 Forbidden

6. [DB Query] → SELECT participant WHERE id = elf_for_participant_id
   ↓ (not found) → 404 Not Found (helped participant doesn't exist)

7. [DB Query] → SELECT assignment WHERE giver_id = elf_for_participant_id
   ↓ (not found) → 404 Not Found (draw not completed)

8. [DB Query] → SELECT participant WHERE id = assignment.receiver_id
   ↓ (get receiver details)

9. [DB Query] → SELECT wishes WHERE participant_id = assignment.receiver_id
   ↓ (get wishlist)

10. [Service] → Convert wishlist to HTML (linkify URLs)

11. [DB Query] → SELECT group WHERE id = participant.group_id
    ↓ (get group details)

12. [Service] → Build ElfResultResponseDTO

13. [API Route] → Return 200 with JSON response
```

### 5.2. POST /api/participants/:participantId/track-elf-access

```
1. [Client] → POST /api/participants/:participantId/track-elf-access
   Headers: Authorization: Bearer {token}

2. [API Route] → Walidacja parametrów (Zod)
   ↓ (error) → 400 Bad Request

3. [API Route] → Ekstrakcja user.id z Bearer token
   ↓ (error) → 401 Unauthorized

4. [Elf Service] → trackElfAccess(command)
   ↓
5. [DB Query] → SELECT participant WHERE id = participantId
   ↓ (not found) → 404 Not Found
   ↓ (user_id !== authenticated user) → 403 Forbidden
   ↓ (elf_for_participant_id IS NULL) → 403 Forbidden

6. [DB Update] → UPDATE participant
                 SET elf_accessed_at = NOW()
                 WHERE id = participantId
                 AND elf_accessed_at IS NULL
   ↓
7. [API Route] → Return 200 { success: true }
```

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie (Authentication)

- **Bearer Token:** Wszystkie żądania muszą zawierać token uwierzytelniający Supabase w nagłówku `Authorization`
- **Weryfikacja:** Token jest weryfikowany przez `supabase.auth.getUser()` w API route
- **Walidacja:** Sprawdzenie, czy użytkownik istnieje i token jest ważny
- **Obsługa błędów:** Brak tokenu lub nieprawidłowy token → 401 Unauthorized

### 6.2. Autoryzacja (Authorization)

**Multi-level authorization checks:**

1. **Ownership Check:**
   - Participant o ID z URL musi należeć do zalogowanego użytkownika (`participant.user_id === auth.user.id`)
   - Zapobiega dostępowi do danych innych użytkowników

2. **Elf Status Check:**
   - Participant musi mieć ustawiony `elf_for_participant_id` (nie NULL)
   - Zapobiega dostępowi nie-elfów do endpointów elfowych

3. **Valid Relationship Check:**
   - Helped participant (z `elf_for_participant_id`) musi istnieć
   - Zapobiega dostępowi do nieistniejących lub usuniętych relacji

4. **Draw Completion Check (tylko GET):**
   - Assignment dla helped participant musi istnieć
   - Zapobiega dostępowi do wyników przed zakończeniem losowania

**Forbidden scenarios (403):**
- Próba dostępu do participant innego użytkownika
- Użytkownik nie jest elfem
- Niezarejestrowany participant (brak `user_id`) próbuje użyć tych endpointów

### 6.3. Ochrona danych (Data Protection)

- **Information Disclosure:** Elf widzi tylko wynik losowania pomaganego uczestnika, nie ma dostępu do innych wyników
- **SQL Injection:** Wszystkie zapytania używają Supabase Client z parametryzowanymi zapytaniami
- **XSS Protection:** Wishlist HTML jest generowany przez bezpieczną funkcję `linkifyUrls()`, która escapuje tekst i tylko linki robi klikalnymi
- **CORS:** API endpoints są zabezpieczone na poziomie Astro middleware

### 6.4. Rate Limiting (przyszłość)

- **Zalecenie:** Zaimplementować rate limiting na poziomie middleware
- **Sugestia:** Max 100 requests/minute per user dla GET, 10 requests/minute dla POST
- **Cel:** Zapobieganie abuse i DoS attacks

### 6.5. Audit Trail

- **Tracking:** Timestamp `elf_accessed_at` zapisuje pierwszy dostęp elfa
- **Idempotentność:** Kolejne wywołania POST nie zmieniają timestamp
- **Analytics:** Umożliwia monitorowanie zaangażowania elfów

## 7. Obsługa błędów

### 7.1. Walidacja parametrów wejściowych

**Błąd:** Invalid participantId format
**Kod:** 400 Bad Request
**Przyczyna:** participantId nie jest liczbą całkowitą dodatnią
**Rozwiązanie:** Zod schema z regex `/^\d+$/` i transformacją do Number

### 7.2. Błędy uwierzytelniania

**Błąd:** Missing Authorization header
**Kod:** 401 Unauthorized
**Przyczyna:** Brak nagłówka Authorization
**Rozwiązanie:** Sprawdzenie obecności nagłówka przed wywołaniem `getUser()`

**Błąd:** Invalid or expired token
**Kod:** 401 Unauthorized
**Przyczyna:** Token nieprawidłowy lub wygasły
**Rozwiązanie:** Supabase `getUser()` zwraca error, obsługa w try-catch

### 7.3. Błędy autoryzacji

**Błąd:** Participant doesn't belong to user
**Kod:** 403 Forbidden
**Przyczyna:** `participant.user_id !== auth.user.id`
**Rozwiązanie:** Early return z 403 po sprawdzeniu ownership

**Błąd:** User is not an elf
**Kod:** 403 Forbidden
**Przyczyna:** `participant.elf_for_participant_id IS NULL`
**Rozwiązanie:** Early return z 403 po sprawdzeniu elf status

### 7.4. Błędy zasobów (Not Found)

**Błąd:** Participant not found
**Kod:** 404 Not Found
**Przyczyna:** Participant o podanym ID nie istnieje
**Rozwiązanie:** Sprawdzenie wyniku query, return 404 jeśli null

**Błąd:** Helped participant not found
**Kod:** 404 Not Found
**Przyczyna:** Participant z `elf_for_participant_id` nie istnieje
**Rozwiązanie:** Sprawdzenie wyniku query dla helped participant

**Błąd:** Assignment not found (draw not completed)
**Kod:** 404 Not Found
**Przyczyna:** Losowanie nie zostało przeprowadzone dla helped participant
**Rozwiązanie:** Sprawdzenie wyniku query dla assignment

### 7.5. Błędy bazy danych

**Błąd:** Database connection error
**Kod:** 500 Internal Server Error
**Przyczyna:** Brak połączenia z Supabase
**Rozwiązanie:** Try-catch w serwisie, logowanie błędu, zwrot 500

**Błąd:** Query execution error
**Kod:** 500 Internal Server Error
**Przyczyna:** Błąd w zapytaniu SQL
**Rozwiązanie:** Try-catch, logowanie szczegółów, zwrot 500 z ogólnym komunikatem

### 7.6. Error Handling Pattern

```typescript
// API Route level
try {
  // 1. Validate params → 400
  // 2. Authenticate → 401
  // 3. Call service
  const result = await elfService.getElfResult(command);
  return new Response(JSON.stringify(result), { status: 200 });
} catch (error) {
  if (error instanceof ValidationError) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
  if (error instanceof UnauthorizedError) {
    return new Response(JSON.stringify({ error: error.message }), { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return new Response(JSON.stringify({ error: error.message }), { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return new Response(JSON.stringify({ error: error.message }), { status: 404 });
  }
  console.error('Unexpected error in elf-result endpoint:', error);
  return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
}
```

## 8. Rozważania dotyczące wydajności

### 8.1. Optymalizacja zapytań

**Single query for participant validation:**
```sql
SELECT
  p.id,
  p.user_id,
  p.elf_for_participant_id,
  p.group_id,
  hp.id as helped_participant_id,
  hp.name as helped_participant_name
FROM participants p
LEFT JOIN participants hp ON hp.id = p.elf_for_participant_id
WHERE p.id = $1
```

**Single query for assignment with receiver:**
```sql
SELECT
  a.receiver_id,
  r.name as receiver_name,
  w.wishlist
FROM assignments a
JOIN participants r ON r.id = a.receiver_id
LEFT JOIN wishes w ON w.participant_id = r.id
WHERE a.giver_id = $2
```

**Benefit:** Redukcja liczby round-trips do bazy danych z 6-7 do 2-3 zapytań.

### 8.2. Indeksy bazodanowe

**Wymagane indeksy (już w schemacie):**
- `participants(id)` - PRIMARY KEY
- `participants(user_id)` - dla ownership check
- `participants(elf_for_participant_id)` - dla elf relationships
- `assignments(giver_id)` - dla szybkiego wyszukiwania assignment
- `wishes(participant_id)` - dla szybkiego wyszukiwania wishlist

**Weryfikacja:** Upewnić się, że migracja v1.1.0 utworzyła wszystkie indeksy.

### 8.3. Caching (przyszłość)

**Potencjalne cachowanie:**
- Group details (rzadko się zmieniają)
- Wishlist HTML (tylko jeśli wishlist się nie zmienił)

**Strategia:** Rozważyć Redis lub in-memory cache dla często czytanych danych.

**Uwaga:** W MVP nie implementować, skupić się na poprawności.

### 8.4. HTML Generation Performance

**linkifyUrls() function:**
- Używa regex do znajdowania URLs
- Escapuje HTML dla bezpieczeństwa
- Generuje klikalne linki

**Optymalizacja:**
- Jeśli wishlist jest długi (>10000 znaków), może to być wolne
- Rozważyć memoizację wyników dla tego samego wishlist content
- Alternatywnie: pre-generować HTML przy zapisie wishlist (nie przy odczycie)

**W MVP:** Pozostawić generowanie przy odczycie, monitorować performance.

### 8.5. Database Connection Pooling

**Supabase:** Automatycznie zarządza connection pooling.

**Best practice:**
- Reużywać Supabase Client z `context.locals.supabase`
- Nie tworzyć nowych instancji dla każdego query
- Używać transakcji jeśli trzeba zachować consistency

## 9. Etapy wdrożenia

### Etap 1: Przygotowanie typów i schematów walidacji

**Zadania:**
1. Dodać `ElfResultResponseDTO` do `src/types.ts`
2. Dodać `TrackElfAccessResponseDTO` do `src/types.ts`
3. Utworzyć `ParticipantIdParamSchema` w Zod dla walidacji parametrów

**Pliki do modyfikacji:**
- `src/types.ts`

**Czas:** 15 min

### Etap 2: Utworzenie serwisu Elf

**Zadania:**
1. Utworzyć `src/lib/services/elf.service.ts`
2. Zaimplementować `getElfResult(command)`:
   - Walidacja participant ownership
   - Walidacja elf status
   - Pobranie helped participant
   - Pobranie assignment
   - Pobranie receiver i wishlist
   - Konwersja wishlist do HTML (użyć istniejącego `linkifyUrls`)
   - Pobranie group details
   - Złożenie response DTO
3. Zaimplementować `trackElfAccess(command)`:
   - Walidacja participant ownership
   - Walidacja elf status
   - Update `elf_accessed_at` tylko jeśli NULL
4. Obsługa błędów z custom error classes:
   - `ForbiddenError`
   - `NotFoundError`

**Pliki do utworzenia:**
- `src/lib/services/elf.service.ts`

**Zależności:**
- `src/db/supabase.client.ts` (SupabaseClient)
- `src/types.ts` (DTOs)
- `src/lib/utils/linkify.ts` (funkcja linkifyUrls, jeśli istnieje) lub zaimplementować

**Czas:** 2-3 godziny

### Etap 3: Implementacja GET endpoint

**Zadania:**
1. Utworzyć `src/pages/api/participants/[participantId]/elf-result.ts`
2. Zaimplementować handler GET:
   - `export const prerender = false`
   - Walidacja `participantId` z Zod
   - Ekstrakcja user z Bearer token (`context.locals.supabase.auth.getUser()`)
   - Wywołanie `elfService.getElfResult()`
   - Obsługa błędów z odpowiednimi kodami statusu
   - Zwrot JSON response

**Pliki do utworzenia:**
- `src/pages/api/participants/[participantId]/elf-result.ts`

**Zależności:**
- `src/lib/services/elf.service.ts`
- `zod`

**Czas:** 1-1.5 godziny

### Etap 4: Implementacja POST endpoint

**Zadania:**
1. Utworzyć `src/pages/api/participants/[participantId]/track-elf-access.ts`
2. Zaimplementować handler POST:
   - `export const prerender = false`
   - Walidacja `participantId` z Zod
   - Ekstrakcja user z Bearer token
   - Wywołanie `elfService.trackElfAccess()`
   - Obsługa błędów
   - Zwrot JSON response

**Pliki do utworzenia:**
- `src/pages/api/participants/[participantId]/track-elf-access.ts`

**Zależności:**
- `src/lib/services/elf.service.ts`
- `zod`

**Czas:** 45 min - 1 godzina

### Etap 5: Testy jednostkowe serwisu

**Zadania:**
1. Utworzyć `src/lib/services/elf.service.test.ts`
2. Napisać testy dla `getElfResult()`:
   - Happy path: zwraca poprawne dane
   - Error: participant nie istnieje → NotFoundError
   - Error: participant nie należy do user → ForbiddenError
   - Error: participant nie jest elfem → ForbiddenError
   - Error: helped participant nie istnieje → NotFoundError
   - Error: assignment nie istnieje → NotFoundError
3. Napisać testy dla `trackElfAccess()`:
   - Happy path: ustawia timestamp przy pierwszym dostępie
   - Idempotency: nie zmienia timestamp przy drugim dostępie
   - Error scenarios (jak wyżej)

**Pliki do utworzenia:**
- `src/lib/services/elf.service.test.ts`

**Narzędzia:**
- Vitest
- Mock Supabase Client

**Czas:** 2-3 godziny

### Etap 6: Testy integracyjne API

**Zadania:**
1. Utworzyć `tests/api/elf-endpoints.test.ts`
2. Testy dla GET endpoint:
   - 200: poprawny request zalogowanego elfa
   - 400: nieprawidłowy participantId
   - 401: brak tokenu
   - 403: nie-elf próbuje dostępu
   - 404: participant nie istnieje
   - 404: assignment nie istnieje (draw not completed)
3. Testy dla POST endpoint:
   - 200: pierwszy dostęp ustawia timestamp
   - 200: drugi dostęp nie zmienia timestamp (idempotentność)
   - 401, 403, 404 scenarios

**Pliki do utworzenia:**
- `tests/api/elf-endpoints.test.ts`

**Narzędzia:**
- Vitest
- MSW (Mock Service Worker) dla mockowania Supabase
- Test fixtures (test users, participants, groups)

**Czas:** 3-4 godziny

### Etap 7: Testy E2E

**Zadania:**
1. Utworzyć `tests/e2e/elf-access.spec.ts`
2. Scenariusze E2E:
   - Elf loguje się i widzi wynik losowania pomaganego uczestnika
   - Timestamp `elf_accessed_at` jest ustawiany przy pierwszym dostępie
   - Nie-elf nie może uzyskać dostępu do endpoint
   - Niezarejestrowany participant nie może użyć endpoint (nawet z access token)

**Pliki do utworzenia:**
- `tests/e2e/elf-access.spec.ts`

**Narzędzia:**
- Playwright
- Test database (Supabase test instance lub Docker)

**Czas:** 2-3 godziny

### Etap 8: Dokumentacja i Code Review

**Zadania:**
1. Dodać JSDoc comments do funkcji serwisu
2. Zaktualizować API documentation (jeśli istnieje)
3. Dodać przykłady użycia w README (jeśli dotyczy)
4. Code review z zespołem
5. Refactoring na podstawie feedbacku

**Czas:** 1-2 godziny

### Etap 9: Deployment i monitoring

**Zadania:**
1. Merge do feature branch
2. Deployment do środowiska staging
3. Smoke tests na staging
4. Monitoring błędów w logach
5. Weryfikacja performance (query times, response times)
6. Merge do master i deployment na production

**Czas:** 1-2 godziny (+ czas na review)

---

## Podsumowanie

**Całkowity szacowany czas implementacji:** 14-20 godzin

**Kluczowe ryzyka:**
1. Brak funkcji `linkifyUrls()` - może wymagać dodatkowej implementacji
2. Performance queries - może wymagać optymalizacji jeśli dane są duże
3. Edge cases w elf relationships - wymaga dokładnych testów

**Zależności:**
- Migracja bazy danych v1.1.0 musi być wykonana (kolumny `elf_for_participant_id`, `elf_accessed_at`)
- Supabase Auth musi być skonfigurowany i działający
- Middleware do ekstrakcji Supabase Client z context.locals

**Priorytety:**
1. **High:** Implementacja serwisu i API endpoints (funkcjonalność core)
2. **High:** Testy jednostkowe serwisu (quality assurance)
3. **Medium:** Testy integracyjne API (regression prevention)
4. **Medium:** Testy E2E (user experience validation)
5. **Low:** Optymalizacje performance (można zrobić później na podstawie monitoringu)
