# API Endpoint Implementation Plan: GET /api/groups

## 1. Przegląd endpointu

Ten endpoint umożliwia uwierzytelnionym użytkownikom pobieranie listy grup Secret Santa, w których uczestniczą lub które utworzyli. Endpoint wspiera filtrowanie (grupy utworzone, grupy do których dołączono, wszystkie grupy) oraz paginację dla efektywnej obsługi dużej liczby grup.

**Kluczowe funkcjonalności**:

- Pobieranie listy grup z informacjami podstawowymi i dodatkowymi polami agregowanymi
- Filtrowanie według relacji użytkownika z grupą (twórca/uczestnik/wszystkie)
- Paginacja z metadanymi (total, total_pages, current page)
- Obliczanie liczby uczestników dla każdej grupy
- Określanie statusu losowania (is_drawn)
- Identyfikacja czy użytkownik jest twórcą grupy (is_creator)

---

## 2. Szczegóły żądania

### Metoda HTTP

`GET`

### Struktura URL

```
/api/groups
```

### Nagłówki (Headers)

**Wymagane**:

- `Authorization: Bearer {access_token}` - Token autoryzacyjny z Supabase Auth

### Parametry

**Parametry URL**: Brak

**Parametry Query** (wszystkie opcjonalne):

```typescript
{
  filter?: "created" | "joined" | "all";  // Domyślnie: "all"
  page?: number;                           // Domyślnie: 1
  limit?: number;                          // Domyślnie: 20, max: 100
}
```

**Szczegóły parametrów**:

- `filter`:
  - `created` - tylko grupy utworzone przez użytkownika (creator_id = userId)
  - `joined` - tylko grupy, do których użytkownik został dodany jako uczestnik
  - `all` - wszystkie grupy (utworzone + dołączone)
- `page`: Numer strony (liczba całkowita >= 1)
- `limit`: Liczba elementów na stronę (1-100)

**Przykład żądania**:

```bash
GET /api/groups?filter=created&page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Wykorzystywane typy

### Query Parameters

```typescript
// Zdefiniowane w src/types.ts
GroupsListQuery {
  filter?: "created" | "joined" | "all";
  page?: number;
  limit?: number;
}
```

### DTOs (Response)

```typescript
// Zdefiniowane w src/types.ts
GroupListItemDTO extends GroupDTO {
  id: number;
  name: string;
  budget: number;
  end_date: string;
  creator_id: string;
  is_drawn: boolean;
  created_at: string;
  updated_at: string;
  participants_count: number;  // Agregowane pole
  is_creator: boolean;         // Obliczone pole
}

PaginatedGroupsDTO = PaginatedResponse<GroupListItemDTO> {
  data: GroupListItemDTO[];
  pagination?: PaginationMetadata;
}

PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
```

### Error Response

```typescript
// Zdefiniowane w src/types.ts
ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### Validation Schema (Zod)

```typescript
// Do utworzenia w src/pages/api/groups/index.ts
const GroupsListQuerySchema = z.object({
  filter: z.enum(["created", "joined", "all"]).optional().default("all"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK)

**Przykład 1: Lista z wieloma grupami**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Family Christmas 2025",
      "budget": 150,
      "end_date": "2025-12-25T23:59:59Z",
      "creator_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "is_drawn": false,
      "created_at": "2025-10-09T10:00:00Z",
      "updated_at": "2025-10-09T10:00:00Z",
      "participants_count": 5,
      "is_creator": true
    },
    {
      "id": 2,
      "name": "Office Secret Santa",
      "budget": 50,
      "end_date": "2025-12-20T18:00:00Z",
      "creator_id": "b2c3d4e5-f6g7-8901-bcde-fg2345678901",
      "is_drawn": true,
      "created_at": "2025-10-08T14:30:00Z",
      "updated_at": "2025-10-10T09:15:00Z",
      "participants_count": 12,
      "is_creator": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "total_pages": 1
  }
}
```

**Przykład 2: Pusta lista (użytkownik nie ma żadnych grup)**

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "total_pages": 0
  }
}
```

**Przykład 3: Druga strona wyników**

```json
{
  "data": [
    // ... 20 elementów ...
  ],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

### Odpowiedzi błędów

#### 401 Unauthorized - Brak autoryzacji

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authorization required"
  }
}
```

#### 401 Unauthorized - Nieprawidłowy token

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired authentication token"
  }
}
```

#### 400 Bad Request - Nieprawidłowy parametr filter

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid filter value. Must be one of: created, joined, all",
    "details": {
      "field": "filter",
      "value": "invalid"
    }
  }
}
```

#### 400 Bad Request - Nieprawidłowy parametr page

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Page must be a positive integer",
    "details": {
      "field": "page",
      "value": 0
    }
  }
}
```

#### 400 Bad Request - Limit poza zakresem

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Limit must be between 1 and 100",
    "details": {
      "field": "limit",
      "value": 150
    }
  }
}
```

#### 500 Internal Server Error - Błąd serwera

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to fetch groups. Please try again later."
  }
}
```

---

## 5. Przepływ danych

### Diagram przepływu

```
1. Klient wysyła żądanie GET /api/groups?filter=all&page=1&limit=20
   ↓
2. Middleware sprawdza autentykację (src/middleware/index.ts)
   ↓
3. Endpoint handler (src/pages/api/groups/index.ts)
   ├─ Walidacja query parameters (Zod schema)
   ├─ Wyodrębnienie userId z context.locals.supabase
   └─ Wywołanie GroupService.listGroups()
       ↓
4. GroupService.listGroups() (src/lib/services/group.service.ts)
   ├─ Budowanie zapytania bazodanowego z filtrem
   ├─ Obliczenie OFFSET na podstawie page i limit
   ├─ Wykonanie zapytania COUNT dla total
   ├─ Wykonanie zapytania SELECT z JOIN do participants
   ├─ Dla każdej grupy:
   │  ├─ Obliczenie participants_count (agregacja)
   │  ├─ Sprawdzenie is_drawn (zapytanie do assignments)
   │  └─ Określenie is_creator (porównanie creator_id)
   ├─ Obliczenie total_pages = CEIL(total / limit)
   └─ Zwrócenie PaginatedGroupsDTO
       ↓
5. Endpoint zwraca odpowiedź 200 z paginowaną listą grup
```

### Szczegóły interakcji z bazą danych

#### Scenariusz 1: filter = "all" (domyślny)

**Krok 1: Pobranie ID grup z COUNT uczestników**

```sql
-- Pobierz grupy, w których użytkownik jest twórcą LUB uczestnikiem
WITH user_groups AS (
  SELECT DISTINCT g.id
  FROM groups g
  LEFT JOIN participants p ON g.id = p.group_id
  WHERE g.creator_id = $1 OR p.user_id = $1
)
SELECT
  g.*,
  COUNT(p.id) as participants_count,
  (g.creator_id = $1) as is_creator
FROM groups g
INNER JOIN user_groups ug ON g.id = ug.id
LEFT JOIN participants p ON g.id = p.group_id
GROUP BY g.id
ORDER BY g.created_at DESC
LIMIT $2 OFFSET $3;

-- Parametry:
-- $1 = userId
-- $2 = limit
-- $3 = offset (calculated as (page - 1) * limit)
```

**Krok 2: Pobranie total count**

```sql
SELECT COUNT(DISTINCT g.id) as total
FROM groups g
LEFT JOIN participants p ON g.id = p.group_id
WHERE g.creator_id = $1 OR p.user_id = $1;

-- Parametry:
-- $1 = userId
```

**Krok 3: Sprawdzenie is_drawn dla każdej grupy**

```sql
-- Wykonywane dla każdej grupy z wyniku
SELECT EXISTS (
  SELECT 1 FROM assignments WHERE group_id = $1
) as is_drawn;

-- Parametry:
-- $1 = groupId
```

**Optymalizacja**: Zamiast N zapytań dla is_drawn, można użyć jednego zapytania:

```sql
SELECT DISTINCT group_id
FROM assignments
WHERE group_id IN ($1, $2, $3, ...);

-- A następnie w kodzie sprawdzić czy group_id jest w wynikach
```

#### Scenariusz 2: filter = "created"

**Zapytanie uproszczone - tylko grupy z creator_id = userId**

```sql
SELECT
  g.*,
  COUNT(p.id) as participants_count,
  true as is_creator  -- zawsze true dla tego filtra
FROM groups g
LEFT JOIN participants p ON g.id = p.group_id
WHERE g.creator_id = $1
GROUP BY g.id
ORDER BY g.created_at DESC
LIMIT $2 OFFSET $3;
```

**Count query**:

```sql
SELECT COUNT(*) as total
FROM groups
WHERE creator_id = $1;
```

#### Scenariusz 3: filter = "joined"

**Zapytanie - tylko grupy gdzie użytkownik jest uczestnikiem, ale nie twórcą**

```sql
SELECT
  g.*,
  COUNT(p.id) as participants_count,
  (g.creator_id = $1) as is_creator
FROM groups g
INNER JOIN participants joined ON g.id = joined.group_id AND joined.user_id = $1
LEFT JOIN participants p ON g.id = p.group_id
WHERE g.creator_id != $1  -- wykluczamy grupy gdzie user jest twórcą
GROUP BY g.id
ORDER BY g.created_at DESC
LIMIT $2 OFFSET $3;
```

**Count query**:

```sql
SELECT COUNT(DISTINCT g.id) as total
FROM groups g
INNER JOIN participants p ON g.id = p.group_id
WHERE p.user_id = $1 AND g.creator_id != $1;
```

---

## 6. Względy bezpieczeństwa

### Uwierzytelnianie (Authentication)

- **Mechanizm**: Bearer token w nagłówku Authorization
- **Walidacja**:
  - Sprawdzenie obecności nagłówka Authorization przez middleware
  - Weryfikacja tokenu przez Supabase Auth (`context.locals.supabase.auth.getUser()`)
  - Odrzucenie żądania z kodem 401, jeśli token jest nieprawidłowy lub wygasł

### Autoryzacja (Authorization)

- **Zakres danych**: Użytkownik widzi TYLKO grupy, w których:
  - Jest twórcą (creator_id = userId), LUB
  - Jest uczestnikiem (istnieje rekord w participants z user_id = userId)
- **Izolacja danych**: Zapytania bazodanowe ZAWSZE zawierają filtr na userId
- **Brak ujawniania informacji**: Użytkownik nie może wylistować grup innych użytkowników

### Walidacja danych wejściowych

1. **Query Parameters**:
   - `filter`: Musi być jedną z wartości enum: "created", "joined", "all"
   - `page`: Liczba całkowita >= 1
   - `limit`: Liczba całkowita w zakresie 1-100

2. **Sanityzacja**:
   - Parametry numeryczne są konwertowane przez Zod (`z.coerce.number()`)
   - Wartości spoza zakresu są odrzucane z błędem 400

3. **Domyślne wartości**:
   - filter: "all"
   - page: 1
   - limit: 20

### Zabezpieczenia bazy danych

- **Parametryzowane zapytania**: Supabase Client automatycznie parametryzuje zapytania
- **Row Level Security (RLS)**: Może być włączone na poziomie bazy danych (opcjonalnie)
- **DISTINCT w zapytaniach**: Zapobiega duplikatom przy JOIN z participants

### Potencjalne zagrożenia i mitygacje

| Zagrożenie                   | Opis                                      | Mitygacja                                            |
| ---------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| SQL Injection                | Wstrzyknięcie złośliwego SQL              | Użycie Supabase Client (automatyczna parametryzacja) |
| Enumeracja grup              | Próba dostępu do grup innych użytkowników | Filtrowanie po userId w zapytaniach                  |
| DOS - duże limity            | Żądanie limit=1000000                     | Walidacja max limit = 100                            |
| DOS - głębokie stronicowanie | Żądanie page=999999                       | Opcjonalnie: limit max page lub cursor pagination    |
| Wyciek danych uczestników    | Nadmierne informacje w odpowiedzi         | Zwracanie tylko podstawowych pól GroupListItemDTO    |

---

## 7. Obsługa błędów

### Strategia obsługi błędów

**Zasada**: Handle errors at the beginning of functions, use early returns

### Szczegółowa tabela błędów

| Nr  | Scenariusz                        | Warunek                                        | Status | Kod błędu       | Wiadomość                               | Akcja                            |
| --- | --------------------------------- | ---------------------------------------------- | ------ | --------------- | --------------------------------------- | -------------------------------- |
| 1   | Brak nagłówka Authorization       | `!request.headers.get('authorization')`        | 401    | UNAUTHORIZED    | Authorization required                  | Zwróć błąd, przerwij wykonanie   |
| 2   | Token wygasł/nieprawidłowy        | `getUser()` zwraca błąd                        | 401    | INVALID_TOKEN   | Invalid or expired authentication token | Zwróć błąd, przerwij wykonanie   |
| 3   | Nieprawidłowy format query params | Parsing query fails                            | 400    | INVALID_REQUEST | Invalid query parameters                | Zwróć błąd z details             |
| 4   | Filter nie jest enum              | `!["created","joined","all"].includes(filter)` | 400    | INVALID_INPUT   | Invalid filter value                    | Zwróć błąd z details             |
| 5   | Page < 1                          | `page < 1`                                     | 400    | INVALID_INPUT   | Page must be a positive integer         | Zwróć błąd z details             |
| 6   | Page nie jest liczbą              | `isNaN(page)`                                  | 400    | INVALID_INPUT   | Page must be a number                   | Zwróć błąd z details             |
| 7   | Limit < 1                         | `limit < 1`                                    | 400    | INVALID_INPUT   | Limit must be at least 1                | Zwróć błąd z details             |
| 8   | Limit > 100                       | `limit > 100`                                  | 400    | INVALID_INPUT   | Limit must be between 1 and 100         | Zwróć błąd z details             |
| 9   | Limit nie jest liczbą             | `isNaN(limit)`                                 | 400    | INVALID_INPUT   | Limit must be a number                  | Zwróć błąd z details             |
| 10  | Błąd połączenia z bazą            | Supabase connection error                      | 500    | DATABASE_ERROR  | Database connection failed              | Log błąd, zwróć ogólny komunikat |
| 11  | Błąd zapytania SELECT             | SELECT fails                                   | 500    | DATABASE_ERROR  | Failed to fetch groups                  | Log błąd, zwróć komunikat        |
| 12  | Błąd zapytania COUNT              | COUNT fails                                    | 500    | DATABASE_ERROR  | Failed to calculate total               | Log błąd, zwróć komunikat        |
| 13  | Timeout zapytania                 | Query timeout                                  | 500    | DATABASE_ERROR  | Request timeout                         | Log błąd, zwróć komunikat        |

### Przykład implementacji obsługi błędów

```typescript
// Guard clauses na początku funkcji
export const GET: APIRoute = async ({ request, locals }) => {
  // Guard 1: Sprawdź autentykację
  const {
    data: { user },
    error: authError,
  } = await locals.supabase.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Authorization required",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Guard 2: Walidacja query parameters
  const url = new URL(request.url);
  const queryParams = {
    filter: url.searchParams.get("filter"),
    page: url.searchParams.get("page"),
    limit: url.searchParams.get("limit"),
  };

  let validated: GroupsListQuery;
  try {
    validated = GroupsListQuerySchema.parse(queryParams);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_INPUT",
            message: firstError.message,
            details: {
              field: firstError.path.join("."),
              value: queryParams[firstError.path[0]],
            },
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Happy path - wywołanie serwisu
  try {
    const groupService = new GroupService(locals.supabase);
    const result = await groupService.listGroups(user.id, validated);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[GET /api/groups] Error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to fetch groups. Please try again later.",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

### Logowanie błędów

**Gdzie logować**:

- Błędy 4xx (400, 401): Log tylko w trybie debug (opcjonalnie)
- Błędy 5xx (500): ZAWSZE logować z pełnym stack trace

**Co logować**:

- Timestamp
- User ID
- Query parameters (dla debugowania)
- Typ błędu
- Stack trace (dla błędów 500)

**Przykład**:

```typescript
console.error("[GROUP_LIST_ERROR]", {
  timestamp: new Date().toISOString(),
  userId: user?.id,
  queryParams: validated,
  error: error.message,
  stack: error.stack,
});
```

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **JOIN z participants dla COUNT**
   - **Problem**: Dla każdej grupy wykonujemy agregację COUNT(participants)
   - **Wpływ**: O(n \* m) gdzie n = liczba grup, m = avg liczba uczestników
   - **Mitygacja**: Użycie LEFT JOIN z GROUP BY (jedno zapytanie dla wszystkich grup)

2. **Sprawdzanie is_drawn dla każdej grupy**
   - **Problem**: N+1 query problem - jedno zapytanie dla każdej grupy
   - **Wpływ**: Jeśli zwracamy 20 grup, to 20 dodatkowych zapytań
   - **Mitygacja**: Jedno zapytanie z WHERE group_id IN (...) dla wszystkich grup

3. **COUNT query dla pagination**
   - **Problem**: COUNT(\*) na dużych tabelach może być wolny
   - **Wpływ**: Dodatkowe ~50-100ms dla każdego żądania
   - **Mitygacja**: Cache wyniku COUNT na krótki czas (np. 30 sekund)

4. **Brak indeksów**
   - **Problem**: Pełne skanowanie tabel przy JOIN
   - **Wpływ**: Czas zapytania rośnie liniowo z liczbą rekordów
   - **Mitygacja**: Dodanie odpowiednich indeksów (szczegóły poniżej)

### Strategie optymalizacji

#### Optymalizacja 1: Pojedyncze zapytanie dla listy grup z COUNT

```typescript
// Zamiast:
// 1. SELECT groups WHERE ...
// 2. Dla każdej grupy: SELECT COUNT(*) FROM participants
// 3. Dla każdej grupy: SELECT EXISTS FROM assignments

// Użyj jednego zapytania z agregacją:
const query = supabase
  .from("groups")
  .select(
    `
    *,
    participants:participants(count),
    assignments:assignments(id)
  `
  )
  .or(`creator_id.eq.${userId},participants.user_id.eq.${userId}`)
  .range((page - 1) * limit, page * limit - 1);
```

**Uwaga**: Supabase może nie wspierać tej składni. W takim przypadku użyj raw SQL przez `.rpc()`.

#### Optymalizacja 2: Bulk check is_drawn

```typescript
// Po pobraniu listy grup:
const groupIds = groups.map((g) => g.id);

// Jedno zapytanie dla wszystkich grup
const { data: drawnGroups } = await supabase.from("assignments").select("group_id").in("group_id", groupIds);

// Utworzenie Set dla O(1) lookup
const drawnGroupIds = new Set(drawnGroups?.map((a) => a.group_id) || []);

// Mapowanie is_drawn
const groupsWithIsDrawn = groups.map((group) => ({
  ...group,
  is_drawn: drawnGroupIds.has(group.id),
}));
```

#### Optymalizacja 3: Cache COUNT z cache headers

```typescript
// W odpowiedzi dodaj cache headers
return new Response(JSON.stringify(result), {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "private, max-age=30", // Cache na 30 sekund
  },
});
```

#### Optymalizacja 4: Cursor-based pagination (zaawansowane)

```typescript
// Zamiast offset-based (LIMIT OFFSET):
// SELECT * FROM groups ORDER BY id LIMIT 20 OFFSET 200
// (wolne dla dużych offsetów)

// Użyj cursor-based:
// SELECT * FROM groups WHERE id > $lastId ORDER BY id LIMIT 20
// (szybkie niezależnie od głębokości)

// Wymaga zmiany API: zamiast ?page=11, użyj ?cursor=220
```

### Metryki do monitorowania

| Metryka                       | Cel     | Działanie przy przekroczeniu            |
| ----------------------------- | ------- | --------------------------------------- |
| Czas odpowiedzi (p95)         | < 300ms | Optymalizacja zapytań, dodanie indeksów |
| Czas odpowiedzi (p99)         | < 500ms | Analiza slow queries, cache             |
| Liczba zapytań DB per request | <= 3    | Redukcja N+1 queries                    |
| Cache hit rate                | > 30%   | Zwiększenie TTL cache                   |
| Błędy 500                     | < 0.1%  | Analiza logów, naprawa błędów           |

### Indeksy bazodanowe wymagane dla wydajności

```sql
-- Już istniejące (zgodnie z db-plan.md):
CREATE INDEX idx_groups_creator_id ON groups(creator_id);
CREATE INDEX idx_participants_group_id ON participants(group_id);

-- Dodatkowe indeksy dla tego endpointu:

-- Index dla sortowania grup po dacie utworzenia
CREATE INDEX IF NOT EXISTS idx_groups_created_at_desc
ON groups(created_at DESC);

-- Composite index dla filtrowania uczestników po group_id i user_id
CREATE INDEX IF NOT EXISTS idx_participants_group_user
ON participants(group_id, user_id);

-- Index dla szybkiego sprawdzania is_drawn
CREATE INDEX IF NOT EXISTS idx_assignments_group_id
ON assignments(group_id);

-- Opcjonalnie: Index dla cursor-based pagination
CREATE INDEX IF NOT EXISTS idx_groups_id_created_at
ON groups(id, created_at DESC);
```

**Weryfikacja wydajności indeksów**:

```sql
-- Sprawdź czy indeksy są używane
EXPLAIN ANALYZE
SELECT g.*, COUNT(p.id) as participants_count
FROM groups g
LEFT JOIN participants p ON g.id = p.group_id
WHERE g.creator_id = 'some-uuid'
GROUP BY g.id
ORDER BY g.created_at DESC
LIMIT 20;

-- Oczekiwane: "Index Scan using idx_groups_creator_id"
```

---

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie GroupService o metodę listGroups

**1.1. Dodaj metodę do GroupService (`src/lib/services/group.service.ts`)**

```typescript
/**
 * Lists all groups user created or participates in
 *
 * @param userId - The ID of the user requesting groups
 * @param query - Query parameters (filter, page, limit)
 * @returns Paginated list of groups with metadata
 * @throws {Error} If database operation fails
 */
async listGroups(
  userId: UserId,
  query: GroupsListQuery
): Promise<PaginatedGroupsDTO> {
  // Guard: Check if userId exists
  if (!userId) {
    throw new Error("User ID is required");
  }

  // Extract query parameters with defaults
  const filter = query.filter || "all";
  const page = query.page || 1;
  const limit = query.limit || 20;
  const offset = (page - 1) * limit;

  console.log("[GroupService.listGroups] Fetching groups", {
    userId,
    filter,
    page,
    limit,
    offset
  });

  try {
    // Step 1: Build base query based on filter
    let groupsQuery = this.supabase
      .from("groups")
      .select("*");

    let countQuery = this.supabase
      .from("groups")
      .select("id", { count: "exact", head: true });

    switch (filter) {
      case "created":
        // Only groups where user is creator
        groupsQuery = groupsQuery.eq("creator_id", userId);
        countQuery = countQuery.eq("creator_id", userId);
        break;

      case "joined":
        // Only groups where user is participant but not creator
        // This requires a subquery - we'll handle it differently
        const { data: joinedGroupIds } = await this.supabase
          .from("participants")
          .select("group_id")
          .eq("user_id", userId);

        if (!joinedGroupIds || joinedGroupIds.length === 0) {
          // User has no joined groups
          return {
            data: [],
            pagination: {
              page,
              limit,
              total: 0,
              total_pages: 0
            }
          };
        }

        const groupIds = joinedGroupIds.map(p => p.group_id);
        groupsQuery = groupsQuery
          .in("id", groupIds)
          .neq("creator_id", userId);
        countQuery = countQuery
          .in("id", groupIds)
          .neq("creator_id", userId);
        break;

      case "all":
      default:
        // Groups where user is creator OR participant
        const { data: allParticipations } = await this.supabase
          .from("participants")
          .select("group_id")
          .eq("user_id", userId);

        const participantGroupIds = allParticipations?.map(p => p.group_id) || [];

        // Get groups where creator_id = userId OR id IN (participantGroupIds)
        if (participantGroupIds.length === 0) {
          // User only has created groups (or none)
          groupsQuery = groupsQuery.eq("creator_id", userId);
          countQuery = countQuery.eq("creator_id", userId);
        } else {
          // User has both created and joined groups
          groupsQuery = groupsQuery.or(
            `creator_id.eq.${userId},id.in.(${participantGroupIds.join(",")})`
          );
          countQuery = countQuery.or(
            `creator_id.eq.${userId},id.in.(${participantGroupIds.join(",")})`
          );
        }
        break;
    }

    // Step 2: Execute count query
    const { count: total, error: countError } = await countQuery;

    if (countError) {
      console.error("[GroupService.listGroups] Count query failed:", countError);
      throw new Error("Failed to count groups");
    }

    const totalCount = total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    console.log("[GroupService.listGroups] Total groups:", totalCount);

    // Guard: If no groups, return empty result
    if (totalCount === 0) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          total_pages: 0
        }
      };
    }

    // Step 3: Execute main query with pagination
    const { data: groups, error: groupsError } = await groupsQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (groupsError || !groups) {
      console.error("[GroupService.listGroups] Groups query failed:", groupsError);
      throw new Error("Failed to fetch groups");
    }

    console.log("[GroupService.listGroups] Fetched groups:", groups.length);

    // Step 4: Enrich groups with additional fields
    const groupIds = groups.map(g => g.id);

    // 4a. Get participants count for all groups
    const { data: participantCounts } = await this.supabase
      .from("participants")
      .select("group_id")
      .in("group_id", groupIds);

    const countsByGroup = (participantCounts || []).reduce((acc, p) => {
      acc[p.group_id] = (acc[p.group_id] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // 4b. Check is_drawn for all groups
    const { data: drawnGroupsData } = await this.supabase
      .from("assignments")
      .select("group_id")
      .in("group_id", groupIds);

    const drawnGroupIds = new Set(drawnGroupsData?.map(a => a.group_id) || []);

    // Step 5: Map to GroupListItemDTO
    const groupListItems: GroupListItemDTO[] = groups.map(group => ({
      ...group,
      is_drawn: drawnGroupIds.has(group.id),
      participants_count: countsByGroup[group.id] || 0,
      is_creator: group.creator_id === userId
    }));

    console.log("[GroupService.listGroups] Returning", {
      groupsCount: groupListItems.length,
      page,
      totalPages
    });

    // Step 6: Return paginated response
    return {
      data: groupListItems,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: totalPages
      }
    };
  } catch (error) {
    console.error("[GroupService.listGroups] Error:", error);
    throw error;
  }
}
```

**1.2. Dodaj import GroupsListQuery w GroupService**

```typescript
import type {
  // ... existing imports
  GroupsListQuery,
  PaginatedGroupsDTO,
} from "../../types";
```

### Krok 2: Utworzenie GET handler w endpoint (`src/pages/api/groups/index.ts`)

**2.1. Dodaj importy i Zod schema**

```typescript
// W pliku src/pages/api/groups/index.ts

import { z } from "zod";
import type { GroupsListQuery } from "../../../types";

// Definicja Zod schema dla query parameters
const GroupsListQuerySchema = z.object({
  filter: z.enum(["created", "joined", "all"]).optional().default("all"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must be between 1 and 100")
    .optional()
    .default(20),
});
```

**2.2. Implementacja GET handler**

```typescript
export const GET: APIRoute = async ({ request, locals }) => {
  // Guard 1: Check authentication
  const supabase = locals.supabase;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "UNAUTHORIZED",
        message: "Authorization required",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Guard 2: Parse and validate query parameters
  const url = new URL(request.url);
  const queryParams = {
    filter: url.searchParams.get("filter") || undefined,
    page: url.searchParams.get("page") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  };

  let validatedQuery: GroupsListQuery;
  try {
    validatedQuery = GroupsListQuerySchema.parse(queryParams);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_INPUT",
          message: firstError.message,
          details: {
            field: firstError.path.join("."),
            value: queryParams[firstError.path[0] as keyof typeof queryParams],
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Unknown validation error
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Query parameter validation failed",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Call service
  try {
    const groupService = new GroupService(supabase);
    const result = await groupService.listGroups(user.id, validatedQuery);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Optional: Add cache headers for performance
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (error) {
    console.error("[GET /api/groups] Error:", error);

    const errorResponse: ApiErrorResponse = {
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to fetch groups. Please try again later.",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Krok 3: Weryfikacja i dodanie indeksów bazodanowych

**3.1. Sprawdź czy wymagane indeksy istnieją**

```sql
-- Sprawdź istniejące indeksy
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('groups', 'participants', 'assignments')
ORDER BY tablename, indexname;
```

**3.2. Dodaj brakujące indeksy (jeśli nie istnieją)**

```sql
-- Index dla sortowania grup po dacie
CREATE INDEX IF NOT EXISTS idx_groups_created_at_desc
ON groups(created_at DESC);

-- Composite index dla participants
CREATE INDEX IF NOT EXISTS idx_participants_group_user
ON participants(group_id, user_id);

-- Index dla assignments (szybkie sprawdzanie is_drawn)
CREATE INDEX IF NOT EXISTS idx_assignments_group_id
ON assignments(group_id);
```

### Krok 4: Testy edge cases

**4.1. Test: Użytkownik bez żadnych grup**

- Oczekiwana odpowiedź: 200 z pustą tablicą data i total=0

**4.2. Test: Filtr "created" gdy użytkownik nie utworzył żadnych grup**

- Oczekiwana odpowiedź: 200 z pustą tablicą

**4.3. Test: Filtr "joined" gdy użytkownik jest tylko twórcą**

- Oczekiwana odpowiedź: 200 z pustą tablicą

**4.4. Test: Strona poza zakresem (page=999)**

- Oczekiwana odpowiedź: 200 z pustą tablicą data

**4.5. Test: Limit=1 (minimalna wartość)**

- Oczekiwana odpowiedź: 200 z 1 elementem

**4.6. Test: Limit=100 (maksymalna wartość)**

- Oczekiwana odpowiedź: 200 z maksymalnie 100 elementami

### Krok 5: Dokumentacja i komentarze

**5.1. Dodaj JSDoc do metody listGroups**

```typescript
/**
 * Lists all groups user created or participates in with pagination
 *
 * Supports three filter modes:
 * - "created": Only groups where user is the creator
 * - "joined": Only groups where user is a participant (but not creator)
 * - "all": All groups (created + joined)
 *
 * @param userId - The ID of the authenticated user
 * @param query - Query parameters for filtering and pagination
 * @returns Paginated list of groups with metadata
 * @throws {Error} If database operation fails
 *
 * @example
 * const result = await groupService.listGroups(userId, {
 *   filter: "all",
 *   page: 1,
 *   limit: 20
 * });
 * // Returns: { data: [...], pagination: { page: 1, limit: 20, total: 45, total_pages: 3 } }
 */
```

**5.2. Aktualizuj API documentation**

- Dodaj przykłady użycia endpointu
- Dokumentuj wszystkie query parametry
- Uwzględnij przykłady odpowiedzi dla różnych filtrów

### Krok 6: Code review checklist

Przed zatwierdzeniem implementacji, sprawdź:

- [ ] Endpoint wymaga autentykacji (401 dla brak tokenu)
- [ ] Wszystkie query parametry są walidowane (filter, page, limit)
- [ ] Domyślne wartości są poprawnie ustawione
- [ ] Limit jest ograniczony do maksymalnie 100
- [ ] Page jest liczbą całkowitą >= 1
- [ ] Filter akceptuje tylko "created", "joined", "all"
- [ ] Użytkownik widzi TYLKO swoje grupy (creator OR participant)
- [ ] `participants_count` jest poprawnie obliczany
- [ ] `is_creator` jest poprawnie obliczany
- [ ] `is_drawn` jest poprawnie sprawdzany
- [ ] Pagination metadata zawiera wszystkie pola (page, limit, total, total_pages)
- [ ] Pusta lista zwraca 200 (nie 404)
- [ ] Strona poza zakresem zwraca pustą tablicę (nie błąd)
- [ ] N+1 query problem jest rozwiązany (bulk queries)
- [ ] Błędy są logowane z odpowiednim poziomem
- [ ] Kod stosuje early returns dla błędów
- [ ] Używany jest `context.locals.supabase`
- [ ] Wszystkie typy są zaimportowane z `src/types.ts`
- [ ] Endpoint ma `export const prerender = false`
- [ ] Wymagane indeksy bazodanowe są utworzone
- [ ] Dokumentacja jest aktualna

---

## 10. Możliwe rozszerzenia (Future Enhancements)

### 10.1. Sortowanie

```typescript
// Dodanie parametru sort
interface GroupsListQuery {
  filter?: "created" | "joined" | "all";
  page?: number;
  limit?: number;
  sort?: "created_at" | "name" | "end_date" | "participants_count";
  order?: "asc" | "desc";
}

// Implementacja w query
.order(query.sort || "created_at", {
  ascending: query.order === "asc"
});
```

### 10.2. Wyszukiwanie po nazwie

```typescript
// Dodanie parametru search
interface GroupsListQuery {
  // ... existing fields
  search?: string;
}

// Implementacja w query
if (query.search) {
  groupsQuery = groupsQuery.ilike("name", `%${query.search}%`);
}
```

### 10.3. Filtrowanie po statusie (drawn/not drawn)

```typescript
// Dodanie parametru status
interface GroupsListQuery {
  // ... existing fields
  status?: "drawn" | "not_drawn" | "all";
}

// Implementacja wymaga podzapytania
```

### 10.4. Cursor-based pagination

```typescript
// Zamiast page/limit użyj cursor
interface GroupsListQuery {
  cursor?: string; // Base64 encoded (id + created_at)
  limit?: number;
}

// Query
.gt("created_at", decodedCursor.created_at)
.order("created_at", { ascending: false })
.limit(limit);
```

### 10.5. Include/Exclude participants w odpowiedzi

```typescript
// Dodanie parametru include
interface GroupsListQuery {
  // ... existing fields
  include?: "participants" | "none";
}

// Jeśli include=participants, zwróć także listę uczestników dla każdej grupy
```

### 10.6. Filtrowanie po dacie końcowej

```typescript
// Grupy kończące się w przyszłości vs przeszłości
interface GroupsListQuery {
  // ... existing fields
  date_filter?: "upcoming" | "past" | "all";
}

// Implementacja
if (query.date_filter === "upcoming") {
  groupsQuery = groupsQuery.gt("end_date", new Date().toISOString());
}
```

---

## Podsumowanie

Ten plan wdrożenia zapewnia kompletny przewodnik do stworzenia endpointu `GET /api/groups`. Kluczowe aspekty implementacji to:

1. **Bezpieczeństwo**: Pełna autoryzacja - użytkownik widzi tylko swoje grupy
2. **Wydajność**: Optymalizacja zapytań, bulk queries, odpowiednie indeksy
3. **Obsługa błędów**: Szczegółowa obsługa wszystkich scenariuszy błędów
4. **Paginacja**: Kompletne metadata z total count i total pages
5. **Filtrowanie**: Trzy tryby filtrowania (created/joined/all)
6. **Walidacja**: Kompleksowa walidacja query parameters z Zod
7. **Type Safety**: Pełne typowanie TypeScript
8. **Maintainability**: Logika biznesowa w serwisach

**Kluczowe różnice od POST endpoint**:

- GET używa query parameters zamiast request body
- Zwraca tablicę obiektów zamiast pojedynczego
- Wymaga obsługi paginacji i agregacji danych
- Bardziej skomplikowane zapytania DB (JOIN, GROUP BY, agregacje)

**Szacowany czas implementacji**: 3-5 godzin dla doświadczonego developera, włączając testy i optymalizację wydajności.
