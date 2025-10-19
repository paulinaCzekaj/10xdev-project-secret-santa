# API Endpoint Implementation Plan: Participant Management (Update & Delete)

## 1. Przegląd punktów końcowych

### PATCH `/api/participants/:id`

Umożliwia aktualizację danych uczestnika (imię i/lub email) w grupie Secret Santa. Endpoint jest dostępny wyłącznie przed wykonaniem losowania i tylko dla twórcy grupy. Zapewnia to kontrolę nad składem grupy przy jednoczesnym zachowaniu integralności danych po rozpoczęciu wymiany prezentów.

### DELETE `/api/participants/:id`

Umożliwia usunięcie uczestnika z grupy Secret Santa. Podobnie jak endpoint aktualizacji, dostępny jest tylko przed losowaniem i tylko dla twórcy grupy. Dodatkowo zapobiega usunięciu twórcy grupy, co mogłoby prowadzić do osierocenia grupy.

## 2. Szczegóły żądania

### PATCH `/api/participants/:id`

**Metoda HTTP:** PATCH

**Struktura URL:** `/api/participants/:id`

- `:id` - identyfikator uczestnika (BIGINT)

**Parametry:**

- **Wymagane:**
  - Path parameter: `id` - identyfikator uczestnika do aktualizacji
  - Header: `Authorization: Bearer {access_token}` - token JWT użytkownika

- **Opcjonalne (w body):**
  - `name` (string) - nowe imię uczestnika
  - `email` (string) - nowy adres email uczestnika

**Request Body:**

```json
{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

**Uwaga:** Wszystkie pola w body są opcjonalne, ale co najmniej jedno musi być dostarczone.

### DELETE `/api/participants/:id`

**Metoda HTTP:** DELETE

**Struktura URL:** `/api/participants/:id`

- `:id` - identyfikator uczestnika (BIGINT)

**Parametry:**

- **Wymagane:**
  - Path parameter: `id` - identyfikator uczestnika do usunięcia
  - Header: `Authorization: Bearer {access_token}` - token JWT użytkownika

**Request Body:** Brak

## 3. Wykorzystywane typy

### Command Models

```typescript
// Z src/types.ts
export interface UpdateParticipantCommand {
  name?: string;
  email?: string;
}
```

### DTOs

```typescript
// Z src/types.ts
export type ParticipantDTO = Tables<"participants">;

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### Database Types

```typescript
// Z src/types.ts
export type ParticipantUpdate = TablesUpdate<"participants">;
```

### Zod Schemas (do utworzenia)

```typescript
// src/pages/api/participants/[id].ts
import { z } from "zod";

const UpdateParticipantSchema = z
  .object({
    name: z.string().min(1, "Name cannot be empty").optional(),
    email: z.string().email("Invalid email format").optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: "At least one field (name or email) must be provided",
  });
```

## 4. Szczegóły odpowiedzi

### PATCH `/api/participants/:id`

**Success Response (200 OK):**

```json
{
  "id": 123,
  "group_id": 45,
  "user_id": 67,
  "name": "Updated Name",
  "email": "updated@example.com",
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Error Responses:**

**400 Bad Request - Invalid Data:**

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid participant data",
    "details": {
      "issues": [
        {
          "field": "email",
          "message": "Invalid email format"
        }
      ]
    }
  }
}
```

**400 Bad Request - Email Already Exists:**

```json
{
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "Email already exists in this group",
    "details": {
      "email": "updated@example.com"
    }
  }
}
```

**400 Bad Request - Draw Completed:**

```json
{
  "error": {
    "code": "DRAW_COMPLETED",
    "message": "Cannot update participant after draw has been completed"
  }
}
```

**401 Unauthorized:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden:**

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only group creator can update participants"
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Participant not found"
  }
}
```

### DELETE `/api/participants/:id`

**Success Response (204 No Content):**
Brak zawartości - sukces operacji sygnalizowany jest kodem statusu 204.

**Error Responses:**

**400 Bad Request - Cannot Delete Creator:**

```json
{
  "error": {
    "code": "CANNOT_DELETE_CREATOR",
    "message": "Cannot delete group creator"
  }
}
```

**400 Bad Request - Draw Completed:**

```json
{
  "error": {
    "code": "DRAW_COMPLETED",
    "message": "Cannot delete participant after draw has been completed"
  }
}
```

**401 Unauthorized:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden:**

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only group creator can delete participants"
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Participant not found"
  }
}
```

## 5. Przepływ danych

### PATCH `/api/participants/:id` - Data Flow

```
1. Request received
   ↓
2. Middleware: Extract user from JWT (context.locals.supabase.auth.getUser())
   ↓
3. Validate request body with Zod schema
   ↓
4. ParticipantService.getParticipantWithGroupInfo(id)
   - Fetch participant with group details
   - Return 404 if not found
   ↓
5. ParticipantService.checkUserIsGroupCreator(userId, groupId)
   - Verify user is creator of the group
   - Return 403 if not creator
   ↓
6. ParticipantService.checkDrawCompleted(groupId)
   - Query assignments table for group_id
   - Return 400 if draw completed
   ↓
7. If email is being updated:
   ParticipantService.checkEmailUniqueness(email, groupId, participantId)
   - Check if email exists for other participants in same group
   - Return 400 if duplicate found
   ↓
8. ParticipantService.updateParticipant(id, updateData)
   - Execute UPDATE query on participants table
   - Set updated_at timestamp
   ↓
9. Return updated participant (200 OK)
```

### DELETE `/api/participants/:id` - Data Flow

```
1. Request received
   ↓
2. Middleware: Extract user from JWT (context.locals.supabase.auth.getUser())
   ↓
3. ParticipantService.getParticipantWithGroupInfo(id)
   - Fetch participant with group details
   - Return 404 if not found
   ↓
4. ParticipantService.checkUserIsGroupCreator(userId, groupId)
   - Verify user is creator of the group
   - Return 403 if not creator
   ↓
5. ParticipantService.checkDrawCompleted(groupId)
   - Query assignments table for group_id
   - Return 400 if draw completed
   ↓
6. ParticipantService.isParticipantCreator(participantId, groupId)
   - Check if participant.user_id matches group.creator_id
   - Return 400 if trying to delete creator
   ↓
7. ParticipantService.deleteParticipant(id)
   - Execute DELETE query on participants table
   - CASCADE will handle related records (exclusion_rules, wishes, assignments)
   ↓
8. Return 204 No Content
```

### Database Queries

**Get participant with group info:**

```sql
SELECT p.*, g.creator_id, g.name as group_name
FROM participants p
INNER JOIN groups g ON p.group_id = g.id
WHERE p.id = ?
```

**Check draw completed:**

```sql
SELECT COUNT(*) as count
FROM assignments
WHERE group_id = ?
```

**Check email uniqueness:**

```sql
SELECT COUNT(*) as count
FROM participants
WHERE group_id = ?
  AND email = ?
  AND id != ?
```

**Update participant:**

```sql
UPDATE participants
SET
  name = COALESCE(?, name),
  email = COALESCE(?, email)
WHERE id = ?
RETURNING *
```

**Check if participant is creator:**

```sql
SELECT COUNT(*) as count
FROM participants p
INNER JOIN groups g ON p.group_id = g.id
WHERE p.id = ? AND p.user_id = g.creator_id
```

**Delete participant:**

```sql
DELETE FROM participants
WHERE id = ?
```

## 6. Względy bezpieczeństwa

### Uwierzytelnianie (Authentication)

- **Mechanizm:** JWT (JSON Web Token) poprzez Supabase Auth
- **Implementacja:**
  - Token przekazywany w nagłówku `Authorization: Bearer {token}`
  - Middleware Astro ekstrahuje użytkownika: `const { data: { user } } = await context.locals.supabase.auth.getUser()`
  - Brak użytkownika → 401 Unauthorized

### Autoryzacja (Authorization)

- **Reguła biznesowa:** Tylko twórca grupy może modyfikować uczestników
- **Implementacja:**
  - Po pobraniu uczestnika, sprawdź czy `user.id === group.creator_id`
  - Brak zgody → 403 Forbidden
- **Poziom zabezpieczenia:** Row Level Security (RLS) w Supabase jako dodatkowa warstwa

### Walidacja danych wejściowych

- **PATCH endpoint:**
  - Zod schema waliduje strukturę i typy danych
  - Email: walidacja formatu RFC 5322
  - Name: minimum 1 znak, nie może być pusty
  - Co najmniej jedno pole musi być dostarczone
- **DELETE endpoint:**
  - Walidacja formatu ID (liczba całkowita)

### Integralność danych biznesowych

- **Ochrona przed modyfikacją po losowaniu:**
  - Sprawdzenie istnienia rekordów w tabeli `assignments` dla danej grupy
  - Zapobiega niespójności w już przeprowadzonym losowaniu
- **Ochrona twórcy grupy:**
  - DELETE blokuje usunięcie uczestnika będącego twórcą
  - Zapobiega osieroceniu grupy

### Ochrona przed SQL Injection

- **Mechanizm:** Supabase SDK używa parametryzowanych zapytań
- **Praktyka:** Wszystkie dane wejściowe są bindowane jako parametry, nie konkatenowane

### Rate Limiting (do rozważenia w przyszłości)

- Ochrona przed nadużyciami API
- Implementacja na poziomie middleware lub API Gateway

## 7. Obsługa błędów

### Hierarchia sprawdzania błędów (Error Handling Flow)

Zgodnie z zasadami clean code, błędy obsługujemy na początku funkcji (guard clauses):

```typescript
// 1. Authentication check
if (!user) {
  return new Response(
    JSON.stringify({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    }),
    { status: 401 }
  );
}

// 2. Input validation
const validationResult = UpdateParticipantSchema.safeParse(body);
if (!validationResult.success) {
  return new Response(
    JSON.stringify({
      error: {
        code: "INVALID_INPUT",
        message: "Invalid participant data",
        details: { issues: validationResult.error.issues },
      },
    }),
    { status: 400 }
  );
}

// 3. Resource existence
const participant = await participantService.getParticipantWithGroupInfo(id);
if (!participant) {
  return new Response(
    JSON.stringify({
      error: {
        code: "NOT_FOUND",
        message: "Participant not found",
      },
    }),
    { status: 404 }
  );
}

// 4. Authorization check
if (participant.group.creator_id !== user.id) {
  return new Response(
    JSON.stringify({
      error: {
        code: "FORBIDDEN",
        message: "Only group creator can update participants",
      },
    }),
    { status: 403 }
  );
}

// 5. Business rules
const drawCompleted = await participantService.checkDrawCompleted(participant.group_id);
if (drawCompleted) {
  return new Response(
    JSON.stringify({
      error: {
        code: "DRAW_COMPLETED",
        message: "Cannot update participant after draw has been completed",
      },
    }),
    { status: 400 }
  );
}

// 6. Domain-specific validation (PATCH only)
if (data.email) {
  const emailExists = await participantService.checkEmailUniqueness(data.email, participant.group_id, id);
  if (emailExists) {
    return new Response(
      JSON.stringify({
        error: {
          code: "EMAIL_EXISTS",
          message: "Email already exists in this group",
          details: { email: data.email },
        },
      }),
      { status: 400 }
    );
  }
}

// 7. Domain-specific validation (DELETE only)
const isCreator = await participantService.isParticipantCreator(id, participant.group_id);
if (isCreator) {
  return new Response(
    JSON.stringify({
      error: {
        code: "CANNOT_DELETE_CREATOR",
        message: "Cannot delete group creator",
      },
    }),
    { status: 400 }
  );
}

// Happy path last
const result = await participantService.updateParticipant(id, data);
return new Response(JSON.stringify(result), { status: 200 });
```

### Tabela błędów

| Kod HTTP | Kod błędu               | Scenariusz                                       | Endpoint      |
| -------- | ----------------------- | ------------------------------------------------ | ------------- |
| 400      | `INVALID_INPUT`         | Nieprawidłowy format danych (Zod validation)     | PATCH         |
| 400      | `EMAIL_EXISTS`          | Email już istnieje w grupie                      | PATCH         |
| 400      | `DRAW_COMPLETED`        | Losowanie zostało już przeprowadzone             | PATCH, DELETE |
| 400      | `CANNOT_DELETE_CREATOR` | Próba usunięcia twórcy grupy                     | DELETE        |
| 401      | `UNAUTHORIZED`          | Brak tokenu JWT lub token nieprawidłowy          | PATCH, DELETE |
| 403      | `FORBIDDEN`             | Użytkownik nie jest twórcą grupy                 | PATCH, DELETE |
| 404      | `NOT_FOUND`             | Uczestnik o podanym ID nie istnieje              | PATCH, DELETE |
| 500      | `INTERNAL_ERROR`        | Nieoczekiwany błąd serwera (DB connection, etc.) | PATCH, DELETE |

### Logowanie błędów

```typescript
// W service layer
try {
  // Database operation
} catch (error) {
  console.error("[ParticipantService] Error updating participant:", {
    participantId: id,
    error: error.message,
    stack: error.stack,
  });
  throw new Error("Failed to update participant");
}
```

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Wiele zapytań do bazy danych:**
   - Problem: Każdy endpoint wykonuje 3-5 osobnych zapytań
   - Ryzyko: N+1 problem przy równoczesnych operacjach

2. **Brak cachowania:**
   - Problem: Dane grupy i sprawdzenie draw completion są odpytywane przy każdym request
   - Ryzyko: Niepotrzebne obciążenie bazy przy częstych operacjach

3. **Synchroniczne operacje:**
   - Problem: Wszystkie sprawdzenia wykonywane sekwencyjnie
   - Ryzyko: Wydłużony czas odpowiedzi

### Strategie optymalizacji

#### 1. Optymalizacja zapytań - JOIN zamiast wielu queries

**Przed optymalizacją:**

```typescript
const participant = await getParticipant(id);
const group = await getGroup(participant.group_id);
const drawCompleted = await checkDraw(group.id);
```

**Po optymalizacji:**

```typescript
// Single query with JOINs
const result = await supabase
  .from("participants")
  .select(
    `
    *,
    group:groups (
      id,
      creator_id,
      name,
      assignments:assignments (count)
    )
  `
  )
  .eq("id", id)
  .single();

const drawCompleted = result.group.assignments[0].count > 0;
```

**Korzyść:** Redukcja z 3-5 zapytań do 1 zapytania

#### 2. Indeksy bazodanowe

Zapewnij następujące indeksy:

```sql
-- Już istniejący index na participants.group_id (foreign key)
-- Dodatkowy composite index dla optymalizacji uniqueness check
CREATE INDEX idx_participants_group_email ON participants(group_id, email)
WHERE email IS NOT NULL;

-- Index dla sprawdzenia draw completion
CREATE INDEX idx_assignments_group_id ON assignments(group_id);
```

#### 3. Walidacja równoległa (parallel validation)

```typescript
// Zamiast sekwencyjnie:
const drawCompleted = await checkDrawCompleted(groupId);
const emailExists = await checkEmailUniqueness(email, groupId, id);

// Wykonaj równolegle:
const [drawCompleted, emailExists] = await Promise.all([
  checkDrawCompleted(groupId),
  checkEmailUniqueness(email, groupId, id),
]);
```

**Korzyść:** Redukcja czasu odpowiedzi o ~50% dla równoległych walidacji

#### 4. Caching strategii (optional dla MVP, rekomendowane dla production)

```typescript
// Cache draw completion status (krótki TTL, np. 30s)
const cacheKey = `draw-completed:${groupId}`;
let drawCompleted = await cache.get(cacheKey);

if (drawCompleted === null) {
  drawCompleted = await checkDrawCompleted(groupId);
  await cache.set(cacheKey, drawCompleted, 30); // 30 seconds TTL
}
```

**Korzyść:** Redukcja obciążenia DB dla często sprawdzanych grup

#### 5. Connection pooling

Supabase SDK domyślnie używa connection pooling, ale upewnij się że:

- Pool size jest odpowiednio skonfigurowany dla oczekiwanego ruchu
- Connection timeout jest ustawiony (np. 10s)

#### 6. Monitoring i metryki

Instrumentacja dla identyfikacji bottlenecków:

```typescript
const startTime = performance.now();

// Operation
const result = await participantService.updateParticipant(id, data);

const duration = performance.now() - startTime;
console.log(`[Performance] Update participant took ${duration}ms`);

// Jeśli > 1000ms, log warning
if (duration > 1000) {
  console.warn(`[Performance] Slow update detected: ${duration}ms`);
}
```

### Szacowane metryki wydajności

| Operacja             | Bez optymalizacji | Z optymalizacją | Poprawa |
| -------------------- | ----------------- | --------------- | ------- |
| PATCH (happy path)   | ~250-400ms        | ~100-150ms      | ~60%    |
| DELETE (happy path)  | ~200-350ms        | ~80-120ms       | ~60%    |
| PATCH (email exists) | ~300-450ms        | ~120-180ms      | ~60%    |

**Założenia:** Średnie opóźnienie DB ~20-30ms, sieć lokalna

## 9. Etapy wdrożenia

### Faza 1: Przygotowanie service layer

1. **Utworzenie/rozszerzenie `src/lib/services/participant.service.ts`**

   ```typescript
   // Podstawowa struktura serwisu
   import type { SupabaseClient } from "@/db/supabase.client";
   import type { ParticipantDTO, ParticipantUpdate } from "@/types";

   export class ParticipantService {
     constructor(private supabase: SupabaseClient) {}

     async getParticipantWithGroupInfo(id: number) {
       // Implementation
     }

     async checkDrawCompleted(groupId: number): Promise<boolean> {
       // Implementation
     }

     async checkUserIsGroupCreator(userId: string, groupId: number): Promise<boolean> {
       // Implementation
     }

     async checkEmailUniqueness(email: string, groupId: number, excludeId: number): Promise<boolean> {
       // Implementation
     }

     async isParticipantCreator(participantId: number, groupId: number): Promise<boolean> {
       // Implementation
     }

     async updateParticipant(id: number, data: ParticipantUpdate): Promise<ParticipantDTO> {
       // Implementation
     }

     async deleteParticipant(id: number): Promise<void> {
       // Implementation
     }
   }
   ```

2. **Napisanie testów jednostkowych dla serwisu** (jeśli testy są w scope projektu) - na tę chwilę bez testów

### Faza 2: Utworzenie Zod schemas

1. **Dodanie schema w pliku endpointu `src/pages/api/participants/[id].ts`**

   ```typescript
   import { z } from "zod";

   const UpdateParticipantSchema = z
     .object({
       name: z.string().min(1, "Name cannot be empty").optional(),
       email: z.string().email("Invalid email format").optional(),
     })
     .refine((data) => data.name !== undefined || data.email !== undefined, {
       message: "At least one field (name or email) must be provided",
     });
   ```

### Faza 3: Implementacja endpoint PATCH

1. **Utworzenie pliku `src/pages/api/participants/[id].ts`**

   ```typescript
   export const prerender = false;

   import type { APIContext } from "astro";
   import { ParticipantService } from "@/lib/services/participant.service";
   import { UpdateParticipantSchema } from "./schemas"; // or inline

   export async function PATCH(context: APIContext) {
     // Implementation following the data flow
   }
   ```

2. **Implementacja zgodnie z przepływem danych z sekcji 5**
   - Ekstrahuj użytkownika z context.locals
   - Waliduj input Zod
   - Wykonaj guard clauses zgodnie z sekcją 7
   - Happy path na końcu

3. **Dodanie error handling zgodnie z sekcją 7**

### Faza 4: Implementacja endpoint DELETE

1. **Dodanie handler DELETE w tym samym pliku `src/pages/api/participants/[id].ts`**

   ```typescript
   export async function DELETE(context: APIContext) {
     // Implementation following the data flow
   }
   ```

2. **Implementacja zgodnie z przepływem danych**
   - Guard clauses
   - Sprawdzenie czy uczestnik nie jest twórcą
   - DELETE operation
   - Return 204

### Faza 5: Optymalizacja

1. **Refaktoryzacja zapytań do pojedynczego JOIN query** (sekcja 8.1)
2. **Dodanie indeksów bazodanowych** (sekcja 8.2)
3. **Implementacja równoległych walidacji** (sekcja 8.3)

<!-- ### Faza 6: Testowanie

1. **Testy jednostkowe service layer:**
   - Każda metoda ParticipantService
   - Mock Supabase client

2. **Testy integracyjne endpoint:**
   - Happy paths (PATCH i DELETE)
   - Każdy scenariusz błędu z sekcji 7
   - Authorization flow
   - Draw completion blocking

3. **Testy E2E (opcjonalne):**
   - Pełny flow aktualizacji uczestnika
   - Pełny flow usuwania uczestnika -->

### Faza 7: Dokumentacja i review

1. **Aktualizacja dokumentacji API**
2. **Code review**
3. **Merge do main branch**

### Checklist implementacji

- [ ] Utworzenie ParticipantService z wszystkimi metodami
- [ ] Napisanie testów jednostkowych dla serwisu
- [ ] Utworzenie Zod schema dla UpdateParticipantCommand
- [ ] Implementacja PATCH `/api/participants/:id`
- [ ] Implementacja DELETE `/api/participants/:id`
- [ ] Dodanie error handling dla wszystkich scenariuszy
- [ ] Refaktoryzacja do pojedynczego JOIN query
- [ ] Dodanie indeksów bazodanowych
- [ ] Implementacja równoległych walidacji
  <!-- - [ ] Testy integracyjne dla obu endpointów -->
  <!-- - [ ] Testy E2E (opcjonalne) -->
- [ ] Code review
- [ ] Dokumentacja API
<!-- - [ ] Deploy i smoke tests na staging -->

### Szacowany czas implementacji

| Faza                    | Czas               |
| ----------------------- | ------------------ | ---- | --- |
| Faza 1: Service layer   | 2-3h               |
| Faza 2: Zod schemas     | 0.5h               |
| Faza 3: PATCH endpoint  | 2h                 |
| Faza 4: DELETE endpoint | 1.5h               |
| Faza 5: Optymalizacja   | 1-2h               |
| <!--                    | Faza 6: Testowanie | 3-4h | --> |
| Faza 7: Dokumentacja    | 1h                 |
| **Total**               | **11-16h**         |

## 10. Dodatkowe uwagi

### Zgodność z zasadami clean code projektu

Implementacja zgodna z `.cursor/rules/shared.mdc`:

- ✅ Early returns dla error conditions
- ✅ Guard clauses na początku funkcji
- ✅ Happy path na końcu
- ✅ Brak niepotrzebnych else statements
- ✅ Proper error logging

### Zgodność z tech stack

Zgodność z `.ai/tech-stack.md` i `.cursor/rules/`:

- ✅ Astro 5 Server Endpoints
- ✅ TypeScript 5 z pełnym typowaniem
- ✅ Supabase jako BaaS
- ✅ Zod dla walidacji
- ✅ Export const prerender = false

### Przyszłe rozszerzenia (poza scope MVP)

1. **Powiadomienia email:**
   - Wysyłanie powiadomienia do uczestnika o zmianie jego danych
   - Wymagane: integracja z serwisem email (Resend, SendGrid)

2. **Audit log:**
   - Tabela `participant_changes` do śledzenia historii modyfikacji
   - Przydatne dla rozwiązywania sporów

3. **Bulk operations:**
   - PATCH/DELETE wielu uczestników jednocześnie
   - Endpoint: POST `/api/participants/bulk`

4. **Soft delete:**
   - Zamiast trwałego usuwania, oznaczanie jako `deleted_at`
   - Możliwość przywrócenia przez administratora

5. **Walidacja po stronie bazy:**
   - CHECK constraints na email format
   - Trigger do blokowania modyfikacji po losowaniu
