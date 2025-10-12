# API Endpoint Implementation Plan: POST /api/groups

## 1. Przegląd enpointa

Ten endpoint umożliwia uwierzytelnionym użytkownikom tworzenie nowych grup Secret Santa. Gdy grupa zostanie utworzona, twórca jest automatycznie dodawany jako pierwszy uczestnik grupy. Endpoint zwraca kompletne informacje o utworzonej grupie, w tym liczbę uczestników (która wynosi 1 po utworzeniu).

**Kluczowe funkcjonalności**:
- Utworzenie nowej grupy Secret Santa z nazwą, budżetem i datą zakończenia
- Automatyczne dodanie twórcy jako uczestnika grupy
- Walidacja danych wejściowych (budżet > 0, prawidłowy format daty)
- Zwrócenie pełnych informacji o grupie wraz z licznikiem uczestników

---

## 2. Szczegóły żądania

### Metoda HTTP
`POST`

### Struktura URL
```
/api/groups
```

### Nagłówki (Headers)
**Wymagane**:
- `Authorization: Bearer {access_token}` - Token autoryzacyjny z Supabase Auth
- `Content-Type: application/json`

### Parametry

**Parametry URL**: Brak

**Parametry Query**: Brak

**Request Body** (wymagane wszystkie pola):
```typescript
{
  name: string;        // Nazwa grupy (min 1 znak, max 255 znaków)
  budget: number;      // Budżet grupy (musi być > 0)
  end_date: string;    // Data zakończenia w formacie ISO 8601
}
```

**Przykład żądania**:
```json
POST /api/groups
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Family Christmas 2025",
  "budget": 150,
  "end_date": "2025-12-25T23:59:59Z"
}
```

---

## 3. Wykorzystywane typy

### Command Models (Request)
```typescript
// Zdefiniowane w src/types.ts
CreateGroupCommand {
  name: string;
  budget: number;
  end_date: string;
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
  participants_count: number;  // Dodatkowe pole
  is_creator: boolean;         // Dodatkowe pole
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

### Database Types
```typescript
// Używane wewnętrznie
GroupInsert = TablesInsert<"groups">
ParticipantInsert = TablesInsert<"participants">
```

### Validation Schema (Zod)
```typescript
// Do utworzenia w src/pages/api/groups/index.ts
const CreateGroupSchema = z.object({
  name: z.string()
    .min(1, "Name cannot be empty")
    .max(255, "Name is too long")
    .trim(),
  budget: z.number()
    .positive("Budget must be greater than 0")
    .finite("Budget must be a valid number"),
  end_date: z.string()
    .datetime("Invalid date format. Use ISO 8601 format (e.g., 2025-12-25T23:59:59Z)")
});
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (201 Created)
```json
{
  "id": 1,
  "name": "Family Christmas 2025",
  "budget": 150,
  "end_date": "2025-12-25T23:59:59Z",
  "creator_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "is_drawn": false,
  "created_at": "2025-10-09T10:00:00Z",
  "updated_at": "2025-10-09T10:00:00Z",
  "participants_count": 1,
  "is_creator": true
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

#### 422 Unprocessable Entity - Brak wymaganych pól
```json
{
  "error": {
    "code": "MISSING_FIELD",
    "message": "Missing required field: name",
    "details": {
      "field": "name"
    }
  }
}
```

#### 400 Bad Request - Nieprawidłowe dane wejściowe
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Budget must be greater than 0",
    "details": {
      "field": "budget",
      "value": -50
    }
  }
}
```

#### 400 Bad Request - Nieprawidłowy format daty
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid date format. Use ISO 8601 format (e.g., 2025-12-25T23:59:59Z)",
    "details": {
      "field": "end_date",
      "value": "2025-12-25"
    }
  }
}
```

#### 500 Internal Server Error - Błąd serwera
```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to create group. Please try again later."
  }
}
```

---

## 5. Przepływ danych

### Diagram przepływu

```
1. Klient wysyła żądanie POST /api/groups
   ↓
2. Middleware sprawdza autentykację (src/middleware/index.ts)
   ↓
3. Endpoint handler (src/pages/api/groups/index.ts)
   ├─ Walidacja danych wejściowych (Zod schema)
   ├─ Wyodrębnienie userId z context.locals.supabase
   └─ Wywołanie GroupService.createGroup()
       ↓
4. GroupService.createGroup() (src/lib/services/group.service.ts)
   ├─ Rozpoczęcie transakcji bazy danych
   ├─ Wstawienie rekordu do tabeli "groups"
   ├─ Automatyczne dodanie twórcy do tabeli "participants"
   ├─ Pobranie liczby uczestników (COUNT)
   ├─ Zatwierdzenie transakcji
   └─ Zwrócenie GroupListItemDTO
       ↓
5. Endpoint zwraca odpowiedź 201 z danymi grupy
```

### Szczegóły interakcji z bazą danych

**Operacja 1: Wstawienie grupy**
```sql
INSERT INTO groups (name, budget, end_date, creator_id, created_at, updated_at)
VALUES ($1, $2, $3, $4, NOW(), NOW())
RETURNING *;
```

**Operacja 2: Dodanie twórcy jako uczestnika**
```sql
INSERT INTO participants (group_id, user_id, name, email, created_at)
SELECT $1, id, email, email, NOW()
FROM auth.users
WHERE id = $2
RETURNING *;
```

**Operacja 3: Pobranie liczby uczestników**
```sql
SELECT COUNT(*) FROM participants WHERE group_id = $1;
```

**Uwaga**: Wszystkie operacje powinny być wykonane w ramach jednej transakcji, aby zapewnić spójność danych.

---

## 6. Względy bezpieczeństwa

### Uwierzytelnianie (Authentication)
- **Mechanizm**: Bearer token w nagłówku Authorization
- **Walidacja**: 
  - Sprawdzenie obecności nagłówka Authorization
  - Weryfikacja tokenu przez Supabase Auth (`context.locals.supabase.auth.getUser()`)
  - Odrzucenie żądania z kodem 401, jeśli token jest nieprawidłowy lub wygasł

### Autoryzacja (Authorization)
- **Uprawnienia**: Każdy uwierzytelniony użytkownik może utworzyć grupę
- **Własność**: Twórca automatycznie staje się właścicielem grupy (`creator_id`)
- **Przyszłe operacje**: Tylko twórca będzie mógł modyfikować/usuwać grupę (sprawdzane w innych endpointach)

### Walidacja danych wejściowych
1. **Sanityzacja**:
   - Usunięcie białych znaków z początku i końca nazwy (`.trim()`)
   - Walidacja typu danych (string, number)

2. **Sprawdzenia biznesowe**:
   - Budget > 0 (wymuszane przez CHECK constraint w bazie danych)
   - Nazwa nie może być pusta (min 1 znak)
   - Format daty: ISO 8601 (walidacja przez Zod `.datetime()`)
   - Opcjonalnie: end_date w przyszłości (może być dodane później)

3. **Długość danych**:
   - Nazwa: max 255 znaków (zapobiega overflow)
   - Budget: wartość skończona (finite)

### Zabezpieczenia bazy danych
- **Parametryzowane zapytania**: Supabase Client automatycznie parametryzuje zapytania (ochrona przed SQL injection)
- **Row Level Security (RLS)**: Może być włączone na poziomie bazy danych
- **Transakcje**: Zapewnienie atomowości operacji (wszystkie sukces lub wszystkie rollback)

### Potencjalne zagrożenia i mitygacje

| Zagrożenie | Opis | Mitygacja |
|------------|------|-----------|
| SQL Injection | Wstrzyknięcie złośliwego SQL | Użycie Supabase Client (automatyczna parametryzacja) |
| DOS - masowe tworzenie grup | Użytkownik tworzy tysiące grup | Rate limiting (do rozważenia w przyszłości) |
| Nieprawidłowe daty | Data w przeszłości lub dalekiej przyszłości | Walidacja zakresu dat (opcjonalnie) |
| XSS w nazwie grupy | JavaScript w nazwie grupy | Sanityzacja na frontendzie + escaping przy renderowaniu |
| Przekroczenie limitu długości | Bardzo długie stringi | Walidacja max length (255 znaków) |

---

## 7. Obsługa błędów

### Strategia obsługi błędów

**Zasada**: Handle errors at the beginning of functions, use early returns

### Szczegółowa tabela błędów

| Nr | Scenariusz | Warunek | Status | Kod błędu | Wiadomość | Akcja |
|----|-----------|---------|--------|-----------|-----------|-------|
| 1 | Brak nagłówka Authorization | `!request.headers.get('authorization')` | 401 | UNAUTHORIZED | Authorization required | Zwróć błąd, przerwij wykonanie |
| 2 | Nieprawidłowy format tokenu | Token nie zaczyna się od "Bearer " | 401 | INVALID_TOKEN | Invalid authorization format | Zwróć błąd, przerwij wykonanie |
| 3 | Token wygasł/nieprawidłowy | `getUser()` zwraca błąd | 401 | INVALID_TOKEN | Invalid or expired authentication token | Zwróć błąd, przerwij wykonanie |
| 4 | Brak body w żądaniu | `!request.body` lub parsing fails | 422 | INVALID_REQUEST | Request body is required | Zwróć błąd, przerwij wykonanie |
| 5 | Brak pola 'name' | `!name` po parsingu | 422 | MISSING_FIELD | Missing required field: name | Zwróć błąd z details |
| 6 | Brak pola 'budget' | `budget === undefined` | 422 | MISSING_FIELD | Missing required field: budget | Zwróć błąd z details |
| 7 | Brak pola 'end_date' | `!end_date` | 422 | MISSING_FIELD | Missing required field: end_date | Zwróć błąd z details |
| 8 | Pusta nazwa | `name.trim().length === 0` | 400 | INVALID_INPUT | Name cannot be empty | Zwróć błąd z details |
| 9 | Nazwa zbyt długa | `name.length > 255` | 400 | INVALID_INPUT | Name is too long (max 255 characters) | Zwróć błąd z details |
| 10 | Budget <= 0 | `budget <= 0` | 400 | INVALID_INPUT | Budget must be greater than 0 | Zwróć błąd z details |
| 11 | Budget nie jest liczbą | `!isFinite(budget)` | 400 | INVALID_INPUT | Budget must be a valid number | Zwróć błąd z details |
| 12 | Nieprawidłowy format daty | Walidacja Zod `.datetime()` fails | 400 | INVALID_INPUT | Invalid date format. Use ISO 8601 | Zwróć błąd z details |
| 13 | Błąd połączenia z bazą | Supabase connection error | 500 | DATABASE_ERROR | Database connection failed | Log błąd, zwróć ogólny komunikat |
| 14 | Błąd wstawienia grupy | INSERT fails | 500 | DATABASE_ERROR | Failed to create group | Log błąd, rollback transakcji |
| 15 | Błąd dodania uczestnika | INSERT participants fails | 500 | DATABASE_ERROR | Failed to add creator as participant | Log błąd, rollback transakcji |
| 16 | Constraint violation | Naruszenie ograniczenia DB | 500 | DATABASE_ERROR | Data integrity error | Log błąd, rollback |

### Przykład implementacji obsługi błędów

```typescript
// Guard clauses na początku funkcji
if (!authHeader) {
  return new Response(
    JSON.stringify({
      error: {
        code: "UNAUTHORIZED",
        message: "Authorization required"
      }
    }),
    { status: 401 }
  );
}

// Walidacja Zod z try-catch
try {
  const validated = CreateGroupSchema.parse(body);
} catch (error) {
  if (error instanceof z.ZodError) {
    const firstError = error.errors[0];
    return new Response(
      JSON.stringify({
        error: {
          code: "INVALID_INPUT",
          message: firstError.message,
          details: {
            field: firstError.path.join('.'),
            value: firstError.input
          }
        }
      }),
      { status: 400 }
    );
  }
}

// Obsługa błędów bazy danych
try {
  const result = await groupService.createGroup(userId, command);
  return new Response(JSON.stringify(result), { status: 201 });
} catch (error) {
  console.error('Failed to create group:', error);
  return new Response(
    JSON.stringify({
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to create group. Please try again later."
      }
    }),
    { status: 500 }
  );
}
```

### Logowanie błędów

**Gdzie logować**:
- Błędy 4xx (400, 401, 422): Log tylko w trybie debug (opcjonalnie)
- Błędy 5xx (500): ZAWSZE logować z pełnym stack trace

**Co logować**:
- Timestamp
- User ID (jeśli dostępny)
- Typ błędu
- Stack trace (dla błędów 500)
- Request data (bez wrażliwych informacji)

**Przykład**:
```typescript
console.error('[GROUP_CREATE_ERROR]', {
  timestamp: new Date().toISOString(),
  userId: user?.id,
  error: error.message,
  stack: error.stack
});
```

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Transakcja bazy danych**
   - **Problem**: Trzy operacje (INSERT group, INSERT participant, COUNT) w jednej transakcji
   - **Wpływ**: Blokady na tabelach podczas transakcji
   - **Mitygacja**: Transakcje są krótkie i dobrze zindeksowane (index na group_id w participants)

2. **Pobieranie danych użytkownika**
   - **Problem**: Dwukrotne wywołanie do auth.users (raz dla auth, raz dla danych użytkownika)
   - **Wpływ**: Dodatkowe zapytanie do bazy
   - **Mitygacja**: Cache danych użytkownika po pierwszym sprawdzeniu auth

3. **Walidacja tokenu**
   - **Problem**: Wywołanie do Supabase Auth API przy każdym żądaniu
   - **Wpływ**: Latencja sieci
   - **Mitygacja**: Token caching w middleware (jeśli możliwe)

### Strategie optymalizacji

#### Optymalizacja 1: Połączenie operacji bazodanowych
```typescript
// Zamiast trzech zapytań:
// 1. INSERT group
// 2. INSERT participant
// 3. SELECT COUNT

// Użyj jednego zapytania z CTE (Common Table Expression):
WITH new_group AS (
  INSERT INTO groups (name, budget, end_date, creator_id)
  VALUES ($1, $2, $3, $4)
  RETURNING *
),
new_participant AS (
  INSERT INTO participants (group_id, user_id, name, email)
  SELECT id, $4, $5, $6 FROM new_group
  RETURNING group_id
)
SELECT 
  g.*,
  1 as participants_count,
  true as is_creator
FROM new_group g;
```

#### Optymalizacja 2: Cache danych użytkownika
```typescript
// W middleware: cache user data w context.locals
context.locals.user = await supabase.auth.getUser();

// W endpoint: użyj cached data
const user = context.locals.user;
```

#### Optymalizacja 3: Asynchroniczne operacje
```typescript
// Jeśli wysyłanie powiadomień będzie wymagane:
// Nie czekaj na wysłanie emaila przed zwróceniem odpowiedzi
const group = await groupService.createGroup(userId, command);

// Fire and forget - asynchroniczne powiadomienie
emailService.sendGroupCreatedNotification(group).catch(err => {
  console.error('Failed to send notification:', err);
});

return new Response(JSON.stringify(group), { status: 201 });
```

### Metryki do monitorowania

| Metryka | Cel | Działanie przy przekroczeniu |
|---------|-----|------------------------------|
| Czas odpowiedzi | < 200ms (p95) | Optymalizacja zapytań DB |
| Liczba utworzonych grup/użytkownika/dzień | < 10 | Implementacja rate limiting |
| Błędy 500 | < 0.1% | Analiza logów, naprawa błędów |
| Czas transakcji DB | < 50ms | Optymalizacja zapytań |

### Indeksy bazodanowe wymagane dla wydajności

```sql
-- Już istniejące (zgodnie z db-plan.md):
CREATE INDEX idx_groups_creator_id ON groups(creator_id);
CREATE INDEX idx_participants_group_id ON participants(group_id);

-- Dodatkowe, jeśli będą potrzebne:
CREATE INDEX idx_groups_created_at ON groups(created_at DESC);
-- (dla sortowania grup po dacie utworzenia w listach)
```

---

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie struktury projektu
```bash
# Utworzenie katalogu dla serwisów (jeśli nie istnieje)
mkdir -p src/lib/services

# Utworzenie pliku serwisu grupowego
touch src/lib/services/group.service.ts
```

### Krok 2: Implementacja serwisu grupowego (`src/lib/services/group.service.ts`)

**2.1. Importy i typy**
```typescript
import type { SupabaseClient } from '../db/supabase.client';
import type {
  CreateGroupCommand,
  GroupListItemDTO,
  UserId,
  GroupInsert,
  ParticipantInsert
} from '../types';
```

**2.2. Definicja klasy serwisu**
```typescript
export class GroupService {
  constructor(private supabase: SupabaseClient) {}

  async createGroup(
    userId: UserId,
    command: CreateGroupCommand
  ): Promise<GroupListItemDTO> {
    // Implementacja w kolejnych krokach
  }
}
```

**2.3. Implementacja metody createGroup**
```typescript
async createGroup(
  userId: UserId,
  command: CreateGroupCommand
): Promise<GroupListItemDTO> {
  // Guard: sprawdź czy userId istnieje
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // 1. Pobierz dane użytkownika (dla email i name)
    const { data: userData, error: userError } = await this.supabase
      .from('auth.users')
      .select('email')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      throw new Error('User not found');
    }

    // 2. Wstaw grupę
    const groupInsert: GroupInsert = {
      name: command.name,
      budget: command.budget,
      end_date: command.end_date,
      creator_id: userId
    };

    const { data: group, error: groupError } = await this.supabase
      .from('groups')
      .insert(groupInsert)
      .select()
      .single();

    if (groupError || !group) {
      throw new Error('Failed to create group: ' + groupError?.message);
    }

    // 3. Dodaj twórcę jako uczestnika
    const participantInsert: ParticipantInsert = {
      group_id: group.id,
      user_id: userId,
      name: userData.email, // lub pobierz z user profile
      email: userData.email
    };

    const { error: participantError } = await this.supabase
      .from('participants')
      .insert(participantInsert);

    if (participantError) {
      // Rollback - usuń grupę
      await this.supabase.from('groups').delete().eq('id', group.id);
      throw new Error('Failed to add creator as participant');
    }

    // 4. Zwróć grupę z dodatkowymi polami
    return {
      ...group,
      is_drawn: false,
      participants_count: 1,
      is_creator: true
    };
  } catch (error) {
    console.error('[GroupService.createGroup] Error:', error);
    throw error;
  }
}
```

### Krok 3: Utworzenie endpoint handlera (`src/pages/api/groups/index.ts`)

**3.1. Struktura pliku**
```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { GroupService } from '../../../lib/services/group.service';
import type { CreateGroupCommand, ApiErrorResponse } from '../../../types';

export const prerender = false;
```

**3.2. Definicja Zod schema**
```typescript
const CreateGroupSchema = z.object({
  name: z.string()
    .min(1, "Name cannot be empty")
    .max(255, "Name is too long")
    .trim(),
  budget: z.number()
    .positive("Budget must be greater than 0")
    .finite("Budget must be a valid number"),
  end_date: z.string()
    .datetime("Invalid date format. Use ISO 8601 format")
});
```

**3.3. Implementacja POST handler**
```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  // Guard 1: Sprawdź autentykację
  const supabase = locals.supabase;
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization required'
      }
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Guard 2: Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: 'INVALID_REQUEST',
        message: 'Invalid JSON in request body'
      }
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 422,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Guard 3: Walidacja danych wejściowych
  let validatedData: CreateGroupCommand;
  try {
    validatedData = CreateGroupSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      const errorResponse: ApiErrorResponse = {
        error: {
          code: firstError.message.includes('required') ? 'MISSING_FIELD' : 'INVALID_INPUT',
          message: firstError.message,
          details: {
            field: firstError.path.join('.'),
            value: firstError.input
          }
        }
      };
      return new Response(JSON.stringify(errorResponse), {
        status: firstError.message.includes('required') ? 422 : 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Nieznany błąd walidacji
    const errorResponse: ApiErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed'
      }
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Wywołanie serwisu
  try {
    const groupService = new GroupService(supabase);
    const group = await groupService.createGroup(user.id, validatedData);

    return new Response(JSON.stringify(group), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[POST /api/groups] Error:', error);
    
    const errorResponse: ApiErrorResponse = {
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to create group. Please try again later.'
      }
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

### Krok 4: Weryfikacja middleware (`src/middleware/index.ts`)

**4.1. Sprawdź czy middleware poprawnie inicjalizuje Supabase client**
```typescript
// Plik powinien już zawierać inicjalizację supabase w locals
// Upewnij się, że context.locals.supabase jest dostępne
```

**4.2. Jeśli nie istnieje, dodaj inicjalizację**
```typescript
import { defineMiddleware } from 'astro:middleware';
import { supabaseClient } from './db/supabase.client';

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});
```

### Krok 5: Aktualizacja typów Astro (`src/env.d.ts`)

**5.1. Dodaj typy dla locals**
```typescript
/// <reference types="astro/client" />

import type { SupabaseClient } from './db/supabase.client';

declare namespace App {
  interface Locals {
    supabase: SupabaseClient;
  }
}
```

<!-- ### Krok 6: Testy manualne

**6.1. Przygotowanie środowiska testowego**
```bash
# Uruchom lokalny Supabase (jeśli używasz Supabase CLI)
supabase start

# Uruchom serwer deweloperski Astro
npm run dev
```

**6.2. Test 1: Sukces (201)**
```bash
# Najpierw uzyskaj token autoryzacyjny (przez login endpoint)
# Następnie:

curl -X POST http://localhost:4321/api/groups \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "budget": 100,
    "end_date": "2025-12-25T23:59:59Z"
  }'

# Oczekiwany wynik: 201 z danymi grupy
```

**6.3. Test 2: Unauthorized (401)**
```bash
curl -X POST http://localhost:4321/api/groups \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "budget": 100,
    "end_date": "2025-12-25T23:59:59Z"
  }'

# Oczekiwany wynik: 401 UNAUTHORIZED
```

**6.4. Test 3: Missing field (422)**
```bash
curl -X POST http://localhost:4321/api/groups \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "budget": 100
  }'

# Oczekiwany wynik: 422 Missing required field: end_date
```

**6.5. Test 4: Invalid budget (400)**
```bash
curl -X POST http://localhost:4321/api/groups \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "budget": -50,
    "end_date": "2025-12-25T23:59:59Z"
  }'

# Oczekiwany wynik: 400 Budget must be greater than 0
```

**6.6. Test 5: Invalid date format (400)**
```bash
curl -X POST http://localhost:4321/api/groups \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "budget": 100,
    "end_date": "2025-12-25"
  }'

# Oczekiwany wynik: 400 Invalid date format
``` -->

<!-- ### Krok 7: Weryfikacja w bazie danych

**7.1. Sprawdź czy grupa została utworzona**
```sql
SELECT * FROM groups ORDER BY created_at DESC LIMIT 1;
```

**7.2. Sprawdź czy twórca został dodany jako uczestnik**
```sql
SELECT p.*, g.name as group_name
FROM participants p
JOIN groups g ON p.group_id = g.id
ORDER BY p.created_at DESC LIMIT 1;
```

**7.3. Sprawdź spójność danych**
```sql
-- Każda grupa powinna mieć przynajmniej jednego uczestnika
SELECT g.id, g.name, COUNT(p.id) as participant_count
FROM groups g
LEFT JOIN participants p ON g.id = p.group_id
GROUP BY g.id, g.name
HAVING COUNT(p.id) = 0;

-- Wynik powinien być pusty
``` -->

### Krok 8: Obsługa Edge Cases i finalne poprawki

**8.1. Dodanie walidacji daty w przyszłości (opcjonalnie)**
```typescript
// W CreateGroupSchema:
end_date: z.string()
  .datetime("Invalid date format")
  .refine((date) => new Date(date) > new Date(), {
    message: "End date must be in the future"
  })
```

**8.2. Dodanie limitu długości nazwy na poziomie bazy (jeśli nie istnieje)**
```sql
-- W migracji:
ALTER TABLE groups 
ADD CONSTRAINT check_name_length 
CHECK (char_length(name) <= 255);
```

**8.3. Dodanie logowania dla celów monitorowania**
```typescript
// W GroupService.createGroup:
console.log('[GroupService.createGroup] Creating group:', {
  userId,
  groupName: command.name,
  budget: command.budget
});
```

### Krok 9: Dokumentacja

**9.1. Aktualizacja API documentation**
- Dodaj przykłady użycia endpointu do dokumentacji API
- Uwzględnij wszystkie możliwe kody błędów

**9.2. Dodanie komentarzy JSDoc**
```typescript
/**
 * Creates a new Secret Santa group
 * 
 * @param userId - The ID of the user creating the group (from auth token)
 * @param command - The group creation data
 * @returns The created group with participants count
 * @throws {Error} If user is not found or database operation fails
 */
async createGroup(
  userId: UserId,
  command: CreateGroupCommand
): Promise<GroupListItemDTO> {
  // ...
}
```

### Krok 10: Code review checklist

Przed zatwierdzeniem implementacji, sprawdź:

- [ ] Wszystkie wymagane pola są walidowane
- [ ] Błędy zwracają odpowiednie kody statusu (401, 400, 422, 500)
- [ ] Odpowiedź sukcesu zwraca status 201
- [ ] Transakcja bazy danych jest atomic (rollback w przypadku błędu)
- [ ] Twórca jest automatycznie dodawany jako uczestnik
- [ ] `participants_count` jest poprawnie obliczany
- [ ] `is_creator` jest ustawione na `true`
- [ ] `is_drawn` jest ustawione na `false`
- [ ] Błędy są logowane z odpowiednim poziomem szczegółowości
- [ ] Nie ma wrażliwych danych w logach
- [ ] Kod stosuje early returns dla błędów
- [ ] Używany jest `context.locals.supabase`, nie bezpośredni import
- [ ] Wszystkie typy są poprawnie zaimportowane z `src/types.ts`
- [ ] Endpoint ma `export const prerender = false`
- [ ] Middleware poprawnie ustawia `locals.supabase`
<!-- - [ ] Testy manualne przechodzą dla wszystkich scenariuszy -->
- [ ] Dokumentacja jest aktualna

---

## 10. Możliwe rozszerzenia (Future Enhancements)

Po implementacji podstawowej funkcjonalności, można rozważyć następujące ulepszenia:

### 10.1. Rate Limiting
```typescript
// Ograniczenie do 10 grup na użytkownika dziennie
const dailyLimit = await checkGroupCreationLimit(userId);
if (dailyLimit >= 10) {
  return errorResponse(429, 'RATE_LIMIT_EXCEEDED', 'Daily group creation limit reached');
}
```

### 10.2. Walidacja zakresu dat
```typescript
// Data końcowa nie może być za daleko w przyszłości (np. max 1 rok)
const maxDate = new Date();
maxDate.setFullYear(maxDate.getFullYear() + 1);

if (new Date(command.end_date) > maxDate) {
  return errorResponse(400, 'INVALID_INPUT', 'End date cannot be more than 1 year in the future');
}
```

### 10.3. Wsparcie dla opisów grup
```typescript
// Dodanie opcjonalnego pola description
export interface CreateGroupCommand {
  name: string;
  budget: number;
  end_date: string;
  description?: string; // Opcjonalny opis grupy
}
```

### 10.4. Powiadomienia email
```typescript
// Wysłanie emaila potwierdzającego utworzenie grupy
await emailService.sendGroupCreatedEmail(user.email, group);
```

### 10.5. Analytics
```typescript
// Tracking utworzenia grupy dla celów analitycznych
analytics.track('group_created', {
  userId: user.id,
  groupId: group.id,
  budget: group.budget
});
```

---

## Podsumowanie

Ten plan wdrożenia zapewnia kompletny przewodnik do stworzenia endpointu `POST /api/groups`. Kluczowe aspekty implementacji to:

1. **Bezpieczeństwo**: Pełna walidacja i autoryzacja
2. **Spójność danych**: Transakcyjna obsługa tworzenia grupy i uczestnika
3. **Obsługa błędów**: Szczegółowa obsługa wszystkich scenariuszy błędów
4. **Wydajność**: Zoptymalizowane zapytania i minimalna liczba operacji DB
5. **Maintainability**: Wydzielona logika biznesowa do serwisów
6. **Type Safety**: Pełne typowanie TypeScript

Implementacja powinna zająć około 2-4 godzin dla doświadczonego developera, włączając testy i dokumentację.

