# API Endpoint Implementation Plan: Add Participant to Group

## 1. Przegląd punktu końcowego

Endpoint `POST /api/groups/:groupId/participants` umożliwia dodanie nowego uczestnika do istniejącej grupy Secret Santa. Tylko twórca grupy może dodawać uczestników, i tylko przed wykonaniem losowania. Endpoint generuje unikalny token dostępu dla każdego uczestnika, który może zostać użyty przez niezarejestrowanych użytkowników do dostępu do ich wyniku losowania.

**Kluczowe funkcjonalności:**
- Dodawanie uczestnika z imieniem (wymagane) i opcjonalnym emailem
- Walidacja uprawnień (tylko creator grupy)
- Sprawdzanie czy losowanie nie zostało wykonane
- Zapewnienie unikalności email w obrębie grupy
- Generowanie bezpiecznego access_token dla uczestnika
- Opcjonalne powiązanie z istniejącym użytkownikiem jeśli email jest zarejestrowany

## 2. Szczegóły żądania

### HTTP Method
`POST`

### URL Structure
```
/api/groups/:groupId/participants
```

### Path Parameters
| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| groupId | number | Yes | ID grupy do której dodajemy uczestnika | Positive integer |

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token (format: `Bearer {access_token}`) |
| Content-Type | Yes | application/json |

### Request Body
```typescript
{
  "name": string,      // REQUIRED: Imię uczestnika (1-255 znaków, po trim)
  "email"?: string     // OPTIONAL: Email uczestnika (musi być valid email format)
}
```

**Przykład:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com"
}
```

### Validation Rules
- `name`:
  - Wymagany
  - Minimum 1 znak (po trim)
  - Maximum 255 znaków
  - Automatyczny trim białych znaków
- `email`:
  - Opcjonalny
  - Musi być w poprawnym formacie email
  - Musi być unikalny w obrębie grupy (jeśli podany)

## 3. Wykorzystywane typy

### Command Models (Input)
```typescript
// Z types.ts - już zdefiniowane
CreateParticipantCommand {
  name: string;
  email?: string;
}
```

### DTOs (Output)
```typescript
// Z types.ts - już zdefiniowane
ParticipantWithTokenDTO extends ParticipantDTO {
  id: number;
  group_id: number;
  user_id: string | null;
  name: string;
  email: string | null;
  created_at: string;
  access_token: string;  // Dodatkowe pole dla niezarejestrowanych użytkowników
}
```

### Database Types
```typescript
// Z types.ts - już zdefiniowane
ParticipantInsert {
  group_id: number;
  user_id?: string | null;
  name: string;
  email?: string | null;
  created_at?: string;
}
```

### Error Types
```typescript
// Z types.ts - już zdefiniowane
ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

## 4. Szczegóły odpowiedzi

### Success Response (201 Created)
```json
{
  "id": 2,
  "group_id": 1,
  "user_id": null,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "created_at": "2025-10-09T10:00:00Z",
  "access_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Headers:**
```
Content-Type: application/json
Cache-Control: no-cache, no-store, must-revalidate
```

### Error Responses

#### 400 Bad Request - Invalid Input
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "not-an-email"
    }
  }
}
```

#### 400 Bad Request - Email Already Exists
```json
{
  "error": {
    "code": "DUPLICATE_EMAIL",
    "message": "Email already exists in this group",
    "details": {
      "email": "jane@example.com",
      "groupId": 1
    }
  }
}
```

#### 400 Bad Request - Draw Already Completed
```json
{
  "error": {
    "code": "DRAW_COMPLETED",
    "message": "Cannot add participants after draw has been completed"
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

#### 403 Forbidden - Not Creator
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the group creator can add participants"
  }
}
```

#### 404 Not Found - Group Not Found
```json
{
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "Group not found"
  }
}
```

#### 422 Unprocessable Entity - Missing Required Field
```json
{
  "error": {
    "code": "MISSING_FIELD",
    "message": "Name is required",
    "details": {
      "field": "name"
    }
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to add participant. Please try again later."
  }
}
```

## 5. Przepływ danych

### High-Level Flow
```
1. Client Request
   ↓
2. Astro Middleware (Auth)
   ↓
3. Endpoint Handler (/api/groups/[groupId]/participants.ts)
   ↓ Validate params & body
   ↓
4. ParticipantService.addParticipantToGroup()
   ↓
5. Business Logic Validations:
   ├─ Check group exists
   ├─ Check user is creator
   ├─ Check draw not completed
   ├─ Check email uniqueness in group
   └─ Optional: Link to existing user_id if email registered
   ↓
6. Generate secure access_token
   ↓
7. Insert to participants table
   ↓
8. Return ParticipantWithTokenDTO
   ↓
9. Response 201 + JSON body
```

### Detailed Service Flow

```typescript
async addParticipantToGroup(
  groupId: number,
  userId: UserId,
  command: CreateParticipantCommand
): Promise<ParticipantWithTokenDTO> {

  // Step 1: Validate group exists and get group data
  const group = await supabase
    .from("groups")
    .select("id, creator_id")
    .eq("id", groupId)
    .single();

  if (!group) throw new Error("GROUP_NOT_FOUND");

  // Step 2: Check if user is creator
  if (group.creator_id !== userId) {
    throw new Error("FORBIDDEN");
  }

  // Step 3: Check if draw has been completed
  const hasAssignments = await supabase
    .from("assignments")
    .select("id")
    .eq("group_id", groupId)
    .limit(1)
    .maybeSingle();

  if (hasAssignments) throw new Error("DRAW_COMPLETED");

  // Step 4: Check email uniqueness in group (if provided)
  if (command.email) {
    const existingParticipant = await supabase
      .from("participants")
      .select("id")
      .eq("group_id", groupId)
      .eq("email", command.email)
      .maybeSingle();

    if (existingParticipant) throw new Error("DUPLICATE_EMAIL");
  }

  // Step 5: Optional - Check if email belongs to registered user
  let linkedUserId: string | null = null;
  if (command.email) {
    // Query Supabase Auth to check if user exists
    // This is optional for MVP
  }

  // Step 6: Generate secure access token
  const accessToken = crypto.randomUUID();

  // Step 7: Insert participant
  const participantInsert: ParticipantInsert = {
    group_id: groupId,
    user_id: linkedUserId,
    name: command.name,
    email: command.email || null,
  };

  const participant = await supabase
    .from("participants")
    .insert(participantInsert)
    .select()
    .single();

  // Step 8: Return with access token
  return {
    ...participant,
    access_token: accessToken,
  };
}
```

### Database Interactions

**Tables involved:**
1. `groups` - read (check existence, get creator_id)
2. `assignments` - read (check if draw completed)
3. `participants` - read (check email uniqueness), write (insert new participant)

**Queries:**
1. SELECT from groups WHERE id = :groupId
2. SELECT from assignments WHERE group_id = :groupId LIMIT 1
3. SELECT from participants WHERE group_id = :groupId AND email = :email (if email provided)
4. INSERT INTO participants (group_id, user_id, name, email)

## 6. Względy bezpieczeństwa

### Authentication & Authorization
- **Auth Token Verification**: Middleware Astro weryfikuje token JWT z Supabase Auth
- **Creator-Only Access**: Tylko twórca grupy (creator_id === userId) może dodawać uczestników
- **Token Scope**: Bearer token musi mieć dostęp do zasobu (w przyszłości - RLS policies)

### Input Validation
- **Zod Schema Validation**: Wszystkie inputy validowane przez Zod przed przetworzeniem
- **XSS Prevention**: Automatyczny trim i sanitization przez Zod
- **SQL Injection Prevention**: Supabase client używa prepared statements
- **Email Format Validation**: Zod email validator

### Access Token Generation
- **Cryptographically Secure**: Użycie `crypto.randomUUID()` (UUID v4)
- **Uniqueness**: UUID gwarantuje unikalność (collision probability: ~10^-18)
- **Unpredictability**: Token niemożliwy do odgadnięcia
- **Storage**: Token powinien być przechowywany w dedykowanej tabeli (future enhancement)

### Business Logic Security
- **Draw State Protection**: Nie można dodawać uczestników po losowaniu
- **Email Uniqueness**: Zapobiega duplikatom w grupie
- **Group Existence Check**: Zapobiega dodawaniu do nieistniejących grup

### Optional: Rate Limiting
```typescript
// Future enhancement
// Limit: 10 requests per minute per user per group
// Implementation: Redis + middleware
```

### Security Checklist
- ✅ Authentication required (Bearer token)
- ✅ Authorization check (creator only)
- ✅ Input validation (Zod schemas)
- ✅ SQL injection prevention (Supabase prepared statements)
- ✅ XSS prevention (input sanitization)
- ✅ Secure token generation (crypto.randomUUID)
- ⚠️ Rate limiting (not in MVP, future enhancement)
- ⚠️ CORS configuration (ensure proper origin restrictions)

## 7. Obsługa błędów

### Error Handling Strategy
Używamy pattern "guard clauses" z early returns dla każdego typu błędu.

### Error Mapping Table

| Scenario | Error Code | HTTP Status | Message | Details |
|----------|-----------|-------------|---------|---------|
| Invalid JSON body | INVALID_REQUEST | 400 | Invalid JSON in request body | - |
| Invalid email format | INVALID_INPUT | 400 | Invalid email format | field, value |
| Name too long | INVALID_INPUT | 400 | Name is too long | field, value |
| Email exists in group | DUPLICATE_EMAIL | 400 | Email already exists in this group | email, groupId |
| Draw completed | DRAW_COMPLETED | 400 | Cannot add participants after draw | - |
| No auth token | UNAUTHORIZED | 401 | Authentication required | - |
| Invalid token | UNAUTHORIZED | 401 | Invalid authentication token | - |
| Not group creator | FORBIDDEN | 403 | Only the group creator can add participants | - |
| Group not found | GROUP_NOT_FOUND | 404 | Group not found | groupId |
| Missing name field | MISSING_FIELD | 422 | Name is required | field: "name" |
| Database error | DATABASE_ERROR | 500 | Failed to add participant | - |
| Unexpected error | INTERNAL_ERROR | 500 | An unexpected error occurred | - |

### Error Handling Implementation

```typescript
// Endpoint handler - error handling pattern
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // Validation & business logic
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return new Response(JSON.stringify({
        error: {
          code: firstError.message.includes("required") ? "MISSING_FIELD" : "INVALID_INPUT",
          message: firstError.message,
          details: { field: firstError.path.join("."), value: body[firstError.path[0]] }
        }
      }), { status: firstError.message.includes("required") ? 422 : 400 });
    }

    // Handle service errors
    if (error instanceof Error) {
      switch (error.message) {
        case "GROUP_NOT_FOUND":
          return new Response(JSON.stringify({
            error: { code: "GROUP_NOT_FOUND", message: "Group not found" }
          }), { status: 404 });

        case "FORBIDDEN":
          return new Response(JSON.stringify({
            error: { code: "FORBIDDEN", message: "Only the group creator can add participants" }
          }), { status: 403 });

        case "DRAW_COMPLETED":
          return new Response(JSON.stringify({
            error: { code: "DRAW_COMPLETED", message: "Cannot add participants after draw has been completed" }
          }), { status: 400 });

        case "DUPLICATE_EMAIL":
          return new Response(JSON.stringify({
            error: { code: "DUPLICATE_EMAIL", message: "Email already exists in this group" }
          }), { status: 400 });
      }
    }

    // Generic error
    return new Response(JSON.stringify({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" }
    }), { status: 500 });
  }
};
```

### Logging Strategy

```typescript
// Service level logging
console.log("[ParticipantService.addParticipantToGroup] Starting", {
  groupId, userId, participantName: command.name
});

console.log("[ParticipantService.addParticipantToGroup] Group found", {
  groupId, creatorId: group.creator_id
});

console.error("[ParticipantService.addParticipantToGroup] Error", {
  groupId, userId, error
});
```

## 8. Rozważania dotyczące wydajności

### Database Performance

**Query Optimization:**
- Używamy `.single()` zamiast `.limit(1)` dla jednoznacznych wyników
- Index na `participants.group_id` już istnieje (foreign key)
- Index na `participants.email` może poprawić performance (future enhancement)
- Partial unique index: `CREATE UNIQUE INDEX participants_group_email_unique ON participants(group_id, email) WHERE email IS NOT NULL`

**N+1 Query Prevention:**
- Endpoint wykonuje stały zestaw queries (nie ma N+1 problem)
- Total queries: 4 (group check, assignments check, email check, insert)

### Response Time Targets
- **Target**: < 200ms (p50)
- **Acceptable**: < 500ms (p95)
- **Maximum**: < 1000ms (p99)

### Caching Strategy
- **No caching** dla tego endpointa (mutating operation)
- Cache invalidation dla GET /api/groups/:id po dodaniu uczestnika (future)

### Potential Bottlenecks
1. **Email uniqueness check**: Może być wolne dla dużych grup
   - **Solution**: Index na (group_id, email)
2. **UUID generation**: Minimalny overhead (~1ms)
3. **Multiple sequential queries**: 4 round-trips do bazy
   - **Future optimization**: Database function lub transaction

### Scalability Considerations
- **Concurrent inserts**: Supabase/Postgres handles concurrency z row-level locking
- **Large groups**: Email uniqueness query może być wolniejsze (index pomaga)
- **Future**: Consider database function dla całej logiki (1 round-trip zamiast 4)

### Monitoring Metrics
```typescript
// Future enhancement - metrics to track
- Request rate per user
- Response time distribution (p50, p95, p99)
- Error rate by type
- Database query time
- Token generation time
```

## 9. Etapy wdrożenia

### Phase 1: Setup & Infrastructure (Priorytet: Wysoki)

**1.1. Utworzenie katalogu struktury**
```bash
mkdir -p src/pages/api/groups/[groupId]
mkdir -p src/lib/services
mkdir -p src/lib/utils
```

**1.2. Utworzenie pliku serwisu**
- Plik: `src/lib/services/participant.service.ts`
- Zawartość: Klasa `ParticipantService` z metodą `addParticipantToGroup`

**1.3. Utworzenie utility dla generowania tokenów** (opcjonalne)
- Plik: `src/lib/utils/token.utils.ts`
- Funkcja: `generateAccessToken(): string` używająca `crypto.randomUUID()`

### Phase 2: Service Layer Implementation (Priorytet: Wysoki)

**2.1. Implementacja ParticipantService**

Struktura klasy:
```typescript
export class ParticipantService {
  constructor(private supabase: SupabaseClient) {}

  async addParticipantToGroup(
    groupId: number,
    userId: UserId,
    command: CreateParticipantCommand
  ): Promise<ParticipantWithTokenDTO> {
    // Implementation
  }
}
```

**2.2. Implementacja kroków walidacji:**
1. Sprawdzenie istnienia grupy
2. Weryfikacja uprawnień (is creator)
3. Sprawdzenie czy draw nie został wykonany
4. Walidacja unikalności email (jeśli podany)
5. Generowanie access token
6. Insert do bazy danych
7. Zwrócenie wyniku

**2.3. Dodanie error handling**
- Try-catch blocks
- Custom error messages
- Console logging dla debugowania

### Phase 3: API Endpoint Implementation (Priorytet: Wysoki)

**3.1. Utworzenie pliku endpointa**
- Plik: `src/pages/api/groups/[groupId]/participants.ts`
- Dodanie prerender i trailingSlash config

**3.2. Zdefiniowanie Zod schemas**
```typescript
const GroupIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Group ID must be a positive integer")
});

const CreateParticipantSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(255, "Name is too long").trim(),
  email: z.string().email("Invalid email format").optional()
});
```

**3.3. Implementacja handler POST**
- Guard 1: Validate groupId parameter
- Guard 2: Check authentication (locals.user lub DEFAULT_USER_ID)
- Guard 3: Parse and validate request body
- Guard 4: Call service layer
- Return appropriate response

**3.4. Implementacja obsługi błędów**
- Zod validation errors → 400/422
- Service errors (GROUP_NOT_FOUND, FORBIDDEN, etc.) → mapped status codes
- Generic errors → 500

### Phase 4: Testing (Priorytet: Średni)

**4.1. Unit Tests dla Service Layer**
- Test: grupa nie istnieje → throw GROUP_NOT_FOUND
- Test: user nie jest creatorem → throw FORBIDDEN
- Test: draw został wykonany → throw DRAW_COMPLETED
- Test: email duplikat → throw DUPLICATE_EMAIL
- Test: poprawne dodanie uczestnika → zwraca ParticipantWithTokenDTO
- Test: generowanie unikalnego access_token

**4.2. Integration Tests dla Endpoint**
- Test: poprawny request → 201 + valid response
- Test: niepoprawny groupId → 400
- Test: brak auth → 401
- Test: nie creator → 403
- Test: grupa nie istnieje → 404
- Test: brak name → 422
- Test: invalid email format → 400
- Test: duplicate email → 400
- Test: draw completed → 400

**4.3. Manual Testing via Postman/Thunder Client**
- Wszystkie success scenarios
- Wszystkie error scenarios
- Edge cases (puste stringi, bardzo długie wartości, null values)

### Phase 5: Documentation & Refinement (Priorytet: Niski)

**5.1. Dokumentacja API**
- Dodanie JSDoc comments do service methods
- Dodanie przykładów użycia w komentarzach
- Update API documentation (jeśli istnieje)

**5.2. Code Review Checklist**
- Czy wszystkie guard clauses są na miejscu?
- Czy error messages są user-friendly?
- Czy logging jest wystarczający?
- Czy typy są poprawnie wykorzystane?
- Czy code follows project conventions?

**5.3. Performance Review**
- Sprawdzenie query performance (EXPLAIN ANALYZE)
- Dodanie indexów jeśli potrzebne
- Monitorowanie response times

### Phase 6: Deployment & Monitoring (Priorytet: Niski)

**6.1. Deployment**
- Merge do main branch
- Deploy to staging environment
- Smoke testing na staging
- Deploy to production

**6.2. Monitoring Setup** (future)
- Dodanie metryki do monitoring dashboard
- Alert setup dla error rate > 5%
- Performance monitoring (response time)

---

## Dodatkowe Uwagi

### Bulk Operations - Decyzja dla MVP
**Rekomendacja: NIE implementować bulk operations w MVP**

**Powody:**
- PRD nie wymaga tej funkcjonalności
- Komplikuje API design i error handling
- Frontend może wywołać endpoint wielokrotnie
- Transactional complexity (co jeśli część się powiedzie, część nie?)

**Alternatywy:**
- Frontend: sequential calls z progress bar
- Future enhancement: POST /api/groups/:groupId/participants/bulk

### Future Enhancements (Post-MVP)
1. **Access Token Storage**: Dedykowana tabela `participant_tokens` z timestamp
2. **Email to User Linking**: Automatyczne powiązanie z user_id jeśli email zarejestrowany
3. **Bulk Operations**: Endpoint do dodawania wielu uczestników naraz
4. **Rate Limiting**: Middleware do ograniczania częstotliwości requestów
5. **Audit Log**: Logowanie kto i kiedy dodał uczestnika
6. **Email Notifications**: Wysyłanie email po dodaniu (jeśli email podany)
7. **Database Function**: Przeniesienie całej logiki do Postgres function (performance)

---

## Podsumowanie

Ten plan implementacji zapewnia:
- ✅ Pełną walidację inputów i biznesową
- ✅ Bezpieczne generowanie access tokenów
- ✅ Konsystencję z istniejącym kodem (GroupService pattern)
- ✅ Kompletną obsługę błędów
- ✅ Dobrą wydajność (< 500ms response time)
- ✅ Jasną ścieżkę do przyszłych ulepszeń

Plan został zaprojektowany zgodnie z zasadami SOLID, używając guard clauses dla lepszej czytelności i service layer pattern dla separacji logiki biznesowej od warstwy HTTP.
