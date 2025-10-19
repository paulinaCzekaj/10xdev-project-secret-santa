# Plan implementacji: POST /api/groups/:groupId/draw

## 1. Przegląd punktu końcowego

### Cel

Wykonanie algorytmu losowania Secret Santa dla grupy. Endpoint ten jest kluczowym elementem aplikacji, który tworzy przypisania między uczestnikami zgodnie z regułami wykluczeń.

### Metoda i ścieżka

- **Metoda HTTP**: POST
- **Ścieżka**: `/api/groups/:groupId/draw`
- **Plik implementacji**: `src/pages/api/groups/[groupId]/draw.ts`

### Wymagania funkcjonalne

- Tylko twórca grupy może wykonać losowanie
- Wymagane minimum 3 uczestników
- Losowanie można wykonać tylko raz (nieodwracalne)
- Algorytm musi uwzględniać wszystkie reguły wykluczeń
- Nikt nie może wylosować samego siebie
- Każdy uczestnik musi być zarówno dawcą jak i odbiorcą prezentu (cykl Hamiltona)
- Walidacja możliwości wykonania losowania przed jego rozpoczęciem

### Kluczowe decyzje architektoniczne

1. **Podejście algorytmiczne**: Wykorzystanie teorii grafów - znalezienie cyklu Hamiltonowskiego z ograniczeniami
2. **Bezpieczeństwo transakcji**: Wszystkie przypisania tworzone atomowo (wszystkie lub żadne)
3. **Logika biznesowa**: Ekstrakcja do dedykowanego `DrawService`
4. **Walidacja**: Wielopoziomowa - format parametrów, reguły biznesowe, możliwość matematyczna

## 2. Szczegóły żądania

### Parametry ścieżki

```typescript
interface PathParams {
  groupId: string; // Będzie przekonwertowany na number przez Zod
}
```

### Nagłówki

```typescript
{
  "Authorization": "Bearer {access_token}",
  "Content-Type": "application/json" // opcjonalny
}
```

### Ciało żądania

Brak - endpoint nie przyjmuje żadnych danych w body. Wszystkie niezbędne informacje pobierane są z bazy danych na podstawie `groupId`.

### Walidacja wejścia

#### Schemat Zod dla parametrów

```typescript
const GroupIdParamSchema = z.object({
  groupId: z.coerce.number().int().positive({
    message: "Group ID must be a positive integer",
  }),
});
```

#### Walidacja reguł biznesowych

1. **Grupa istnieje**: Weryfikacja w bazie danych
2. **Użytkownik jest twórcą**: `group.creator_id === userId`
3. **Minimum uczestników**: `participants.length >= 3`
4. **Losowanie nie zostało wykonane**: Brak rekordów w tabeli `assignments` dla `group_id`
5. **Losowanie jest możliwe**: Algorytm walidacyjny sprawdza czy z danymi wykluczeniami da się utworzyć przypisania

### Przykłady żądań

#### Prawidłowe żądanie

```bash
POST /api/groups/1/draw
Authorization: Bearer eyJhbGc...
```

#### Nieprawidłowe żądania

```bash
# Błędny ID grupy
POST /api/groups/abc/draw
# Zwróci: 400 "Group ID must be a positive integer"

# Brak autoryzacji
POST /api/groups/1/draw
# Zwróci: 401 "Authentication required"
```

## 3. Wykorzystywane typy

### Istniejące typy (src/types.ts)

```typescript
// Odpowiedź sukcesu
export interface DrawResultDTO {
  success: boolean;
  message: string;
  group_id: number;
  drawn_at: string; // ISO 8601
  participants_notified: number;
}

// Typ przypisania dla zapisu w bazie
export type AssignmentInsert = TablesInsert<"assignments">;
// Rozszerza się do:
// {
//   group_id: number;
//   giver_participant_id: number;
//   receiver_participant_id: number;
//   created_at?: string; // opcjonalne, generowane automatycznie
// }

// Błąd API
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ID użytkownika
export type UserId = string;
```

### Nowe typy do zdefiniowania

#### Typy wewnętrzne dla algorytmu losowania

```typescript
// src/lib/services/draw.service.ts

/**
 * Reprezentacja uczestnika dla algorytmu losowania
 */
interface DrawParticipant {
  id: number;
  name: string;
}

/**
 * Graf możliwych przypisań
 * Klucz: ID uczestnika (dawcy)
 * Wartość: Tablica ID uczestników, którym może dać prezent
 */
interface AssignmentGraph {
  [giverId: number]: number[];
}

/**
 * Wynik algorytmu losowania
 * Klucz: ID uczestnika (dawcy)
 * Wartość: ID uczestnika (odbiorcy)
 */
interface DrawAssignments {
  [giverId: number]: number;
}

/**
 * Reguła wykluczenia w uproszczonej formie
 */
interface ExclusionRule {
  blocker_participant_id: number;
  blocked_participant_id: number;
}

/**
 * Wynik walidacji możliwości losowania
 */
interface DrawValidation {
  valid: boolean;
  message: string;
  participantsCount?: number;
  exclusionsCount?: number;
}
```

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK)

```typescript
{
  "success": true,
  "message": "Draw completed successfully",
  "group_id": 1,
  "drawn_at": "2025-10-13T10:30:00.000Z",
  "participants_notified": 5
}
```

**Nagłówki odpowiedzi:**

```
Content-Type: application/json
Cache-Control: no-cache, no-store, must-revalidate
```

**Uwagi:**

- `drawn_at`: Znacznik czasu w formacie ISO 8601 (UTC)
- `participants_notified`: W MVP zawsze równy liczbie uczestników (notyfikacje nie są wysyłane, ale liczba jest zwracana dla przyszłej kompatybilności)

### Odpowiedzi błędów

#### 400 Bad Request - Nieprawidłowy format ID

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Group ID must be a positive integer",
    "details": {
      "field": "groupId"
    }
  }
}
```

#### 400 Bad Request - Za mało uczestników

```json
{
  "error": {
    "code": "INSUFFICIENT_PARTICIPANTS",
    "message": "At least 3 participants are required to execute draw",
    "details": {
      "current_count": 2,
      "required_count": 3
    }
  }
}
```

#### 400 Bad Request - Losowanie już wykonane

```json
{
  "error": {
    "code": "DRAW_ALREADY_COMPLETED",
    "message": "Draw has already been completed for this group",
    "details": {
      "drawn_at": "2025-10-13T10:30:00.000Z"
    }
  }
}
```

#### 400 Bad Request - Niemożliwe losowanie

```json
{
  "error": {
    "code": "DRAW_IMPOSSIBLE",
    "message": "Cannot execute draw with current exclusion rules - no valid assignment exists",
    "details": {
      "participants_count": 5,
      "exclusions_count": 12,
      "suggestion": "Remove some exclusion rules to make draw possible"
    }
  }
}
```

#### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### 403 Forbidden

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the group creator can execute draw"
  }
}
```

#### 404 Not Found

```json
{
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "Group not found"
  }
}
```

#### 500 Internal Server Error

```json
{
  "error": {
    "code": "DRAW_EXECUTION_FAILED",
    "message": "Failed to execute draw. Please try again later."
  }
}
```

## 5. Przepływ danych

### Architektura wysokopoziomowa

```
Request → API Endpoint → DrawService → Database
                              ↓
                      Draw Algorithm
                              ↓
                      Assignments Created
                              ↓
                      Response ← DTO
```

### Szczegółowy przepływ

#### Faza 1: Walidacja i autoryzacja (API Endpoint)

```typescript
1. Parsowanie parametru groupId (Zod)
   ↓
2. Weryfikacja autentykacji (sprawdzenie userId z locals/session)
   ↓
3. Parsowanie body (w tym przypadku brak - ale sprawdzenie Content-Type)
   ↓
4. Przekazanie do DrawService
```

#### Faza 2: Walidacja biznesowa (DrawService)

```typescript
1. Pobranie grupy z bazy (SELECT * FROM groups WHERE id = ?)
   ↓
2. Sprawdzenie czy grupa istnieje → 404 jeśli nie
   ↓
3. Sprawdzenie czy userId === group.creator_id → 403 jeśli nie
   ↓
4. Pobranie uczestników (SELECT * FROM participants WHERE group_id = ?)
   ↓
5. Sprawdzenie liczby uczestników >= 3 → 400 jeśli nie
   ↓
6. Sprawdzenie czy losowanie już wykonane
   (SELECT COUNT(*) FROM assignments WHERE group_id = ?)
   → 400 jeśli tak
   ↓
7. Pobranie reguł wykluczeń
   (SELECT * FROM exclusion_rules WHERE group_id = ?)
```

#### Faza 3: Walidacja możliwości losowania (Draw Algorithm)

```typescript
1. Budowa grafu możliwych przypisań
   - Dla każdego uczestnika: lista potencjalnych odbiorców
   - Usunięcie samego siebie (brak self-assignment)
   - Usunięcie wykluczonych (zgodnie z exclusion_rules)
   ↓
2. Szybka walidacja
   - Czy każdy uczestnik ma przynajmniej jednego możliwego odbiorcę?
   - Czy graf jest spójny?
   → 400 "DRAW_IMPOSSIBLE" jeśli nie
```

#### Faza 4: Wykonanie algorytmu losowania (Draw Algorithm)

```typescript
1. Losowe przetasowanie kolejności uczestników (zapewnia losowość)
   ↓
2. Algorytm backtracking:
   - Wybierz nieprzypisanego uczestnika
   - Próbuj przypisać do każdego dostępnego odbiorcy
   - Rekurencyjnie kontynuuj dla następnych
   - Jeśli ślepa uliczka → cofnij się (backtrack)
   - Jeśli wszyscy przypisani → sukces
   ↓
3. Walidacja wyniku:
   - Każdy uczestnik daje prezent dokładnie 1 osobie
   - Każdy uczestnik otrzymuje prezent dokładnie od 1 osoby
   - Tworzy kompletny cykl
```

#### Faza 5: Zapisanie wyników (DrawService + Database)

```typescript
1. Rozpoczęcie transakcji bazy danych
   ↓
2. Przygotowanie rekordów AssignmentInsert[]
   ↓
3. Bulk insert do tabeli assignments
   (INSERT INTO assignments (group_id, giver_participant_id, receiver_participant_id))
   ↓
4. Weryfikacja - sprawdzenie czy wszystkie rekordy zapisane
   ↓
5. Commit transakcji → Sukces
   LUB
   Rollback transakcji → 500 błąd
```

#### Faza 6: Budowa odpowiedzi (API Endpoint)

```typescript
1. Pobranie liczby uczestników (dla participants_notified)
   ↓
2. Utworzenie DrawResultDTO:
   - success: true
   - message: "Draw completed successfully"
   - group_id: groupId
   - drawn_at: new Date().toISOString()
   - participants_notified: participantsCount
   ↓
3. Zwrócenie Response z statusem 200
```

### Interakcje z bazą danych

#### Odczyty

```sql
-- 1. Pobranie grupy
SELECT * FROM groups WHERE id = ?;

-- 2. Pobranie uczestników
SELECT * FROM participants WHERE group_id = ?;

-- 3. Sprawdzenie czy losowanie wykonane
SELECT COUNT(*) FROM assignments WHERE group_id = ?;

-- 4. Pobranie reguł wykluczeń
SELECT blocker_participant_id, blocked_participant_id
FROM exclusion_rules
WHERE group_id = ?;
```

#### Zapisy (w transakcji)

```sql
-- Bulk insert przypisań
INSERT INTO assignments (group_id, giver_participant_id, receiver_participant_id)
VALUES
  (?, ?, ?),
  (?, ?, ?),
  ...;
```

## 6. Względy bezpieczeństwa

### Zagrożenia i mitigacje

#### 1. Nieautoryzowane wykonanie losowania

**Zagrożenie**: Użytkownik inny niż twórca próbuje wykonać losowanie.

**Mitigacja**:

- Weryfikacja `group.creator_id === userId` przed jakimikolwiek operacjami
- Zwrócenie 403 z jasnym komunikatem
- Logowanie nieautoryzowanych prób

```typescript
if (group.creator_id !== userId) {
  console.warn("[POST /api/groups/:groupId/draw] Unauthorized draw attempt", {
    groupId,
    userId,
    creatorId: group.creator_id,
  });
  throw new Error("FORBIDDEN");
}
```

#### 2. Ataki typu replay (ponowne losowanie)

**Zagrożenie**: Wielokrotne wykonanie losowania w celu uzyskania korzystniejszych przypisań.

**Mitigacja**:

- Sprawdzenie istnienia przypisań PRZED rozpoczęciem algorytmu
- Używanie transakcji bazy danych z blokowaniem
- Zwrócenie 400 jeśli już wylosowano
- Rozważenie row-level lock na grupie podczas operacji

```typescript
const { data: existingAssignments } = await supabase
  .from("assignments")
  .select("id")
  .eq("group_id", groupId)
  .limit(1)
  .maybeSingle();

if (existingAssignments !== null) {
  throw new Error("DRAW_ALREADY_COMPLETED");
}
```

#### 3. Wyciek informacji w logach

**Zagrożenie**: Rzeczywiste przypisania widoczne w logach aplikacji.

**Mitigacja**:

- NIGDY nie logować rzeczywistych przypisań (kto komu daje)
- Logować tylko metadane: liczba uczestników, czas wykonania, sukces/porażka
- Używać poziomów logowania: console.log dla sukcesu, console.error dla błędów

```typescript
// ✅ DOBRE
console.log("[DrawService] Draw completed", {
  groupId,
  participantsCount: assignments.length,
  executionTime: endTime - startTime,
});

// ❌ ZŁE - wyciek informacji
console.log("[DrawService] Assignments", {
  assignments: { 1: 2, 2: 3, 3: 1 }, // NIE ROBIĆ!
});
```

#### 4. Race conditions (równoległe wykonanie)

**Zagrożenie**: Dwóch użytkowników (lub dwa requesty) próbuje jednocześnie wykonać losowanie.

**Mitigacja**:

- Użycie transakcji bazy danych
- Unique constraint lub sprawdzenie istnienia w tej samej transakcji
- Rozważenie optimistic locking lub distributed lock

```typescript
// Supabase automatycznie używa transakcji dla bulk insert
// Dodatkowo można użyć SELECT FOR UPDATE
```

#### 5. Analiza wyników przez reguły wykluczeń

**Zagrożenie**: Użytkownik może dedukować przypisania na podstawie reguł wykluczeń.

**Mitigacja**:

- Losowość algorytmu - każde wykonanie (gdyby było możliwe) daje inne wyniki
- Nie ujawnianie wszystkich reguł publicznie (tylko twórca je widzi)
- W przyszłości: limit reguł wykluczeń

#### 6. Denial of Service poprzez skomplikowane grafy

**Zagrożenie**: Użytkownik tworzy grupę z setkami uczestników i tysiącami wykluczeń, przeciążając algorytm.

**Mitigacja**:

- Limit czasu wykonania algorytmu (timeout)
- Limit maksymalnej liczby uczestników (np. 100)
- Limit liczby reguł wykluczeń (np. N^2/2)
- Rate limiting na endpoint

```typescript
const MAX_PARTICIPANTS = 100;
const MAX_ALGORITHM_TIME = 30000; // 30 sekund

if (participants.length > MAX_PARTICIPANTS) {
  throw new Error("TOO_MANY_PARTICIPANTS");
}

// Implementacja timeout w algorytmie
const startTime = Date.now();
if (Date.now() - startTime > MAX_ALGORITHM_TIME) {
  throw new Error("ALGORITHM_TIMEOUT");
}
```

### Dane wrażliwe

#### Nie logować:

- Rzeczywiste przypisania (giver → receiver)
- Pełne listy uczestników z przypisaniami
- Tokeny dostępu użytkowników

#### Można logować:

- Liczby (ile uczestników, ile wykluczeń)
- ID grup i użytkowników (dla debugowania)
- Czasy wykonania
- Komunikaty błędów (bez szczegółów przypisań)

## 7. Obsługa błędów

### Strategia ogólna

1. **Wczesna walidacja**: Sprawdzenie wszystkich warunków przed rozpoczęciem operacji kosztownych
2. **Jasne komunikaty**: Każdy błąd ma konkretny kod i pomocny komunikat
3. **Rollback transakcji**: Jeśli coś pójdzie nie tak podczas zapisu, wszystko jest cofane
4. **Logowanie kontekstu**: Każdy błąd logowany z pełnym kontekstem (groupId, userId, itp.)

### Hierarchia błędów

```
Request
  ↓
[Walidacja parametrów] → 400 INVALID_INPUT
  ↓
[Autentykacja] → 401 UNAUTHORIZED
  ↓
[Sprawdzenie grupy] → 404 GROUP_NOT_FOUND
  ↓
[Autoryzacja twórcy] → 403 FORBIDDEN
  ↓
[Walidacja uczestników] → 400 INSUFFICIENT_PARTICIPANTS
  ↓
[Sprawdzenie czy już losowano] → 400 DRAW_ALREADY_COMPLETED
  ↓
[Walidacja możliwości] → 400 DRAW_IMPOSSIBLE
  ↓
[Wykonanie algorytmu] → 500 DRAW_EXECUTION_FAILED (jeśli błąd wewnętrzny)
  ↓
[Zapisanie do bazy] → 500 DATABASE_ERROR
  ↓
Success (200)
```

### Szczegółowa obsługa w endpoint

```typescript
export const POST: APIRoute = async ({ params, request, locals }) => {
  console.log("[POST /api/groups/:groupId/draw] Endpoint hit", {
    groupId: params.groupId,
  });

  try {
    // Guard 1: Validate groupId parameter
    const { groupId } = GroupIdParamSchema.parse({ groupId: params.groupId });

    // Guard 2: Check authentication
    const userId = locals.userId || DEFAULT_USER_ID;
    if (!userId) {
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

    // Get Supabase client
    const supabase = locals.supabase;

    // Call service to execute draw
    const drawService = new DrawService(supabase);
    const result = await drawService.executeDrawForGroup(groupId, userId);

    // Success - return draw result
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_INPUT",
          message: firstError.message,
          details: {
            field: firstError.path.join("."),
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle service errors
    if (error instanceof Error) {
      // Not found
      if (error.message === "GROUP_NOT_FOUND") {
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

      // Forbidden
      if (error.message === "FORBIDDEN") {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "FORBIDDEN",
            message: "Only the group creator can execute draw",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Insufficient participants
      if (error.message.startsWith("INSUFFICIENT_PARTICIPANTS")) {
        const parts = error.message.split("|");
        const currentCount = parseInt(parts[1] || "0");
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "INSUFFICIENT_PARTICIPANTS",
            message: "At least 3 participants are required to execute draw",
            details: {
              current_count: currentCount,
              required_count: 3,
            },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Draw already completed
      if (error.message.startsWith("DRAW_ALREADY_COMPLETED")) {
        const parts = error.message.split("|");
        const drawnAt = parts[1] || new Date().toISOString();
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "DRAW_ALREADY_COMPLETED",
            message: "Draw has already been completed for this group",
            details: {
              drawn_at: drawnAt,
            },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Draw impossible
      if (error.message.startsWith("DRAW_IMPOSSIBLE")) {
        const parts = error.message.split("|");
        const participantsCount = parseInt(parts[1] || "0");
        const exclusionsCount = parseInt(parts[2] || "0");
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "DRAW_IMPOSSIBLE",
            message: "Cannot execute draw with current exclusion rules - no valid assignment exists",
            details: {
              participants_count: participantsCount,
              exclusions_count: exclusionsCount,
              suggestion: "Remove some exclusion rules to make draw possible",
            },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Log unexpected errors
    console.error("[POST /api/groups/:groupId/draw] Error:", {
      groupId: params.groupId,
      userId: locals.userId || DEFAULT_USER_ID,
      error,
    });

    // Generic error response
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "DRAW_EXECUTION_FAILED",
        message: "Failed to execute draw. Please try again later.",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Logowanie błędów

#### Format logów

```typescript
// Błędy oczekiwane (walidacja)
console.log("[POST /api/groups/:groupId/draw] Validation failed", {
  groupId,
  userId,
  reason: "INSUFFICIENT_PARTICIPANTS",
  participantsCount: 2,
});

// Błędy krytyczne
console.error("[POST /api/groups/:groupId/draw] Critical error", {
  groupId,
  userId,
  error: error.message,
  stack: error.stack,
});
```

## 8. Rozważania dotyczące wydajności

### Złożoność czasowa algorytmu

#### Scenariusz najlepszy (niewiele wykluczeń)

- **Złożoność**: O(n) gdzie n = liczba uczestników
- **Czas wykonania**: < 10ms dla grup do 50 osób

#### Scenariusz średni

- **Złożoność**: O(n \* m) gdzie m = średnia liczba możliwych odbiorców
- **Czas wykonania**: 10-100ms dla typowych grup

#### Scenariusz najgorszy (wiele wykluczeń)

- **Złożoność**: O(n!) w najgorszym przypadku (backtracking)
- **Czas wykonania**: Może być długi dla dużych grup z wieloma wykluczeniami
- **Mitigacja**: Timeout + limity na liczbę uczestników

### Optymalizacje

#### 1. Wczesna walidacja grafu

```typescript
// Szybkie sprawdzenie czy losowanie jest w ogóle możliwe
// PRZED uruchomieniem kosztownego algorytmu
function validateGraphFeasibility(graph: AssignmentGraph): boolean {
  // Każdy uczestnik musi mieć przynajmniej jednego możliwego odbiorcę
  for (const [giverId, possibleReceivers] of Object.entries(graph)) {
    if (possibleReceivers.length === 0) {
      return false;
    }
  }

  // Sprawdzenie podstawowej spójności
  const participantCount = Object.keys(graph).length;
  const totalPossibleConnections = Object.values(graph).reduce((sum, receivers) => sum + receivers.length, 0);

  // Jeśli średnio każdy ma < 1 możliwego odbiorcę, niemożliwe
  if (totalPossibleConnections < participantCount) {
    return false;
  }

  return true;
}
```

#### 2. Losowa kolejność prób

```typescript
// Losowanie kolejności uczestników zapobiega utknięciu
// w tych samych ścieżkach przy kolejnych próbach
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

#### 3. Bulk insert przypisań

```typescript
// Zamiast wiele pojedynczych INSERT, jeden bulk insert
const assignmentsToInsert: AssignmentInsert[] = assignments.map(([giverId, receiverId]) => ({
  group_id: groupId,
  giver_participant_id: giverId,
  receiver_participant_id: receiverId,
}));

// Pojedyncze zapytanie
const { data, error } = await supabase.from("assignments").insert(assignmentsToInsert).select();
```

#### 4. Indeksy bazy danych

Upewnić się, że są indeksy na:

- `assignments.group_id` (dla sprawdzenia czy już losowano)
- `exclusion_rules.group_id` (dla pobierania wykluczeń)
- `participants.group_id` (dla pobierania uczestników)

### Limity

```typescript
// Zdefiniowane w DrawService
const DRAW_CONFIG = {
  MIN_PARTICIPANTS: 3,
  MAX_PARTICIPANTS: 100,
  MAX_EXCLUSIONS_PER_PARTICIPANT: 50, // Nie więcej niż 50% grupy
  MAX_ALGORITHM_TIME_MS: 30000, // 30 sekund timeout
  MAX_BACKTRACK_ATTEMPTS: 10000, // Maksymalna liczba prób backtrackingu
};
```

### Monitorowanie wydajności

```typescript
// Logowanie czasu wykonania
const startTime = performance.now();

const assignments = await this.findValidAssignment(graph, participants);

const executionTime = performance.now() - startTime;
console.log("[DrawService] Algorithm execution time", {
  groupId,
  participantsCount: participants.length,
  exclusionsCount: exclusions.length,
  executionTimeMs: executionTime.toFixed(2),
});

// Alert jeśli zbyt długo
if (executionTime > 5000) {
  console.warn("[DrawService] Slow draw execution", {
    groupId,
    executionTimeMs: executionTime.toFixed(2),
  });
}
```

## 9. Etapy wdrożenia

### Faza 1: Przygotowanie struktury (Priorytet: WYSOKI)

#### 1.1. Utworzenie pliku serwisu

**Plik**: `src/lib/services/draw.service.ts`

**Zadania**:

- [ ] Utworzyć klasę `DrawService`
- [ ] Zdefiniować interfejsy wewnętrzne (DrawParticipant, AssignmentGraph, itp.)
- [ ] Zaimplementować konstruktor przyjmujący SupabaseClient
- [ ] Dodać stałe konfiguracyjne (MIN_PARTICIPANTS, MAX_ALGORITHM_TIME, itp.)

**Szacowany czas**: 30 minut

#### 1.2. Utworzenie pliku endpoint

**Plik**: `src/pages/api/groups/[groupId]/draw.ts`

**Zadania**:

- [ ] Utworzyć plik z podstawową strukturą
- [ ] Dodać konfigurację (`prerender = false`, `trailingSlash = "never"`)
- [ ] Zaimportować wymagane typy z `types.ts`
- [ ] Zdefiniować schemat Zod dla walidacji `groupId`

**Szacowany czas**: 15 minut

### Faza 2: Implementacja algorytmu losowania (Priorytet: WYSOKI)

#### 2.1. Budowa grafu przypisań

**Metoda**: `private buildAssignmentGraph()`

**Zadania**:

- [ ] Utworzyć graf: dla każdego uczestnika lista możliwych odbiorców
- [ ] Usunąć self-assignment (uczestnik nie może wylosować siebie)
- [ ] Zastosować reguły wykluczeń
- [ ] Zwrócić `AssignmentGraph`

**Kod przykładowy**:

```typescript
private buildAssignmentGraph(
  participants: DrawParticipant[],
  exclusions: ExclusionRule[]
): AssignmentGraph {
  const graph: AssignmentGraph = {};

  // Dla każdego uczestnika, domyślnie może dać wszystkim innym
  for (const giver of participants) {
    graph[giver.id] = participants
      .filter(receiver => receiver.id !== giver.id) // Nie samemu sobie
      .map(receiver => receiver.id);
  }

  // Zastosuj reguły wykluczeń
  for (const exclusion of exclusions) {
    const possibleReceivers = graph[exclusion.blocker_participant_id];
    if (possibleReceivers) {
      graph[exclusion.blocker_participant_id] = possibleReceivers.filter(
        id => id !== exclusion.blocked_participant_id
      );
    }
  }

  return graph;
}
```

**Szacowany czas**: 45 minut

#### 2.2. Walidacja możliwości losowania

**Metoda**: `private validateDrawFeasibility()`

**Zadania**:

- [ ] Sprawdzić czy każdy uczestnik ma przynajmniej jednego możliwego odbiorcę
- [ ] Sprawdzić podstawową spójność grafu
- [ ] Zwrócić `DrawValidation` z wynikiem

**Kod przykładowy**:

```typescript
private validateDrawFeasibility(
  graph: AssignmentGraph,
  participantsCount: number,
  exclusionsCount: number
): DrawValidation {
  // Sprawdź czy każdy ma możliwego odbiorcę
  for (const [giverId, possibleReceivers] of Object.entries(graph)) {
    if (possibleReceivers.length === 0) {
      return {
        valid: false,
        message: `Participant ${giverId} has no possible receivers`,
        participantsCount,
        exclusionsCount,
      };
    }
  }

  // Sprawdź podstawową spójność
  const totalConnections = Object.values(graph)
    .reduce((sum, receivers) => sum + receivers.length, 0);

  if (totalConnections < participantsCount) {
    return {
      valid: false,
      message: "Not enough possible connections for valid draw",
      participantsCount,
      exclusionsCount,
    };
  }

  return {
    valid: true,
    message: "Draw is feasible",
    participantsCount,
    exclusionsCount,
  };
}
```

**Szacowany czas**: 30 minut

#### 2.3. Algorytm backtracking

**Metoda**: `private findValidAssignment()`

**Zadania**:

- [ ] Zaimplementować algorytm backtracking z losowością
- [ ] Dodać timeout i limit prób
- [ ] Walidować wynik (każdy daje i otrzymuje dokładnie raz)
- [ ] Zwrócić `DrawAssignments` lub rzucić błąd

**Kod przykładowy**:

```typescript
private findValidAssignment(
  graph: AssignmentGraph,
  participants: DrawParticipant[]
): DrawAssignments {
  const startTime = Date.now();
  const assignments: DrawAssignments = {};
  const usedReceivers = new Set<number>();

  // Przetasuj uczestników dla losowości
  const shuffledParticipants = this.shuffleArray(participants);

  const backtrack = (index: number): boolean => {
    // Timeout check
    if (Date.now() - startTime > DRAW_CONFIG.MAX_ALGORITHM_TIME_MS) {
      throw new Error("ALGORITHM_TIMEOUT");
    }

    // Wszyscy przypisani - sukces!
    if (index === shuffledParticipants.length) {
      return true;
    }

    const giver = shuffledParticipants[index];
    const possibleReceivers = this.shuffleArray(graph[giver.id]);

    for (const receiverId of possibleReceivers) {
      // Czy odbiorca już jest przypisany?
      if (usedReceivers.has(receiverId)) {
        continue;
      }

      // Przypisz
      assignments[giver.id] = receiverId;
      usedReceivers.add(receiverId);

      // Rekurencyjnie dla następnego
      if (backtrack(index + 1)) {
        return true;
      }

      // Backtrack
      delete assignments[giver.id];
      usedReceivers.delete(receiverId);
    }

    return false;
  };

  const success = backtrack(0);

  if (!success) {
    throw new Error("DRAW_IMPOSSIBLE|Failed to find valid assignment");
  }

  return assignments;
}

private shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

**Szacowany czas**: 90 minut

### Faza 3: Implementacja serwisu (Priorytet: WYSOKI)

#### 3.1. Metoda główna executeDrawForGroup

**Metoda**: `public executeDrawForGroup()`

**Zadania**:

- [ ] Walidacja istnienia grupy
- [ ] Sprawdzenie autoryzacji (user jest twórcą)
- [ ] Pobranie uczestników
- [ ] Walidacja minimalnej liczby uczestników (>= 3)
- [ ] Sprawdzenie czy losowanie już wykonane
- [ ] Pobranie reguł wykluczeń
- [ ] Budowa grafu
- [ ] Walidacja możliwości
- [ ] Wykonanie algorytmu
- [ ] Zapisanie przypisań (transakcja)
- [ ] Zwrócenie DrawResultDTO

**Kod przykładowy**:

```typescript
async executeDrawForGroup(
  groupId: number,
  userId: UserId
): Promise<DrawResultDTO> {
  console.log("[DrawService.executeDrawForGroup] Starting", {
    groupId,
    userId,
  });

  // Step 1: Validate group exists and get group data
  const { data: group, error: groupError } = await this.supabase
    .from("groups")
    .select("id, creator_id")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    console.log("[DrawService.executeDrawForGroup] Group not found", {
      groupId,
    });
    throw new Error("GROUP_NOT_FOUND");
  }

  // Step 2: Check if user is creator
  if (group.creator_id !== userId) {
    console.log("[DrawService.executeDrawForGroup] User not authorized", {
      userId,
      creatorId: group.creator_id,
    });
    throw new Error("FORBIDDEN");
  }

  // Step 3: Get participants
  const { data: participants, error: participantsError } = await this.supabase
    .from("participants")
    .select("id, name")
    .eq("group_id", groupId);

  if (participantsError || !participants) {
    throw new Error("Failed to fetch participants");
  }

  // Step 4: Validate minimum participants
  if (participants.length < DRAW_CONFIG.MIN_PARTICIPANTS) {
    throw new Error(
      `INSUFFICIENT_PARTICIPANTS|${participants.length}`
    );
  }

  console.log("[DrawService.executeDrawForGroup] Found participants", {
    count: participants.length,
  });

  // Step 5: Check if draw already completed
  const { data: existingAssignments } = await this.supabase
    .from("assignments")
    .select("created_at")
    .eq("group_id", groupId)
    .limit(1)
    .maybeSingle();

  if (existingAssignments !== null) {
    throw new Error(
      `DRAW_ALREADY_COMPLETED|${existingAssignments.created_at}`
    );
  }

  // Step 6: Get exclusion rules
  const { data: exclusions } = await this.supabase
    .from("exclusion_rules")
    .select("blocker_participant_id, blocked_participant_id")
    .eq("group_id", groupId);

  console.log("[DrawService.executeDrawForGroup] Found exclusion rules", {
    count: exclusions?.length || 0,
  });

  // Step 7: Build assignment graph
  const graph = this.buildAssignmentGraph(
    participants,
    exclusions || []
  );

  // Step 8: Validate feasibility
  const validation = this.validateDrawFeasibility(
    graph,
    participants.length,
    exclusions?.length || 0
  );

  if (!validation.valid) {
    console.log("[DrawService.executeDrawForGroup] Draw not feasible", {
      validation,
    });
    throw new Error(
      `DRAW_IMPOSSIBLE|${participants.length}|${exclusions?.length || 0}`
    );
  }

  // Step 9: Execute draw algorithm
  console.log("[DrawService.executeDrawForGroup] Executing draw algorithm");
  const algorithmStart = performance.now();

  const assignments = this.findValidAssignment(graph, participants);

  const algorithmTime = performance.now() - algorithmStart;
  console.log("[DrawService.executeDrawForGroup] Algorithm completed", {
    executionTimeMs: algorithmTime.toFixed(2),
  });

  // Step 10: Save assignments to database
  const assignmentsToInsert: AssignmentInsert[] = Object.entries(assignments).map(
    ([giverId, receiverId]) => ({
      group_id: groupId,
      giver_participant_id: parseInt(giverId),
      receiver_participant_id: receiverId,
    })
  );

  const { data: savedAssignments, error: insertError } = await this.supabase
    .from("assignments")
    .insert(assignmentsToInsert)
    .select();

  if (insertError || !savedAssignments) {
    console.error(
      "[DrawService.executeDrawForGroup] Failed to save assignments:",
      insertError
    );
    throw new Error("Failed to save draw results");
  }

  console.log("[DrawService.executeDrawForGroup] Draw completed successfully", {
    groupId,
    assignmentsCount: savedAssignments.length,
  });

  // Step 11: Return DrawResultDTO
  const drawnAt = new Date().toISOString();
  return {
    success: true,
    message: "Draw completed successfully",
    group_id: groupId,
    drawn_at: drawnAt,
    participants_notified: participants.length,
  };
}
```

**Szacowany czas**: 60 minut

### Faza 4: Implementacja endpoint API (Priorytet: WYSOKI)

#### 4.1. Handler POST

**Plik**: `src/pages/api/groups/[groupId]/draw.ts`

**Zadania**:

- [ ] Zaimplementować funkcję `POST`
- [ ] Dodać walidację parametrów (Zod)
- [ ] Dodać sprawdzenie autentykacji
- [ ] Wywołać `DrawService.executeDrawForGroup()`
- [ ] Obsłużyć wszystkie możliwe błędy
- [ ] Zwrócić odpowiednią odpowiedź (200 lub error)

**Kod przykładowy**: Zobacz sekcja 7 "Obsługa błędów" - pełny kod handlera

**Szacowany czas**: 45 minut

### Faza 5: Testy jednostkowe (Priorytet: ŚREDNI)

#### 5.1. Testy algorytmu losowania

**Plik**: `src/lib/services/__tests__/draw.service.test.ts`

**Zadania**:

- [ ] Test: Prosty graf bez wykluczeń (3 uczestników)
- [ ] Test: Graf z wykluczeniami
- [ ] Test: Niemożliwy graf (uczestnik bez możliwych odbiorców)
- [ ] Test: Graf z jednym możliwym rozwiązaniem
- [ ] Test: Weryfikacja że nikt nie losuje siebie
- [ ] Test: Weryfikacja że wykluczenia są respektowane
- [ ] Test: Weryfikacja kompletności cyklu

**Szacowany czas**: 120 minut

#### 5.2. Testy serwisu

**Plik**: Ten sam co powyżej

**Zadania**:

- [ ] Test: Sukces - poprawne wykonanie losowania
- [ ] Test: Błąd - grupa nie istnieje
- [ ] Test: Błąd - użytkownik nie jest twórcą
- [ ] Test: Błąd - za mało uczestników
- [ ] Test: Błąd - losowanie już wykonane
- [ ] Test: Błąd - niemożliwe wykluczenia

**Szacowany czas**: 90 minut

#### 5.3. Testy endpoint

**Plik**: `src/pages/api/groups/[groupId]/__tests__/draw.test.ts`

**Zadania**:

- [ ] Test: 200 - sukces
- [ ] Test: 400 - nieprawidłowy groupId
- [ ] Test: 401 - brak autentykacji
- [ ] Test: 403 - nie twórca
- [ ] Test: 404 - grupa nie istnieje
- [ ] Test: 400 - za mało uczestników
- [ ] Test: 400 - już losowano
- [ ] Test: 400 - niemożliwe losowanie

**Szacowany czas**: 90 minut

### Faza 6: Dokumentacja i finalizacja (Priorytet: NISKI)

#### 6.1. Dokumentacja kodu

**Zadania**:

- [ ] JSDoc dla wszystkich publicznych metod DrawService
- [ ] Komentarze w algorytmie wyjaśniające kroki
- [ ] Przykłady użycia w komentarzach

**Szacowany czas**: 30 minut

#### 6.2. Testy integracyjne

**Zadania**:

- [ ] Test end-to-end: Utworzenie grupy → dodanie uczestników → wykonanie losowania
- [ ] Test: Próba ponownego losowania (powinno zwrócić 400)
- [ ] Test: Losowanie z maksymalną liczbą uczestników

**Szacowany czas**: 60 minut

#### 6.3. Przegląd i refactoring

**Zadania**:

- [ ] Code review
- [ ] Optymalizacja wydajności (jeśli potrzebna)
- [ ] Sprawdzenie zgodności z CLAUDE.md guidelines
- [ ] Uruchomienie ESLint i Prettier

**Szacowany czas**: 45 minut

---

## Podsumowanie

### Łączny szacowany czas implementacji: 12-14 godzin

### Krytyczne punkty do uwagi:

1. **Algorytm losowania** - Najważniejsza i najbardziej złożona część
2. **Atomowość operacji** - Transakcje bazy danych muszą działać poprawnie
3. **Walidacja możliwości** - Sprawdzenie PRZED uruchomieniem algorytmu
4. **Bezpieczeństwo** - Nigdy nie logować rzeczywistych przypisań
5. **Testy** - Algorytm musi być pokryty testami ze względu na krytyczność

### Zalecana kolejność implementacji:

1. Faza 1: Struktura (45 min)
2. Faza 2: Algorytm (165 min / 2.75h)
3. Faza 3: Serwis (60 min)
4. Faza 4: Endpoint (45 min)
5. Faza 5: Testy (300 min / 5h)
6. Faza 6: Dokumentacja (135 min / 2.25h)

### Zależności:

- DrawService zależy od istniejących typów w `types.ts` ✓
- Endpoint zależy od DrawService
- Testy zależą od pełnej implementacji

### Możliwe rozszerzenia (poza MVP):

- Podgląd możliwych przypisań bez wykonania
- Endpoint do walidacji: `POST /api/groups/:groupId/draw/validate`
- Statystyki: ile było prób backtrackingu
- Optymalizacje algorytmu dla bardzo dużych grup
- Distributed locking dla zapobiegania race conditions
