# API Endpoint Implementation Plan: Get Group Details

## 1. Przegląd punktu końcowego

Endpoint `GET /api/groups/:id` służy do pobierania szczegółowych informacji o konkretnej grupie Secret Santa. Zwraca kompletne dane grupy wraz z listą uczestników, regułami wykluczeń oraz polami obliczeniowymi określającymi status losowania i uprawnienia użytkownika. Endpoint wymaga uwierzytelnienia i sprawdza, czy użytkownik ma uprawnienia do przeglądania danych grupy (jest jej twórcą lub uczestnikiem).

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/groups/:id`
- **Parametry**:
  - **Wymagane**:
    - `:id` (URL parameter) - ID grupy (number, positive integer)
    - `Authorization` header - Bearer token z Supabase Auth
  - **Opcjonalne**: brak
- **Request Body**: N/A (metoda GET)

### Przykład żądania:

```http
GET /api/groups/42 HTTP/1.1
Host: example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// Główny typ odpowiedzi
GroupDetailDTO {
  id: number;
  name: string;
  budget: number;
  end_date: string;
  creator_id: string;
  is_drawn: boolean;
  created_at: string;
  updated_at: string;
  participants: ParticipantDTO[];
  exclusions: ExclusionRuleDTO[];
  is_creator: boolean;
  can_edit: boolean;
}

// Zagnieżdżone typy
ParticipantDTO (Tables<"participants">)
ExclusionRuleDTO (Tables<"exclusion_rules">)

// Obsługa błędów
ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }
}
```

### Nowe typy walidacji (Zod schemas):

```typescript
// W pliku endpointu lub osobnym pliku schemas
const GroupIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: "Group ID must be a positive integer",
  }),
});
```

## 4. Schemat bazy danych - Tabela `assignments`

**UWAGA**: Endpoint wymaga tabeli `assignments` do określania statusu losowania (`is_drawn`).

### Struktura tabeli:

```sql
CREATE TABLE assignments (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  giver_participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  receiver_participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Każdy uczestnik może mieć tylko jedno przypisanie w grupie
  CONSTRAINT unique_giver_per_group UNIQUE(group_id, giver_participant_id),

  -- Nikt nie może wylosować samego siebie
  CONSTRAINT no_self_assignment CHECK(giver_participant_id != receiver_participant_id)
);

-- Indeksy dla wydajności
CREATE INDEX idx_assignments_group_id ON assignments(group_id);
CREATE INDEX idx_assignments_giver ON assignments(giver_participant_id);
CREATE INDEX idx_assignments_receiver ON assignments(receiver_participant_id);
```

### Relacje:

- `assignments.group_id` → `groups.id` (wiele-do-jednego)
- `assignments.giver_participant_id` → `participants.id` (wiele-do-jednego)
- `assignments.receiver_participant_id` → `participants.id` (wiele-do-jednego)

### Typ TypeScript (dodać do `src/types.ts`):

```typescript
// W sekcji DATABASE ENTITY ALIASES
export type AssignmentDTO = Tables<"assignments">;
export type AssignmentInsert = TablesInsert<"assignments">;
```

### Przeznaczenie:

- Przechowuje wyniki losowania Secret Santa
- Każdy rekord reprezentuje: "Uczestnik X ma kupić prezent dla Uczestnika Y"
- Używana do obliczania pola `is_drawn` w GroupDetailDTO
- Używana w endpointach `/api/groups/:groupId/result` i `/api/results/:token`

## 5. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "id": 1,
  "name": "Family Christmas 2025",
  "budget": 150,
  "end_date": "2025-12-25T23:59:59Z",
  "creator_id": "42",
  "is_drawn": false,
  "created_at": "2025-10-09T10:00:00Z",
  "updated_at": "2025-10-09T10:00:00Z",
  "participants": [
    {
      "id": 1,
      "group_id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "user_id": "42",
      "created_at": "2025-10-09T10:00:00Z"
    }
  ],
  "exclusions": [
    {
      "id": 1,
      "group_id": 1,
      "blocker_participant_id": 1,
      "blocked_participant_id": 2,
      "created_at": "2025-10-09T10:00:00Z"
    }
  ],
  "is_creator": true,
  "can_edit": true
}
```

### Błędy:

**400 Bad Request:**

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Group ID must be a positive integer"
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
    "message": "You do not have access to this group"
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "Group not found"
  }
}
```

**500 Internal Server Error:**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 6. Przepływ danych

### Krok po kroku:

1. **Odbieranie żądania** (Astro endpoint handler)
   - Middleware sprawdza token autoryzacji
   - Ekstrahuje user ID z tokena JWT (context.locals.user)

2. **Walidacja parametru ID** (Zod)
   - Parsowanie i walidacja parametru `:id` z URL
   - Zwrot 400 w przypadku nieprawidłowego formatu

3. **Wywołanie service layer**
   - `GroupsService.getGroupById(groupId, userId)`

4. **Logika w service**:

   a. **Pobieranie grupy z bazy danych**

   ```typescript
   const { data: group, error } = await supabase.from("groups").select("*").eq("id", groupId).single();

   if (error || !group) {
     return null; // 404
   }
   ```

   b. **Sprawdzenie uprawnień dostępu**

   ```typescript
   // Czy użytkownik jest twórcą?
   const isCreator = group.creator_id === userId;

   // Czy użytkownik jest uczestnikiem?
   const { data: participation } = await supabase
     .from("participants")
     .select("id")
     .eq("group_id", groupId)
     .eq("user_id", userId)
     .maybeSingle();

   const isParticipant = participation !== null;

   if (!isCreator && !isParticipant) {
     // Użytkownik nie ma dostępu
     return null; // 403
   }
   ```

   c. **Pobieranie uczestników**

   ```typescript
   const { data: participants } = await supabase
     .from("participants")
     .select("*")
     .eq("group_id", groupId)
     .order("created_at", { ascending: true });
   ```

   d. **Pobieranie reguł wykluczeń**

   ```typescript
   const { data: exclusions } = await supabase
     .from("exclusion_rules")
     .select("*")
     .eq("group_id", groupId)
     .order("created_at", { ascending: true });
   ```

   e. **Obliczanie pola is_drawn** ⭐

   ```typescript
   // Sprawdzenie czy istnieją jakiekolwiek przypisania dla tej grupy
   const { data: hasAssignments } = await supabase
     .from("assignments")
     .select("id")
     .eq("group_id", groupId)
     .limit(1)
     .maybeSingle();

   const isDrawn = hasAssignments !== null;
   ```

   f. **Obliczanie can_edit**

   ```typescript
   const canEdit = isCreator && !isDrawn;
   ```

   g. **Konstrukcja GroupDetailDTO**

   ```typescript
   return {
     ...group,
     participants: participants || [],
     exclusions: exclusions || [],
     is_creator: isCreator,
     is_drawn: isDrawn,
     can_edit: canEdit,
   };
   ```

5. **Odpowiedź w endpoint handler**
   - Sukces: return JSON z GroupDetailDTO (200)
   - Grupa nie istnieje lub brak dostępu: return 404 lub 403
   - Błędy walidacji: return 400
   - Nieoczekiwane błędy: return 500

### Optymalizacja przepływu (opcjonalna):

**Pojedyncze zapytanie z JOIN** (zamiast 4 osobnych):

```typescript
const { data: groupData, error } = await supabase
  .from("groups")
  .select(
    `
    *,
    participants (*),
    exclusion_rules (*)
  `
  )
  .eq("id", groupId)
  .single();

// Sprawdzenie dostępu
const isCreator = groupData.creator_id === userId;
const isParticipant = groupData.participants.some((p) => p.user_id === userId);

if (!isCreator && !isParticipant) {
  return null;
}

// Sprawdzenie is_drawn (nadal osobne zapytanie - nie da się uniknąć)
const { data: hasAssignments } = await supabase
  .from("assignments")
  .select("id")
  .eq("group_id", groupId)
  .limit(1)
  .maybeSingle();

const isDrawn = hasAssignments !== null;
```

**Korzyści**: Redukcja z 4 zapytań do 2 (group+relations + assignments check)

## 7. Względy bezpieczeństwa

### Uwierzytelnianie:

- **Token JWT validation**: Middleware Astro sprawdza token z headera Authorization
- **User context**: Token dekodowany do user ID w `context.locals.user`
- Brak tokena → 401 Unauthorized

### Autoryzacja (RBAC):

- **Resource-level authorization**: Sprawdzenie, czy użytkownik ma dostęp do konkretnej grupy
- Użytkownik ma dostęp jeśli:
  - Jest twórcą grupy (`groups.creator_id === userId`), LUB
  - Jest uczestnikiem grupy (`participants.user_id === userId`)
- Brak dostępu → 403 Forbidden

### Ochrona przed atakami:

- **IDOR Prevention**: Implementacja sprawdzenia uprawnień przed zwróceniem danych
- **SQL Injection**: Używanie Supabase Query Builder (parametryzowane zapytania)
- **Information Disclosure**:
  - Zwracanie generycznego 404, gdy grupa nie istnieje I użytkownik nie ma dostępu
  - Nie ujawniać szczegółów błędów wewnętrznych w odpowiedziach produkcyjnych
- **Token Security**: Używanie `httpOnly` cookies lub secure headers dla tokenów

### Rate Limiting (opcjonalnie):

- Rozważenie implementacji rate limiting dla endpointów API (np. 100 req/min/user)

## 8. Obsługa błędów

### Tabela scenariuszy błędów:

| Kod | Scenariusz             | Code              | Message                                | Logika obsługi                                |
| --- | ---------------------- | ----------------- | -------------------------------------- | --------------------------------------------- |
| 400 | Nieprawidłowe ID grupy | `INVALID_INPUT`   | "Group ID must be a positive integer"  | Walidacja Zod rzuca wyjątek, catch w endpoint |
| 401 | Brak tokena            | `UNAUTHORIZED`    | "Authentication required"              | Middleware sprawdza token, blokuje żądanie    |
| 401 | Nieprawidłowy token    | `UNAUTHORIZED`    | "Invalid or expired token"             | Middleware weryfikuje JWT                     |
| 403 | Brak dostępu do grupy  | `FORBIDDEN`       | "You do not have access to this group" | Service sprawdza uprawnienia, zwraca null     |
| 404 | Grupa nie istnieje     | `GROUP_NOT_FOUND` | "Group not found"                      | Query zwraca null, endpoint zwraca 404        |
| 500 | Błąd bazy danych       | `INTERNAL_ERROR`  | "An unexpected error occurred"         | Catch w service/endpoint, log błędu           |
| 500 | Nieoczekiwany wyjątek  | `INTERNAL_ERROR`  | "An unexpected error occurred"         | Global error handler, log stack trace         |

### Implementacja w endpoint handler:

```typescript
import type { APIContext } from "astro";
import { z } from "zod";
import { getGroupById } from "@/lib/services/groups.service";
import type { ApiErrorResponse } from "@/types";

export const prerender = false;

const GroupIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: "Group ID must be a positive integer",
  }),
});

export const GET = async ({ params, locals }: APIContext) => {
  try {
    // Walidacja parametru
    const { id } = GroupIdParamSchema.parse({ id: params.id });

    // Sprawdzenie autoryzacji
    const user = locals.user;
    if (!user) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Pobranie supabase client
    const supabase = locals.supabase;

    // Wywołanie service
    const groupDetails = await getGroupById(supabase, id, user.id);

    if (!groupDetails) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "GROUP_NOT_FOUND",
          message: "Group not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Sukces
    return new Response(JSON.stringify(groupDetails), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    // Obsługa błędów walidacji
    if (error instanceof z.ZodError) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_INPUT",
          message: error.errors[0].message,
          details: error.errors,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Logowanie nieoczekiwanych błędów
    console.error("Error fetching group details:", {
      groupId: params.id,
      userId: locals.user?.id,
      error,
    });

    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

## 9. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła:

1. **Wiele zapytań do bazy (N+1 problem)**
   - Problem: Osobne zapytania dla grupy, uczestników, wykluczeń i assignments
   - Rozwiązanie: Użycie Supabase JOIN dla grupy+uczestników+wykluczeń
   - Wynik: Redukcja z 4 zapytań do 2 (group+relations + assignments check)

2. **Duża liczba uczestników/wykluczeń**
   - Problem: Dla dużych grup response może być bardzo duży
   - Rozwiązanie krótkoterminowe: Brak (MVP nie wymaga optymalizacji)
   - Rozwiązanie długoterminowe: Paginacja dla uczestników i wykluczeń

3. **Brak cachowania**
   - Problem: Każde żądanie pobiera dane z bazy
   - Rozwiązanie: HTTP caching headers (Cache-Control, ETag) dla niezmiennych danych

### Strategie optymalizacji:

#### Optymalizacja 1: Pojedyncze zapytanie z JOIN

```typescript
const { data: group, error } = await supabase
  .from("groups")
  .select(
    `
    *,
    participants (*),
    exclusion_rules (*)
  `
  )
  .eq("id", groupId)
  .single();
```

**Korzyść**: Redukcja round-trips do bazy z 3 do 1 (+ 1 dla assignments)

#### Optymalizacja 2: Indeksy bazodanowe

- Index na `participants.group_id` (już istnieje przez FK)
- Index na `exclusion_rules.group_id` (już istnieje przez FK)
- Index na `assignments.group_id` (✅ dodany w schemacie)
- Index na `participants(group_id, user_id)` dla sprawdzania członkostwa (opcjonalny)

#### Optymalizacja 3: Cache-Control headers

```typescript
return new Response(JSON.stringify(groupDetails), {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "private, max-age=60", // Cache na 60 sekund
  },
});
```

#### Optymalizacja 4: Selective field fetching

- Jeśli frontend nie potrzebuje wszystkich pól, użyć `select()` z konkretnymi polami
- Redukcja rozmiaru response

### Metryki wydajności (cele):

- **Response time**: < 200ms dla małych grup (< 10 uczestników)
- **Response time**: < 500ms dla średnich grup (10-50 uczestników)
- **Database queries**: 2 queries (po optymalizacji JOIN)
- **Response size**: < 50KB dla typowych grup

## 10. Etapy wdrożenia

### Faza 1: Przygotowanie schematu bazy danych (10 min)

1. **Utworzenie migracji dla tabeli `assignments`**
   - Plik: `supabase/migrations/20251009000008_create_assignments.sql`
   - Zawartość: Schemat tabeli z constraintami i indeksami
   - Wykonanie migracji w Supabase (lub przez `supabase db push` jeśli używasz Supabase CLI)

2. **Aktualizacja typów TypeScript dla bazy**

   ```bash
   # Regeneracja typów z Supabase
   npx supabase gen types typescript --project-id <project-id> > src/db/database.types.ts
   ```

3. **Dodanie typów dla assignments w `src/types.ts`**
   ```typescript
   export type AssignmentDTO = Tables<"assignments">;
   export type AssignmentInsert = TablesInsert<"assignments">;
   ```

### Faza 2: Przygotowanie struktury katalogów (5 min)

4. **Utworzenie struktury katalogów**

   ```bash
   mkdir -p src/pages/api/groups
   mkdir -p src/lib/services
   ```

5. **Utworzenie pliku endpoint**
   - Plik: `src/pages/api/groups/[id].ts`
   - Dodanie `export const prerender = false`

6. **Utworzenie pliku service**
   - Plik: `src/lib/services/groups.service.ts`
   - Eksport funkcji `getGroupById`

### Faza 3: Implementacja walidacji (10 min)

7. **Dodanie schema Zod w endpoint**

   ```typescript
   import { z } from "zod";

   const GroupIdParamSchema = z.object({
     id: z.coerce.number().int().positive({
       message: "Group ID must be a positive integer",
     }),
   });
   ```

8. **Implementacja podstawowego handlera GET**
   ```typescript
   export const GET = async ({ params, locals }: APIContext) => {
     // Walidacja parametrów
     // Sprawdzenie autoryzacji
     // Wywołanie service
     // Konstrukcja odpowiedzi
   };
   ```

### Faza 4: Implementacja service layer (30 min)

9. **Utworzenie funkcji getGroupById**

   ```typescript
   import type { SupabaseClient } from "@/db/supabase.client";
   import type { GroupDetailDTO } from "@/types";

   export async function getGroupById(
     supabase: SupabaseClient,
     groupId: number,
     userId: string
   ): Promise<GroupDetailDTO | null> {
     // Implementacja logiki
   }
   ```

10. **Implementacja pobierania grupy z bazy**
    - Query do tabeli `groups`
    - Obsługa przypadku, gdy grupa nie istnieje

11. **Implementacja sprawdzania uprawnień**
    - Sprawdzenie, czy user jest creator
    - Sprawdzenie, czy user jest participant
    - Return null jeśli brak dostępu

12. **Implementacja pobierania zagnieżdżonych danych**
    - Query dla uczestników
    - Query dla reguł wykluczeń
    - LUB pojedyncze zapytanie z JOIN

13. **Implementacja sprawdzania is_drawn**

    ```typescript
    const { data: hasAssignments } = await supabase
      .from("assignments")
      .select("id")
      .eq("group_id", groupId)
      .limit(1)
      .maybeSingle();

    const isDrawn = hasAssignments !== null;
    ```

14. **Implementacja logiki obliczeniowej**
    - Obliczanie `is_creator` (userId === group.creator_id)
    - Obliczanie `can_edit` (is_creator && !is_drawn)

15. **Konstrukcja i zwrot GroupDetailDTO**
    ```typescript
    return {
      ...group,
      participants: participants || [],
      exclusions: exclusions || [],
      is_creator: isCreator,
      is_drawn: isDrawn,
      can_edit: canEdit,
    };
    ```

### Faza 5: Integracja endpoint z service (20 min)

16. **Import service w endpoint**

    ```typescript
    import { getGroupById } from "@/lib/services/groups.service";
    ```

17. **Implementacja logiki GET handler**
    - Walidacja ID z Zod
    - Sprawdzenie user z locals
    - Wywołanie service
    - Konstrukcja odpowiedzi JSON

18. **Implementacja obsługi błędów**
    - Try-catch dla całego handlera
    - Obsługa ZodError (400)
    - Obsługa null z service (403/404)
    - Obsługa nieoczekiwanych błędów (500)

### Faza 6: Testowanie (25 min)

19. **Testy manualne z różnymi scenariuszami**
    - ✅ Sukces: Twórca grupy pobiera swoje dane
    - ✅ Sukces: Uczestnik pobiera dane grupy
    - ✅ Sukces: Grupa z losowaniem (is_drawn=true)
    - ✅ Sukces: Grupa bez losowania (is_drawn=false)
    - ❌ 400: Nieprawidłowe ID (string, ujemna liczba, 0)
    - ❌ 401: Brak tokena
    - ❌ 403: Użytkownik nie należy do grupy
    - ❌ 404: Grupa nie istnieje

20. **Testowanie wydajności**
    - Sprawdzenie liczby zapytań do bazy (cel: 2)
    - Pomiar czasu odpowiedzi (cel: < 200ms)

21. **Weryfikacja zgodności typu response z GroupDetailDTO**
    - TypeScript compilation check
    - Runtime validation (opcjonalnie z Zod)

22. **Testowanie bezpieczeństwa**
    - Próba IDOR: Użytkownik A próbuje pobrać grupę użytkownika B
    - Sprawdzenie, czy token jest wymagany
    - Sprawdzenie, czy expired token zwraca 401

### Faza 7: Optymalizacja (15 min)

23. **Implementacja optymalizacji JOIN** (opcjonalne)

    ```typescript
    const { data: group } = await supabase
      .from("groups")
      .select(
        `
        *,
        participants (*),
        exclusion_rules (*)
      `
      )
      .eq("id", groupId)
      .single();
    ```

24. **Dodanie Cache-Control headers**

    ```typescript
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=60"
    }
    ```

25. **Weryfikacja indeksów w bazie**
    - Sprawdzenie, czy indeksy na `assignments.group_id` zostały utworzone
    - Analiza query performance w Supabase Dashboard

### Faza 8: Dokumentacja (10 min)

26. **Dodanie komentarzy JSDoc**

    ```typescript
    /**
     * GET /api/groups/:id
     *
     * Retrieves detailed information about a specific Secret Santa group.
     * Requires authentication and membership/ownership of the group.
     *
     * @param {number} id - Group ID from URL parameter
     * @param {string} userId - Authenticated user ID from JWT token
     * @returns {GroupDetailDTO} Group details with participants and exclusions
     * @throws {400} Invalid group ID format
     * @throws {401} Not authenticated
     * @throws {403} No access to group
     * @throws {404} Group not found
     * @throws {500} Internal server error
     */
    ```

27. **Aktualizacja dokumentacji API** (jeśli istnieje plik API docs)

28. **Dokumentacja decyzji architektonicznych**
    - Dlaczego używamy tabeli assignments zamiast pola is_drawn
    - Uzasadnienie strategii autoryzacji

### Faza 9: Code Review & Deploy (15 min)

29. **Code review checklist**
    - [ ] Wszystkie edge cases obsłużone
    - [ ] Error messages są user-friendly
    - [ ] Typy TypeScript są poprawne i kompletne
    - [ ] Security checks zaimplementowane (authentication + authorization)
    - [ ] Performance optymalizacje zastosowane (JOIN, indeksy)
    - [ ] Kod zgodny z coding standards projektu (ESLint, Prettier)
    - [ ] Brak hardcoded values (używamy env variables gdzie potrzeba)
    - [ ] Logging błędów jest odpowiedni (bez ujawniania wrażliwych danych)

30. **Przygotowanie do deploy**
    - Commit zmian z opisowym commitem
    - Push do brancha feature
    - Utworzenie Pull Request z opisem zmian
    - Weryfikacja CI/CD pipeline (testy, linting)

---

## 11. Checklisty pomocnicze

### Checklist bezpieczeństwa:

- [ ] Token JWT jest weryfikowany przed dostępem do danych
- [ ] Sprawdzenie uprawnień na poziomie zasobów (RBAC)
- [ ] Błędy nie ujawniają szczegółów implementacji
- [ ] Parametry są walidowane przed użyciem
- [ ] Query builder używany zamiast raw SQL
- [ ] Logowanie nie zawiera wrażliwych danych (hasła, tokeny)

### Checklist wydajności:

- [ ] Minimalna liczba zapytań do bazy (cel: 2)
- [ ] Indeksy utworzone dla często używanych pól
- [ ] Cache headers ustawione dla odpowiedzi
- [ ] Response size zoptymalizowany (tylko potrzebne pola)
- [ ] Query time < 100ms (cel)
- [ ] Total response time < 200ms (cel)

### Checklist jakości kodu:

- [ ] TypeScript bez błędów kompilacji
- [ ] ESLint bez warningów
- [ ] Prettier sformatował kod
- [ ] Wszystkie funkcje mają JSDoc
- [ ] Nazwy zmiennych są opisowe
- [ ] Funkcje są krótkie i robią jedną rzecz (SRP)
- [ ] Early returns dla error handling
- [ ] Brak zagnieżdżonych if-ów (guard clauses)

---

## 12. Uwagi końcowe

### Zależności:

- Tabela `assignments` musi być utworzona przed wdrożeniem tego endpointu
- Middleware Astro musi poprawnie dekodować JWT i ustawiać `locals.user`
- Supabase client musi być dostępny w `locals.supabase`

### Potencjalne ulepszenia w przyszłości:

- Dodanie paginacji dla uczestników i wykluczeń
- Implementacja ETag dla bardziej zaawansowanego cachingu
- WebSocket notifications przy zmianach w grupie
- Rate limiting per user
- Metrics/monitoring (response time, error rate)
- Audit log dla dostępów do grup

### Związane endpointy do implementacji później:

- `POST /api/groups` - Tworzenie nowej grupy
- `PATCH /api/groups/:id` - Aktualizacja grupy
- `DELETE /api/groups/:id` - Usuwanie grupy
- `POST /api/groups/:id/draw` - Wykonanie losowania (tworzy assignments)
- `GET /api/groups/:id/result` - Pobranie wyniku losowania dla użytkownika

---

**Szacowany całkowity czas implementacji**: ~2.5 godziny (155 minut)

**Priorytet**: Wysoki (wymagany do wyświetlenia szczegółów grupy w UI)

**Ryzyko**: Niskie (standardowy CRUD endpoint z dobrze zdefiniowanymi wymaganiami)
