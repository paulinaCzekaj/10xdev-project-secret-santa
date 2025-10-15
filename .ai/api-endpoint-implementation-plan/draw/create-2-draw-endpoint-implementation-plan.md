# API Endpoint Implementation Plan: Execute Secret Santa Draw

## 1. Przegląd punktu końcowego

Ten endpoint wykonuje algorytm losowania Secret Santa dla wskazanej grupy. Algorytm przydziela każdemu uczestnikowi inną osobę, dla której będzie kupował prezent, uwzględniając zdefiniowane reguły wykluczeń. Losowanie jest operacją nieodwracalną i może być wykonane tylko raz dla każdej grupy.

**Kluczowe cechy:**
- Tylko twórca grupy może wykonać losowanie
- Wymaga minimum 3 uczestników
- Uwzględnia jednokierunkowe reguły wykluczeń
- Operacja jest atomowa (transaction)
- Wyniki są zapisywane w tabeli `assignments`

## 2. Szczegóły żądania

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/groups/:groupId/draw`
- **Content-Type**: `application/json`
- **Parametry**:
  - **Wymagane**:
    - `groupId` (path parameter) - ID grupy dla której wykonać losowanie (integer > 0)
  - **Opcjonalne**: brak
- **Headers**:
  - `Authorization: Bearer {access_token}` (required)
- **Request Body**: brak

**Walidacja parametrów (Zod schema):**
```typescript
const paramsSchema = z.object({
  groupId: z.coerce.number().int().positive()
});
```

## 3. Wykorzystywane typy

**Z src/types.ts:**

**Response DTOs:**
- `DrawResultDTO` (lines 184-190) - główny response type
  ```typescript
  {
    success: boolean;
    message: string;
    group_id: number;
    drawn_at: string; // ISO datetime
    participants_notified: number;
  }
  ```

**Database types:**
- `GroupDTO` (lines 61-70) - do sprawdzenia grupy i twórcy
- `ParticipantDTO` (line 120) - lista uczestników
- `ExclusionRuleDTO` (line 160) - reguły wykluczeń
- `AssignmentDTO` (line 212) - do sprawdzenia czy losowanie już wykonane
- `AssignmentInsert` (line 343) - do wstawienia wyników losowania
- `ApiErrorResponse` (lines 20-26) - dla błędów

**Wewnętrzne typy dla algorytmu:**
```typescript
interface DrawParticipant {
  id: number;
  name: string;
  exclusions: number[]; // IDs of participants this person cannot draw
}

interface DrawAssignment {
  giver_id: number;
  receiver_id: number;
}
```

## 4. Szczegóły odpowiedzi

**Success Response (200):**
```json
{
  "success": true,
  "message": "Draw completed successfully",
  "group_id": 1,
  "drawn_at": "2025-10-13T10:00:00Z",
  "participants_notified": 5
}
```

**Error Responses:**

**400 Bad Request - Invalid groupId:**
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid group ID format",
    "details": { "groupId": "must be a positive integer" }
  }
}
```

**400 Bad Request - Not enough participants:**
```json
{
  "error": {
    "code": "INSUFFICIENT_PARTICIPANTS",
    "message": "At least 3 participants are required to execute a draw",
    "details": { "current_count": 2, "required_minimum": 3 }
  }
}
```

**400 Bad Request - Draw already completed:**
```json
{
  "error": {
    "code": "DRAW_ALREADY_COMPLETED",
    "message": "Draw has already been completed for this group",
    "details": { "drawn_at": "2025-10-12T15:30:00Z" }
  }
}
```

**400 Bad Request - Impossible draw:**
```json
{
  "error": {
    "code": "IMPOSSIBLE_DRAW",
    "message": "Draw is impossible with current exclusion rules",
    "details": {
      "reason": "Exclusion rules create an impossible configuration",
      "suggestion": "Review and remove some exclusion rules"
    }
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
    "message": "Only the group creator can execute the draw",
    "details": { "creator_id": "user123", "current_user": "user456" }
  }
}
```

**404 Not Found:**
```json
{
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "Group not found",
    "details": { "group_id": 1 }
  }
}
```

**500 Internal Server Error:**
```json
{
  "error": {
    "code": "DRAW_EXECUTION_ERROR",
    "message": "An error occurred while executing the draw"
  }
}
```

## 5. Przepływ danych

### 5.1. High-Level Flow

```
Client Request
    ↓
[1] Middleware: Authentication & Authorization
    ↓
[2] Route Handler: Parse & Validate Params
    ↓
[3] Service: Fetch Group & Verify Ownership
    ↓
[4] Service: Pre-Draw Validation
    ├─ Check participants count (≥ 3)
    ├─ Check if draw already executed
    └─ Validate exclusion rules compatibility
    ↓
[5] Service: Execute Draw Algorithm
    ├─ Fetch participants
    ├─ Fetch exclusion rules
    ├─ Build graph representation
    ├─ Find valid assignment using backtracking/graph algorithm
    └─ Verify solution validity
    ↓
[6] Service: Save Assignments (Transaction)
    ├─ Insert all assignments atomically
    └─ Record draw timestamp
    ↓
[7] Response: Return DrawResultDTO
```

### 5.2. Szczegółowy przepływ danych

**Krok 1: Walidacja wejścia**
```typescript
// Astro endpoint: src/pages/api/groups/[groupId]/draw.ts
export const POST = async (context: APIContext) => {
  // Parse params
  const { groupId } = paramsSchema.parse(context.params);

  // Check authentication
  const user = context.locals.user;
  if (!user) return unauthorized();
}
```

**Krok 2: Pobranie i weryfikacja grupy**
```typescript
// Service call
const group = await groupsService.getGroupById(supabase, groupId);
if (!group) return notFound();

// Verify ownership
if (group.creator_id !== user.id) return forbidden();
```

**Krok 3: Pre-draw validation**
```typescript
// Check if draw already done
const existingAssignments = await assignmentsService.getByGroupId(supabase, groupId);
if (existingAssignments.length > 0) {
  return badRequest('DRAW_ALREADY_COMPLETED', 'Draw has already been completed');
}

// Get participants and validate count
const participants = await participantsService.getByGroupId(supabase, groupId);
if (participants.length < 3) {
  return badRequest('INSUFFICIENT_PARTICIPANTS', 'At least 3 participants required');
}

// Get exclusion rules
const exclusions = await exclusionsService.getByGroupId(supabase, groupId);
```

**Krok 4: Wykonanie algorytmu losowania**
```typescript
// Draw service
const assignments = await drawService.executeDrawAlgorithm(participants, exclusions);
if (!assignments) {
  return badRequest('IMPOSSIBLE_DRAW', 'Draw impossible with current rules');
}
```

**Krok 5: Zapisanie wyników (Transaction)**
```typescript
const result = await supabase.rpc('execute_draw_transaction', {
  p_group_id: groupId,
  p_assignments: assignments
});
```

### 5.3. Database Queries

**Query 1: Fetch group with creator check**
```sql
SELECT * FROM groups WHERE id = $1
```

**Query 2: Check existing assignments**
```sql
SELECT COUNT(*) as count FROM assignments WHERE group_id = $1
```

**Query 3: Fetch participants**
```sql
SELECT id, name, email FROM participants WHERE group_id = $1
```

**Query 4: Fetch exclusion rules**
```sql
SELECT blocker_participant_id, blocked_participant_id
FROM exclusion_rules
WHERE group_id = $1
```

**Query 5: Insert assignments (batch in transaction)**
```sql
-- Wrapped in transaction
BEGIN;
INSERT INTO assignments (group_id, giver_participant_id, receiver_participant_id, created_at)
VALUES
  ($1, $2, $3, NOW()),
  ($1, $4, $5, NOW()),
  ... (all assignments)
RETURNING *;
COMMIT;
```

### 5.4. Algorithm: Secret Santa Draw

**Algorytm wykorzystuje podejście backtracking do znalezienia prawidłowego przypisania:**

1. **Przygotowanie danych**:
   - Stworzenie mapy wykluczeń dla każdego uczestnika
   - Stworzenie listy dostępnych odbiorców dla każdego dawcy

2. **Walidacja wstępna**:
   - Sprawdzenie czy każdy uczestnik ma przynajmniej jednego możliwego odbiorcę
   - Sprawdzenie czy graf jest spójny (możliwe znalezienie cyklu)

3. **Algorytm backtracking**:
   ```
   function findAssignment(currentIndex, availableReceivers, assignments):
     if currentIndex == participantsCount:
       return assignments  // Success!

     giver = participants[currentIndex]
     for each receiver in availableReceivers[giver]:
       if isValidAssignment(giver, receiver, assignments):
         newAssignments = assignments + {giver -> receiver}
         newAvailable = availableReceivers without receiver
         result = findAssignment(currentIndex + 1, newAvailable, newAssignments)
         if result != null:
           return result

     return null  // No valid assignment found (backtrack)
   ```

4. **Walidacja wyniku**:
   - Każdy uczestnik ma dokładnie jedno przypisanie (jako dawca)
   - Każdy uczestnik jest dokładnie jednym odbiorcą
   - Żadne wykluczenie nie zostało naruszone
   - Nikt nie dostał samego siebie

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie
- **Wymagany Bearer token** z Supabase Auth
- Wykorzystanie `context.locals.user` (ustawiane przez middleware)
- Zwrócenie 401 jeśli użytkownik nie jest zalogowany

```typescript
const user = context.locals.user;
if (!user) {
  return new Response(
    JSON.stringify({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    }),
    { status: 401 }
  );
}
```

### 6.2. Autoryzacja
- **Tylko twórca grupy** może wykonać losowanie
- Sprawdzenie `group.creator_id === user.id`
- Zwrócenie 403 Forbidden w przypadku braku uprawnień

```typescript
if (group.creator_id !== user.id) {
  return new Response(
    JSON.stringify({
      error: {
        code: 'FORBIDDEN',
        message: 'Only the group creator can execute the draw'
      }
    }),
    { status: 403 }
  );
}
```

### 6.3. Walidacja danych wejściowych
- **Zod schema** dla parametrów URL
- Walidacja czy `groupId` jest dodatnią liczbą całkowitą
- Obsługa błędów walidacji z odpowiednimi komunikatami

### 6.4. Race Condition Prevention
- **Database transaction** dla wstawienia assignmentów
- **Sprawdzenie istniejących assignmentów** na początku operacji
- Możliwość użycia **database constraint** lub **advisory lock**:

```sql
-- Option 1: Unique constraint
ALTER TABLE assignments ADD CONSTRAINT unique_group_assignment
UNIQUE (group_id, giver_participant_id);

-- Option 2: Advisory lock in transaction
SELECT pg_advisory_xact_lock(groupId);
```

### 6.5. Data Exposure Prevention
- **Nie ujawnianie wewnętrznych błędów** w production
- Logowanie szczegółowych błędów server-side
- Zwracanie ogólnych komunikatów błędów użytkownikowi

### 6.6. SQL Injection Prevention
- Wykorzystanie **Supabase query builder** lub **prepared statements**
- Nigdy nie konkatenowanie SQL queries z inputem użytkownika
- Parametryzowane zapytania dla wszystkich operacji DB

## 7. Obsługa błędów

### 7.1. Warstwy obsługi błędów

**Layer 1: Input Validation (Zod)**
```typescript
try {
  const { groupId } = paramsSchema.parse(context.params);
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid group ID format',
          details: error.errors
        }
      }),
      { status: 400 }
    );
  }
}
```

**Layer 2: Business Logic Validation**
```typescript
// Not enough participants
if (participants.length < 3) {
  return new Response(
    JSON.stringify({
      error: {
        code: 'INSUFFICIENT_PARTICIPANTS',
        message: 'At least 3 participants are required',
        details: {
          current_count: participants.length,
          required_minimum: 3
        }
      }
    }),
    { status: 400 }
  );
}

// Draw already completed
if (existingAssignments.length > 0) {
  return new Response(
    JSON.stringify({
      error: {
        code: 'DRAW_ALREADY_COMPLETED',
        message: 'Draw has already been completed for this group'
      }
    }),
    { status: 400 }
  );
}

// Impossible draw
if (!isDrawPossible(participants, exclusions)) {
  return new Response(
    JSON.stringify({
      error: {
        code: 'IMPOSSIBLE_DRAW',
        message: 'Draw is impossible with current exclusion rules',
        details: {
          suggestion: 'Review and remove some exclusion rules'
        }
      }
    }),
    { status: 400 }
  );
}
```

**Layer 3: Algorithm Failures**
```typescript
const assignments = await drawService.executeDrawAlgorithm(participants, exclusions);
if (!assignments) {
  console.error('Draw algorithm failed to find valid assignment', {
    groupId,
    participantsCount: participants.length,
    exclusionsCount: exclusions.length
  });

  return new Response(
    JSON.stringify({
      error: {
        code: 'DRAW_EXECUTION_ERROR',
        message: 'Failed to execute draw algorithm'
      }
    }),
    { status: 500 }
  );
}
```

**Layer 4: Database Errors**
```typescript
try {
  await assignmentsService.createBatch(supabase, assignments);
} catch (error) {
  console.error('Database error while saving assignments:', error);

  return new Response(
    JSON.stringify({
      error: {
        code: 'DATABASE_ERROR',
        message: 'An error occurred while saving the draw results'
      }
    }),
    { status: 500 }
  );
}
```

### 7.2. Tabela kodów błędów

| HTTP Status | Error Code | Message | Szczegóły |
|-------------|-----------|---------|-----------|
| 400 | INVALID_INPUT | Invalid group ID format | Parametr groupId nie jest prawidłową liczbą |
| 400 | INSUFFICIENT_PARTICIPANTS | At least 3 participants are required | Grupa ma mniej niż 3 uczestników |
| 400 | DRAW_ALREADY_COMPLETED | Draw has already been completed | Losowanie już zostało wykonane dla tej grupy |
| 400 | IMPOSSIBLE_DRAW | Draw is impossible with current exclusion rules | Reguły wykluczeń uniemożliwiają losowanie |
| 401 | UNAUTHORIZED | Authentication required | Brak tokenu autoryzacji |
| 403 | FORBIDDEN | Only the group creator can execute the draw | Użytkownik nie jest twórcą grupy |
| 404 | GROUP_NOT_FOUND | Group not found | Grupa o podanym ID nie istnieje |
| 500 | DRAW_EXECUTION_ERROR | Failed to execute draw algorithm | Błąd algorytmu losowania |
| 500 | DATABASE_ERROR | An error occurred while saving results | Błąd zapisu do bazy danych |

### 7.3. Logging Strategy

**Development:**
- Pełne logi ze szczegółami błędów
- Stack traces
- Parametry wejściowe

**Production:**
- Structured logging (JSON)
- Error tracking service (np. Sentry)
- Nie logowanie danych wrażliwych (tokens, emails w całości)

```typescript
console.error('Draw execution failed', {
  groupId,
  userId: user.id,
  error: error.message,
  timestamp: new Date().toISOString()
});
```

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła

**1. Algorytm losowania**
- **Problem**: Backtracking może mieć złożoność wykładniczą O(n!) w najgorszym przypadku
- **Mitigation**:
  - Implementacja timeout (np. 5 sekund)
  - Optymalizacja kolejności przetwarzania (uczestników z najmniejszą liczbą dostępnych odbiorców najpierw)
  - Implementacja heurystyk do przyśpieszenia algorytmu

**2. Database queries**
- **Problem**: Wiele oddzielnych zapytań (grupa, uczestnicy, wykluczenia, assignments)
- **Mitigation**:
  - Możliwość użycia JOIN queries gdzie możliwe
  - Przygotowanie indeksów na foreign keys
  - Rozważenie stored procedure dla całej operacji

**3. Transaction locks**
- **Problem**: Long-running transaction może blokować inne operacje
- **Mitigation**:
  - Wykonanie algorytmu PRZED transakcją
  - Transaction tylko do zapisu wyników
  - Krótki czas trwania transakcji

### 8.2. Optymalizacje

**Optymalizacja 1: Batch Insert**
```typescript
// Zamiast:
for (const assignment of assignments) {
  await supabase.from('assignments').insert(assignment);
}

// Użyć:
await supabase.from('assignments').insert(assignments);
```

**Optymalizacja 2: Single Query dla walidacji**
```sql
-- Zamiast 3 osobnych queries, jeden query:
SELECT
  (SELECT COUNT(*) FROM participants WHERE group_id = $1) as participants_count,
  (SELECT COUNT(*) FROM assignments WHERE group_id = $1) as assignments_count,
  (SELECT json_agg(json_build_object(
    'blocker', blocker_participant_id,
    'blocked', blocked_participant_id
  )) FROM exclusion_rules WHERE group_id = $1) as exclusions
```

**Optymalizacja 3: Early termination**
```typescript
// Sprawdzenie impossible draw przed wykonaniem algorytmu
function isDrawPossible(participants, exclusions): boolean {
  // Quick check: każdy uczestnik musi mieć co najmniej jednego możliwego odbiorcę
  for (const participant of participants) {
    const possibleReceivers = participants.filter(p =>
      p.id !== participant.id &&
      !isExcluded(participant.id, p.id, exclusions)
    );
    if (possibleReceivers.length === 0) {
      return false;
    }
  }
  return true;
}
```

**Optymalizacja 4: Algorithm timeout**
```typescript
const MAX_ALGORITHM_TIME = 5000; // 5 seconds

async function executeDrawWithTimeout(participants, exclusions) {
  return Promise.race([
    executeDrawAlgorithm(participants, exclusions),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Algorithm timeout')), MAX_ALGORITHM_TIME)
    )
  ]);
}
```

### 8.3. Skalowanie

**Current scale expectations:**
- Grupy do ~50 uczestników
- Reguły wykluczeń do ~100 per grupa
- Czas wykonania < 5 sekund

**Future considerations:**
- Dla większych grup (>50): rozważyć lepszy algorytm (np. Hopcroft-Karp)
- Background job processing dla bardzo dużych grup
- Caching mechanizm dla walidacji

### 8.4. Database Indexes

**Wymagane indeksy:**
```sql
-- Już powinny istnieć z foreign keys, ale należy sprawdzić:
CREATE INDEX IF NOT EXISTS idx_participants_group_id ON participants(group_id);
CREATE INDEX IF NOT EXISTS idx_exclusion_rules_group_id ON exclusion_rules(group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_group_id ON assignments(group_id);

-- Dla unikania duplikatów:
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_giver_unique
ON assignments(group_id, giver_participant_id);
```

## 9. Kroki implementacji

### Krok 1: Przygotowanie struktury plików
**Pliki do utworzenia:**
- `src/pages/api/groups/[groupId]/draw.ts` - główny endpoint
- `src/lib/services/draw.service.ts` - logika algorytmu losowania
- `src/lib/services/assignments.service.ts` - operacje na assignments (jeśli nie istnieje)
- `src/lib/services/groups.service.ts` - operacje na grupach (jeśli nie istnieje)

**Pliki do zmodyfikowania:**
- `src/types.ts` - upewnić się że wszystkie potrzebne typy istnieją

### Krok 2: Implementacja validation schemas
```typescript
// src/pages/api/groups/[groupId]/draw.ts
import { z } from 'zod';

const paramsSchema = z.object({
  groupId: z.coerce.number().int().positive({
    message: 'Group ID must be a positive integer'
  })
});
```

### Krok 3: Implementacja algorytmu losowania
```typescript
// src/lib/services/draw.service.ts

interface DrawParticipant {
  id: number;
  name: string;
}

interface ExclusionRule {
  blocker_participant_id: number;
  blocked_participant_id: number;
}

interface Assignment {
  giver_participant_id: number;
  receiver_participant_id: number;
}

export class DrawService {
  /**
   * Sprawdza czy losowanie jest możliwe z danymi regułami
   */
  isDrawPossible(
    participants: DrawParticipant[],
    exclusions: ExclusionRule[]
  ): boolean {
    // Implementacja: każdy uczestnik musi mieć co najmniej jednego możliwego odbiorcę
  }

  /**
   * Wykonuje algorytm losowania
   * @returns assignments lub null jeśli niemożliwe
   */
  executeDrawAlgorithm(
    participants: DrawParticipant[],
    exclusions: ExclusionRule[]
  ): Assignment[] | null {
    // Implementacja backtracking algorithm
  }

  /**
   * Waliduje poprawność wygenerowanych assignments
   */
  private validateAssignments(
    assignments: Assignment[],
    participants: DrawParticipant[],
    exclusions: ExclusionRule[]
  ): boolean {
    // Sprawdza:
    // 1. Każdy uczestnik jest dawcą dokładnie raz
    // 2. Każdy uczestnik jest odbiorcą dokładnie raz
    // 3. Nikt nie dostał samego siebie
    // 4. Żadne wykluczenie nie zostało naruszone
  }
}
```

### Krok 4: Implementacja assignments service
```typescript
// src/lib/services/assignments.service.ts

export class AssignmentsService {
  /**
   * Pobiera assignments dla grupy
   */
  async getByGroupId(
    supabase: SupabaseClient,
    groupId: number
  ): Promise<AssignmentDTO[]> {
    // Implementacja query
  }

  /**
   * Tworzy wiele assignments w transakcji
   */
  async createBatch(
    supabase: SupabaseClient,
    groupId: number,
    assignments: Assignment[]
  ): Promise<AssignmentDTO[]> {
    // Implementacja batch insert w transakcji
  }

  /**
   * Sprawdza czy grupa ma już wykonane losowanie
   */
  async hasDrawBeenExecuted(
    supabase: SupabaseClient,
    groupId: number
  ): Promise<boolean> {
    // Implementacja sprawdzenia
  }
}
```

### Krok 5: Implementacja groups service (jeśli nie istnieje)
```typescript
// src/lib/services/groups.service.ts

export class GroupsService {
  /**
   * Pobiera grupę po ID
   */
  async getGroupById(
    supabase: SupabaseClient,
    groupId: number
  ): Promise<GroupDTO | null> {
    // Implementacja
  }

  /**
   * Pobiera uczestników grupy
   */
  async getParticipants(
    supabase: SupabaseClient,
    groupId: number
  ): Promise<ParticipantDTO[]> {
    // Implementacja
  }

  /**
   * Pobiera reguły wykluczeń dla grupy
   */
  async getExclusions(
    supabase: SupabaseClient,
    groupId: number
  ): Promise<ExclusionRuleDTO[]> {
    // Implementacja
  }
}
```

### Krok 6: Implementacja głównego endpoint handler
```typescript
// src/pages/api/groups/[groupId]/draw.ts

export const prerender = false;

import type { APIContext } from 'astro';
import { z } from 'zod';
import { DrawService } from '@/lib/services/draw.service';
import { AssignmentsService } from '@/lib/services/assignments.service';
import { GroupsService } from '@/lib/services/groups.service';
import type { DrawResultDTO, ApiErrorResponse } from '@/types';

const paramsSchema = z.object({
  groupId: z.coerce.number().int().positive()
});

export async function POST(context: APIContext): Promise<Response> {
  // [1] Walidacja i autoryzacja
  // [2] Sprawdzenie grupy i uprawnień
  // [3] Pre-draw validation
  // [4] Wykonanie algorytmu
  // [5] Zapisanie wyników
  // [6] Zwrócenie odpowiedzi
}
```

### Krok 7: Implementacja szczegółowa endpoint handler

**Sekcja 1: Walidacja parametrów i autoryzacja**
```typescript
export async function POST(context: APIContext): Promise<Response> {
  try {
    // Parse and validate params
    const { groupId } = paramsSchema.parse(context.params);

    // Check authentication
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        } satisfies ApiErrorResponse),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = context.locals.supabase;
    const groupsService = new GroupsService();
    const assignmentsService = new AssignmentsService();
    const drawService = new DrawService();
```

**Sekcja 2: Sprawdzenie grupy i autoryzacja**
```typescript
    // Fetch group
    const group = await groupsService.getGroupById(supabase, groupId);
    if (!group) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'GROUP_NOT_FOUND',
            message: 'Group not found',
            details: { group_id: groupId }
          }
        } satisfies ApiErrorResponse),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership
    if (group.creator_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: 'Only the group creator can execute the draw'
          }
        } satisfies ApiErrorResponse),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
```

**Sekcja 3: Pre-draw validation**
```typescript
    // Check if draw already executed
    const hasDrawn = await assignmentsService.hasDrawBeenExecuted(supabase, groupId);
    if (hasDrawn) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'DRAW_ALREADY_COMPLETED',
            message: 'Draw has already been completed for this group'
          }
        } satisfies ApiErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch participants
    const participants = await groupsService.getParticipants(supabase, groupId);
    if (participants.length < 3) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INSUFFICIENT_PARTICIPANTS',
            message: 'At least 3 participants are required to execute a draw',
            details: {
              current_count: participants.length,
              required_minimum: 3
            }
          }
        } satisfies ApiErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch exclusion rules
    const exclusions = await groupsService.getExclusions(supabase, groupId);
```

**Sekcja 4: Wykonanie algorytmu**
```typescript
    // Validate if draw is possible
    if (!drawService.isDrawPossible(participants, exclusions)) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'IMPOSSIBLE_DRAW',
            message: 'Draw is impossible with current exclusion rules',
            details: {
              suggestion: 'Review and remove some exclusion rules'
            }
          }
        } satisfies ApiErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Execute draw algorithm
    const assignments = drawService.executeDrawAlgorithm(participants, exclusions);
    if (!assignments) {
      console.error('Draw algorithm failed', { groupId, participantsCount: participants.length });
      return new Response(
        JSON.stringify({
          error: {
            code: 'DRAW_EXECUTION_ERROR',
            message: 'Failed to execute draw algorithm'
          }
        } satisfies ApiErrorResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
```

**Sekcja 5: Zapisanie wyników**
```typescript
    // Save assignments in transaction
    await assignmentsService.createBatch(supabase, groupId, assignments);

    // Prepare response
    const response: DrawResultDTO = {
      success: true,
      message: 'Draw completed successfully',
      group_id: groupId,
      drawn_at: new Date().toISOString(),
      participants_notified: participants.length
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
```

**Sekcja 6: Error handling**
```typescript
  } catch (error) {
    // Zod validation error
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid group ID format',
            details: error.errors
          }
        } satisfies ApiErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Unexpected errors
    console.error('Unexpected error in draw endpoint:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      } satisfies ApiErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

### Krok 8: Implementacja database migration (opcjonalnie)
```sql
-- migrations/add_assignments_constraints.sql

-- Unique constraint to prevent duplicate draws
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_giver_unique
ON assignments(group_id, giver_participant_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_assignments_group_id
ON assignments(group_id);

-- Ensure giver != receiver
ALTER TABLE assignments
ADD CONSTRAINT check_giver_not_receiver
CHECK (giver_participant_id != receiver_participant_id);
```

<!-- ### Krok 9: Testy jednostkowe dla algorytmu
```typescript
// src/lib/services/draw.service.test.ts

describe('DrawService', () => {
  describe('isDrawPossible', () => {
    test('returns true for valid configuration', () => {
      // Test case
    });

    test('returns false when participant has no valid receivers', () => {
      // Test case
    });
  });

  describe('executeDrawAlgorithm', () => {
    test('finds valid assignment for simple case', () => {
      // Test: 3 participants, no exclusions
    });

    test('respects exclusion rules', () => {
      // Test: with exclusions
    });

    test('handles impossible configuration', () => {
      // Test: returns null
    });

    test('nobody draws themselves', () => {
      // Test: validate no self-assignments
    });
  });
});
``` -->
<!-- 
### Krok 10: Testy integracyjne endpoint
```typescript
// tests/api/groups/draw.test.ts

describe('POST /api/groups/:groupId/draw', () => {
  test('successfully executes draw', async () => {
    // Setup: create group with 3+ participants
    // Execute: POST request
    // Assert: 200 response, valid DrawResultDTO
    // Verify: assignments created in database
  });

  test('returns 401 when not authenticated', async () => {
    // Test unauthorized
  });

  test('returns 403 when not group creator', async () => {
    // Test forbidden
  });

  test('returns 400 when not enough participants', async () => {
    // Test insufficient participants
  });

  test('returns 400 when draw already executed', async () => {
    // Test duplicate draw prevention
  });

  test('handles impossible draw scenario', async () => {
    // Test with impossible exclusion rules
  });
}); -->
```

### Krok 11: Dokumentacja API
- Dodać endpoint do dokumentacji API
- Dodać przykłady użycia
- Dodać informacje o limitach i constraints

<!-- ### Krok 12: Testing i Deployment
1. **Testy lokalne**: Uruchomić wszystkie testy jednostkowe i integracyjne
2. **Testy manualne**: Przetestować różne scenariusze przez Postman/curl
3. **Code review**: Przegląd kodu przez zespół
4. **Deployment**: Deploy do środowiska staging
5. **Testing staging**: Testy end-to-end na staging
6. **Production deployment**: Deploy do production
7. **Monitoring**: Monitorowanie logów i błędów -->

### Krok 13: Monitoring i Observability
- Dodać logi dla kluczowych operacji
- Monitorować czas wykonania algorytmu
- Tracking success/failure rate
- Alerting dla błędów 500

---

## Podsumowanie

Ten endpoint jest jednym z najbardziej krytycznych w aplikacji Secret Santa, ponieważ:
1. Wykonuje nieodwracalną operację
2. Wymaga skomplikowanego algorytmu
3. Musi być bezpieczny i niezawodny
4. Musi obsługiwać edge cases

Kluczowe punkty implementacji:
- ✅ Solidna walidacja na wszystkich poziomach
- ✅ Algorytm backtracking z walidacją
- ✅ Transaction safety dla zapisywania wyników
- ✅ Comprehensive error handling
- ✅ Testy jednostkowe i integracyjne
- ✅ Bezpieczeństwo i autoryzacja
