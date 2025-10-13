# API Endpoint Implementation Plan: Update and Delete Group

## 1. Przegląd endpointów

### PATCH /api/groups/:id
Aktualizuje szczegóły grupy Secret Santa. Operacja dostępna tylko dla twórcy grupy i tylko przed przeprowadzeniem losowania. Wszystkie pola w request body są opcjonalne, ale co najmniej jedno pole musi być podane.

### DELETE /api/groups/:id
Usuwa grupę Secret Santa wraz ze wszystkimi powiązanymi danymi (uczestnicy, reguły wykluczeń, przypisania, listy życzeń). Operacja dostępna tylko dla twórcy grupy. Wykorzystuje CASCADE w bazie danych do automatycznego usuwania powiązanych rekordów.

## 2. Szczegóły żądania

### PATCH /api/groups/:id
- **Metoda HTTP**: PATCH
- **Struktura URL**: `/api/groups/:id`
- **Headers**:
  - `Authorization: Bearer {access_token}` (TODO: implementacja auth)
  - `Content-Type: application/json`
- **Parametry**:
  - **Wymagane**:
    - `id` (URL param) - ID grupy do zaktualizowania (positive integer)
  - **Opcjonalne (Request Body)**:
    - `name` (string) - Nowa nazwa grupy (1-255 znaków)
    - `budget` (number) - Nowy budżet (positive number)
    - `end_date` (string) - Nowa data zakończenia (ISO 8601 datetime)
- **Request Body Example**:
```json
{
  "name": "Updated Secret Santa 2025",
  "budget": 150,
  "end_date": "2025-12-31T23:59:59Z"
}
```

### DELETE /api/groups/:id
- **Metoda HTTP**: DELETE
- **Struktura URL**: `/api/groups/:id`
- **Headers**:
  - `Authorization: Bearer {access_token}` (TODO: implementacja auth)
- **Parametry**:
  - **Wymagane**:
    - `id` (URL param) - ID grupy do usunięcia (positive integer)
  - **Opcjonalne**: brak
- **Request Body**: brak

## 3. Wykorzystywane typy

### Istniejące typy (z src/types.ts)
```typescript
// Command dla update (wszystkie pola opcjonalne)
export type UpdateGroupCommand = Partial<CreateGroupCommand>;

// DTO dla zwrócenia zaktualizowanej grupy
export interface GroupDTO {
  id: number;
  name: string;
  budget: number;
  end_date: string;
  creator_id: string;
  is_drawn: boolean;
  created_at: string;
  updated_at: string;
}

// Response dla błędów
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Typy bazodanowe
export type GroupUpdate = TablesUpdate<"groups">;
export type UserId = string;
```

### Nowe schematy walidacji (Zod)
```typescript
// Schemat dla walidacji parametru ID
const GroupIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: "Group ID must be a positive integer",
  }),
});

// Schemat dla walidacji UpdateGroupCommand
const UpdateGroupSchema = z.object({
  name: z.string()
    .min(1, "Name cannot be empty")
    .max(255, "Name is too long")
    .trim()
    .optional(),
  budget: z.number()
    .positive("Budget must be greater than 0")
    .finite("Budget must be a valid number")
    .optional(),
  end_date: z.string()
    .datetime("Invalid date format. Use ISO 8601 format")
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);
```

## 4. Szczegóły odpowiedzi

### PATCH /api/groups/:id

**Success (200 OK)**:
```json
{
  "id": 1,
  "name": "Updated Secret Santa 2025",
  "budget": 150,
  "end_date": "2025-12-31T23:59:59Z",
  "creator_id": "uuid-123",
  "is_drawn": false,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-20T15:30:00Z"
}
```

**Error Responses**:

**400 Bad Request - Invalid Input**:
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

**400 Bad Request - No Fields**:
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "At least one field must be provided for update"
  }
}
```

**400 Bad Request - Draw Completed**:
```json
{
  "error": {
    "code": "DRAW_COMPLETED",
    "message": "Cannot update group after draw has been completed"
  }
}
```

**401 Unauthorized**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the group creator can update this group"
  }
}
```

**404 Not Found**:
```json
{
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "Group not found"
  }
}
```

**500 Internal Server Error**:
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### DELETE /api/groups/:id

**Success (204 No Content)**:
- Brak body w odpowiedzi
- Status code: 204
- Headers: standardowe

**Error Responses**:

**400 Bad Request**:
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Group ID must be a positive integer"
  }
}
```

**401 Unauthorized**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the group creator can delete this group"
  }
}
```

**404 Not Found**:
```json
{
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "Group not found"
  }
}
```

**500 Internal Server Error**:
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 5. Przepływ danych

### PATCH /api/groups/:id

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ PATCH /api/groups/:id
       │ Body: { name?, budget?, end_date? }
       │ Headers: Authorization
       ▼
┌─────────────────────────────────────────────────────┐
│           API Endpoint Handler (PATCH)              │
│  1. Parse URL param (id)                            │
│  2. Validate id (Zod: positive integer)             │
│  3. Parse request body                              │
│  4. Validate body (Zod: UpdateGroupSchema)          │
│  5. Extract userId (from auth - TODO)               │
│  6. Check authentication                            │
└──────┬──────────────────────────────────────────────┘
       │ Valid request
       ▼
┌─────────────────────────────────────────────────────┐
│           GroupService.updateGroup()                │
│  1. Fetch group by id                               │
│  2. Check if group exists → 404 if not             │
│  3. Check if user is creator → 403 if not          │
│  4. Check if draw completed → 400 if yes           │
│  5. Update group in database                        │
│  6. Calculate is_drawn field                        │
│  7. Return GroupDTO                                 │
└──────┬──────────────────────────────────────────────┘
       │ GroupDTO
       ▼
┌─────────────────────────────────────────────────────┐
│           Supabase Database                         │
│  UPDATE groups                                       │
│  SET name = $1, budget = $2, end_date = $3,         │
│      updated_at = NOW()                             │
│  WHERE id = $4                                      │
│  RETURNING *                                        │
└──────┬──────────────────────────────────────────────┘
       │ Updated row
       ▼
┌─────────────────────────────────────────────────────┐
│           API Endpoint Handler                      │
│  Return Response                                     │
│  Status: 200                                        │
│  Body: GroupDTO                                     │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

### DELETE /api/groups/:id

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ DELETE /api/groups/:id
       │ Headers: Authorization
       ▼
┌─────────────────────────────────────────────────────┐
│           API Endpoint Handler (DELETE)             │
│  1. Parse URL param (id)                            │
│  2. Validate id (Zod: positive integer)             │
│  3. Extract userId (from auth - TODO)               │
│  4. Check authentication                            │
└──────┬──────────────────────────────────────────────┘
       │ Valid request
       ▼
┌─────────────────────────────────────────────────────┐
│           GroupService.deleteGroup()                │
│  1. Fetch group by id                               │
│  2. Check if group exists → 404 if not             │
│  3. Check if user is creator → 403 if not          │
│  4. Delete group from database                      │
│     (CASCADE deletes related records)               │
│  5. Return void                                     │
└──────┬──────────────────────────────────────────────┘
       │ void
       ▼
┌─────────────────────────────────────────────────────┐
│           Supabase Database                         │
│  DELETE FROM groups WHERE id = $1                   │
│                                                     │
│  CASCADE automatically deletes:                     │
│  - participants (ON DELETE CASCADE)                 │
│  - exclusion_rules (ON DELETE CASCADE)              │
│  - assignments (ON DELETE CASCADE)                  │
│  - wishes (via participants CASCADE)                │
└──────┬──────────────────────────────────────────────┘
       │ Success
       ▼
┌─────────────────────────────────────────────────────┐
│           API Endpoint Handler                      │
│  Return Response                                     │
│  Status: 204 No Content                             │
│  Body: empty                                        │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie
- **Obecny stan (MVP)**: Używamy `DEFAULT_USER_ID` jako placeholder
- **TODO**: Implementacja JWT Bearer token authentication z Supabase Auth
- **Walidacja**: Sprawdzenie czy userId istnieje przed każdą operacją
- **Response**: 401 Unauthorized jeśli brak uwierzytelnienia

### 6.2. Autoryzacja
- **IDOR Prevention**: Sprawdzanie czy `userId === group.creator_id` przed update/delete
- **Response**: 403 Forbidden jeśli użytkownik nie jest twórcą grupy
- **Logging**: Logowanie prób nieautoryzowanego dostępu

### 6.3. Walidacja danych wejściowych
- **Zod schemas**: Silna walidacja typów i formatów danych
- **Sanityzacja**:
  - `name`: trim() - usunięcie białych znaków na początku i końcu
  - `budget`: finite() - zabezpieczenie przed Infinity/NaN
  - `end_date`: datetime() - walidacja formatu ISO 8601
- **Boundary checks**:
  - `name`: 1-255 znaków
  - `budget`: > 0
  - `id`: positive integer

### 6.4. SQL Injection
- **Mitigacja**: Supabase automatycznie używa prepared statements
- **Dodatkowa ochrona**: Walidacja wszystkich parametrów przez Zod

### 6.5. Race Conditions
- **Problem**: Możliwe jest, że losowanie zostanie przeprowadzone w trakcie update
- **Mitigacja**:
  - Sprawdzanie `is_drawn` w serwisie przed update
  - Atomic operations w bazie danych
- **Future improvement**: Optimistic locking lub database transactions

### 6.6. Mass Assignment
- **Mitigacja**: Używanie explicit DTOs (UpdateGroupCommand) zamiast bezpośredniego mapowania request body
- **Whitelist approach**: Tylko dozwolone pola (name, budget, end_date) mogą być zaktualizowane

### 6.7. Sensitive Data Exposure
- **Brak**: Endpoint nie ujawnia wrażliwych danych (hasła, tokeny, etc.)
- **Logging**: Unikanie logowania pełnych danych użytkownika

## 7. Obsługa błędów

### 7.1. Błędy walidacji (400 Bad Request)

**Typy błędów**:
1. Invalid group ID format
2. Invalid input data (name, budget, end_date)
3. No fields provided for update
4. Draw already completed

**Obsługa**:
```typescript
try {
  // Validation
  const validated = UpdateGroupSchema.parse(body);
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(JSON.stringify({
      error: {
        code: "INVALID_INPUT",
        message: error.errors[0].message,
        details: { errors: error.errors }
      }
    }), { status: 400 });
  }
}
```

### 7.2. Błędy autoryzacji (401 Unauthorized, 403 Forbidden)

**401 - Unauthorized**:
- Brak userId (brak uwierzytelnienia)
- Invalid token (future)

**403 - Forbidden**:
- Użytkownik nie jest twórcą grupy

**Obsługa**:
```typescript
// 401
if (!userId) {
  return new Response(JSON.stringify({
    error: {
      code: "UNAUTHORIZED",
      message: "Authentication required"
    }
  }), { status: 401 });
}

// 403
if (group.creator_id !== userId) {
  return new Response(JSON.stringify({
    error: {
      code: "FORBIDDEN",
      message: "Only the group creator can update/delete this group"
    }
  }), { status: 403 });
}
```

### 7.3. Błędy not found (404 Not Found)

**Typy błędów**:
- Grupa nie istnieje
- Grupa została już usunięta

**Obsługa**:
```typescript
const group = await groupService.getGroupById(id);
if (!group) {
  return new Response(JSON.stringify({
    error: {
      code: "GROUP_NOT_FOUND",
      message: "Group not found"
    }
  }), { status: 404 });
}
```

### 7.4. Błędy serwera (500 Internal Server Error)

**Typy błędów**:
- Database connection errors
- Unexpected exceptions
- Supabase API errors

**Obsługa**:
```typescript
try {
  // Service call
} catch (error) {
  console.error("[PATCH /api/groups/:id] Error:", error);
  return new Response(JSON.stringify({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred"
    }
  }), { status: 500 });
}
```

### 7.5. Error logging

**Co logować**:
- Wszystkie błędy 500 (z pełnym stack trace)
- Próby nieautoryzowanego dostępu (403)
- Błędy walidacji (dla monitoringu)
- Database errors

**Format logów**:
```typescript
console.error("[PATCH /api/groups/:id] Error:", {
  groupId: params.id,
  userId: userId,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});
```

## 8. Rozważania dotyczące wydajności

### 8.1. Optymalizacja zapytań do bazy danych

**PATCH endpoint**:
- **1 query**: Fetch group + check is_drawn (combined with JOIN on assignments)
- **1 query**: Update group
- **Total**: 2 database round trips

**Optymalizacja**:
```sql
-- Single query to check group + is_drawn + authorization
SELECT g.*,
       EXISTS(SELECT 1 FROM assignments WHERE group_id = g.id) as is_drawn
FROM groups g
WHERE g.id = $1
```

**DELETE endpoint**:
- **1 query**: Fetch group (for authorization check)
- **1 query**: Delete group (CASCADE handles related records)
- **Total**: 2 database round trips

**Optymalizacja możliwa**:
- Można połączyć check + delete w jeden query z RLS policies (future)

### 8.2. Indeksowanie

**Istniejące indeksy** (z database schema):
- `groups.id` - PRIMARY KEY (automatyczny index)
- `groups.creator_id` - INDEX (dla szybkiego lookup)

**Brak potrzeby dodatkowych indeksów** dla tych endpointów.

### 8.3. Caching

**PATCH endpoint**:
- **Cache invalidation**: Po update należy invalidate cache dla:
  - GET /api/groups/:id
  - GET /api/groups (list)
- **Strategy**: No caching dla PATCH (zawsze fresh data)

**DELETE endpoint**:
- **Cache invalidation**: Po delete należy invalidate cache dla:
  - GET /api/groups (list)
- **Strategy**: No caching dla DELETE

**Response headers**:
```typescript
// PATCH - return fresh data
headers: {
  "Content-Type": "application/json",
  "Cache-Control": "no-cache, no-store, must-revalidate"
}

// DELETE - no caching
headers: {
  "Cache-Control": "no-cache, no-store, must-revalidate"
}
```

### 8.4. Potencjalne wąskie gardła

**Database locks**:
- UPDATE/DELETE operations lock the row
- Minimal impact (short transactions)

**CASCADE DELETE performance**:
- Deleting group with many participants/exclusions/assignments może być wolne
- **Mitigacja**: Database handles CASCADE efficiently with foreign keys
- **Future**: Consider soft delete for large groups

**Network latency**:
- 2 round trips do Supabase
- **Mitigacja**: Use Supabase connection pooling
- **Future**: Consider database transactions to combine queries

### 8.5. Rate limiting

**Recommendation**:
- Implement rate limiting dla UPDATE/DELETE operations
- Prevent abuse (spam updates/deletes)
- **Future**: Add rate limiting middleware

## 9. Etapy wdrożenia

### Etap 1: Rozszerzenie GroupService (~/src/lib/services/group.service.ts)

**1.1. Dodaj metodę `updateGroup`**

```typescript
/**
 * Updates a Secret Santa group
 * Only the creator can update the group, and only before the draw
 *
 * @param groupId - The ID of the group to update
 * @param userId - The ID of the user attempting to update
 * @param command - The update data (all fields optional)
 * @returns Updated GroupDTO
 * @throws {Error} If group not found, user unauthorized, or draw completed
 */
async updateGroup(
  groupId: number,
  userId: UserId,
  command: UpdateGroupCommand
): Promise<GroupDTO> {
  // Guard: Validate input
  if (!groupId || !userId) {
    throw new Error("Group ID and User ID are required");
  }

  try {
    // Step 1: Fetch group and check authorization
    const { data: group, error: groupError } = await this.supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    // Guard: Check if group exists
    if (groupError || !group) {
      console.log("[GroupService.updateGroup] Group not found", { groupId });
      throw new Error("GROUP_NOT_FOUND");
    }

    // Guard: Check if user is creator
    if (group.creator_id !== userId) {
      console.log("[GroupService.updateGroup] User not authorized", {
        userId,
        creatorId: group.creator_id
      });
      throw new Error("FORBIDDEN");
    }

    // Step 2: Check if draw has been completed
    const { data: hasAssignments } = await this.supabase
      .from("assignments")
      .select("id")
      .eq("group_id", groupId)
      .limit(1)
      .maybeSingle();

    // Guard: Check if draw completed
    if (hasAssignments !== null) {
      console.log("[GroupService.updateGroup] Draw already completed", { groupId });
      throw new Error("DRAW_COMPLETED");
    }

    // Step 3: Prepare update data
    const updateData: GroupUpdate = {};
    if (command.name !== undefined) updateData.name = command.name;
    if (command.budget !== undefined) updateData.budget = command.budget;
    if (command.end_date !== undefined) updateData.end_date = command.end_date;

    // Step 4: Update group
    const { data: updatedGroup, error: updateError } = await this.supabase
      .from("groups")
      .update(updateData)
      .eq("id", groupId)
      .select()
      .single();

    if (updateError || !updatedGroup) {
      console.error("[GroupService.updateGroup] Failed to update group:", updateError);
      throw new Error("Failed to update group");
    }

    console.log("[GroupService.updateGroup] Group updated successfully", { groupId });

    // Step 5: Return GroupDTO with is_drawn field
    return {
      ...updatedGroup,
      is_drawn: false, // We already checked it's not drawn
    };
  } catch (error) {
    console.error("[GroupService.updateGroup] Error:", error);
    throw error;
  }
}
```

**1.2. Dodaj metodę `deleteGroup`**

```typescript
/**
 * Deletes a Secret Santa group and all related data
 * Only the creator can delete the group
 *
 * @param groupId - The ID of the group to delete
 * @param userId - The ID of the user attempting to delete
 * @throws {Error} If group not found or user unauthorized
 */
async deleteGroup(groupId: number, userId: UserId): Promise<void> {
  // Guard: Validate input
  if (!groupId || !userId) {
    throw new Error("Group ID and User ID are required");
  }

  try {
    // Step 1: Fetch group and check authorization
    const { data: group, error: groupError } = await this.supabase
      .from("groups")
      .select("id, creator_id")
      .eq("id", groupId)
      .single();

    // Guard: Check if group exists
    if (groupError || !group) {
      console.log("[GroupService.deleteGroup] Group not found", { groupId });
      throw new Error("GROUP_NOT_FOUND");
    }

    // Guard: Check if user is creator
    if (group.creator_id !== userId) {
      console.log("[GroupService.deleteGroup] User not authorized", {
        userId,
        creatorId: group.creator_id
      });
      throw new Error("FORBIDDEN");
    }

    // Step 2: Delete group (CASCADE will handle related records)
    const { error: deleteError } = await this.supabase
      .from("groups")
      .delete()
      .eq("id", groupId);

    if (deleteError) {
      console.error("[GroupService.deleteGroup] Failed to delete group:", deleteError);
      throw new Error("Failed to delete group");
    }

    console.log("[GroupService.deleteGroup] Group deleted successfully", { groupId });
  } catch (error) {
    console.error("[GroupService.deleteGroup] Error:", error);
    throw error;
  }
}
```

**1.3. Dodaj import dla UpdateGroupCommand**

```typescript
import type {
  CreateGroupCommand,
  UpdateGroupCommand, // ADD THIS
  GroupListItemDTO,
  GroupDetailDTO,
  UserId,
  GroupInsert,
  GroupUpdate, // ADD THIS
  ParticipantInsert,
} from "../../types";
```

### Etap 2: Dodanie endpointu PATCH do API (~/src/pages/api/groups/[id].ts)

**2.1. Dodaj Zod schema dla UpdateGroupCommand**

```typescript
/**
 * Zod schema for validating group update input
 */
const UpdateGroupSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name cannot be empty")
      .max(255, "Name is too long")
      .trim()
      .optional(),
    budget: z
      .number()
      .positive("Budget must be greater than 0")
      .finite("Budget must be a valid number")
      .optional(),
    end_date: z
      .string()
      .datetime("Invalid date format. Use ISO 8601 format (e.g., 2025-12-25T23:59:59Z)")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });
```

**2.2. Dodaj PATCH handler**

```typescript
/**
 * PATCH /api/groups/:id
 * Updates an existing Secret Santa group
 *
 * Only the group creator can update the group, and only before the draw.
 * All fields in the request body are optional, but at least one must be provided.
 *
 * @param {number} id - Group ID from URL parameter
 * @body UpdateGroupCommand (optional fields: name, budget, end_date)
 * @returns {GroupDTO} 200 - Updated group details
 * @returns {ApiErrorResponse} 400 - Invalid input or draw already completed
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not the group creator
 * @returns {ApiErrorResponse} 404 - Group not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication is not implemented yet - uses DEFAULT_USER_ID
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  console.log("[PATCH /api/groups/:id] Endpoint hit", { groupId: params.id });

  try {
    // Guard 1: Validate ID parameter
    const { id } = GroupIdParamSchema.parse({ id: params.id });

    // Guard 2: Check authentication
    // TODO: Replace DEFAULT_USER_ID with actual user ID from auth when implemented
    const userId = DEFAULT_USER_ID;
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

    // Guard 3: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid JSON in request body",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Guard 4: Validate request body
    const validatedData = UpdateGroupSchema.parse(body);

    // Get Supabase client
    const supabase = locals.supabase;

    // Call service to update group
    const groupService = new GroupService(supabase);
    const updatedGroup = await groupService.updateGroup(id, userId, validatedData);

    // Success - return updated group
    return new Response(JSON.stringify(updatedGroup), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_INPUT",
          message: error.errors[0].message,
          details: { errors: error.errors },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle service errors
    if (error instanceof Error) {
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

      if (error.message === "FORBIDDEN") {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "FORBIDDEN",
            message: "Only the group creator can update this group",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (error.message === "DRAW_COMPLETED") {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "DRAW_COMPLETED",
            message: "Cannot update group after draw has been completed",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Log unexpected errors
    console.error("[PATCH /api/groups/:id] Error:", {
      groupId: params.id,
      userId: DEFAULT_USER_ID,
      error,
    });

    // Generic error response
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

**2.3. Dodaj import dla UpdateGroupCommand**

```typescript
import type { ApiErrorResponse, UpdateGroupCommand } from "../../../types";
```

### Etap 3: Dodanie endpointu DELETE do API (~/src/pages/api/groups/[id].ts)

**3.1. Dodaj DELETE handler do tego samego pliku**

```typescript
/**
 * DELETE /api/groups/:id
 * Deletes a Secret Santa group and all related data
 *
 * Only the group creator can delete the group.
 * This operation cascades and deletes all related records:
 * - participants
 * - exclusion_rules
 * - assignments
 * - wishes (via participants cascade)
 *
 * @param {number} id - Group ID from URL parameter
 * @returns 204 - No content (success)
 * @returns {ApiErrorResponse} 400 - Invalid group ID
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not the group creator
 * @returns {ApiErrorResponse} 404 - Group not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication is not implemented yet - uses DEFAULT_USER_ID
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  console.log("[DELETE /api/groups/:id] Endpoint hit", { groupId: params.id });

  try {
    // Guard 1: Validate ID parameter
    const { id } = GroupIdParamSchema.parse({ id: params.id });

    // Guard 2: Check authentication
    // TODO: Replace DEFAULT_USER_ID with actual user ID from auth when implemented
    const userId = DEFAULT_USER_ID;
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

    // Call service to delete group
    const groupService = new GroupService(supabase);
    await groupService.deleteGroup(id, userId);

    // Success - return 204 No Content
    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_INPUT",
          message: error.errors[0].message,
          details: { errors: error.errors },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle service errors
    if (error instanceof Error) {
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

      if (error.message === "FORBIDDEN") {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "FORBIDDEN",
            message: "Only the group creator can delete this group",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Log unexpected errors
    console.error("[DELETE /api/groups/:id] Error:", {
      groupId: params.id,
      userId: DEFAULT_USER_ID,
      error,
    });

    // Generic error response
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

### Etap 4: Testowanie

**4.1. Testy manualne - PATCH endpoint**

```bash
# Test 1: Successful update
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Secret Santa",
    "budget": 150
  }'
# Expected: 200 with updated GroupDTO

# Test 2: Update with all fields
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Christmas 2025",
    "budget": 200,
    "end_date": "2025-12-31T23:59:59Z"
  }'
# Expected: 200 with updated GroupDTO

# Test 3: Invalid input - empty body
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 400 "At least one field must be provided"

# Test 4: Invalid input - negative budget
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{"budget": -50}'
# Expected: 400 "Budget must be greater than 0"

# Test 5: Invalid input - empty name
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{"name": ""}'
# Expected: 400 "Name cannot be empty"

# Test 6: Invalid input - invalid date format
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{"end_date": "2025-12-31"}'
# Expected: 400 "Invalid date format"

# Test 7: Group not found
curl -X PATCH http://localhost:4321/api/groups/99999 \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
# Expected: 404 "Group not found"

# Test 8: Draw already completed
# First create group, add participants, perform draw, then try to update
# Expected: 400 "Cannot update group after draw has been completed"

# Test 9: Unauthorized (different user)
# Change DEFAULT_USER_ID temporarily and try to update
# Expected: 403 "Only the group creator can update this group"
```

**4.2. Testy manualne - DELETE endpoint**

```bash
# Test 1: Successful delete
curl -X DELETE http://localhost:4321/api/groups/1
# Expected: 204 No Content

# Test 2: Invalid group ID
curl -X DELETE http://localhost:4321/api/groups/abc
# Expected: 400 "Group ID must be a positive integer"

# Test 3: Group not found
curl -X DELETE http://localhost:4321/api/groups/99999
# Expected: 404 "Group not found"

# Test 4: Unauthorized (different user)
# Change DEFAULT_USER_ID temporarily and try to delete
# Expected: 403 "Only the group creator can delete this group"

# Test 5: Verify CASCADE delete
# 1. Create group with participants, exclusions, assignments
# 2. Delete group
# 3. Check database - all related records should be deleted
```

**4.3. Testy integracyjne**

1. **Test scenariusza update grupy**:
   - Utwórz grupę
   - Zaktualizuj nazwę
   - Zaktualizuj budżet
   - Zaktualizuj datę zakończenia
   - Zaktualizuj wszystkie pola jednocześnie
   - Sprawdź czy `updated_at` się zmienia

2. **Test scenariusza delete grupy**:
   - Utwórz grupę
   - Dodaj uczestników
   - Dodaj reguły wykluczeń
   - Przeprowadź losowanie
   - Usuń grupę
   - Sprawdź czy wszystkie powiązane rekordy zostały usunięte

3. **Test scenariusza autoryzacji**:
   - User A tworzy grupę
   - User B próbuje zaktualizować/usunąć grupę
   - Sprawdź 403 response

4. **Test scenariusza draw completed**:
   - Utwórz grupę
   - Przeprowadź losowanie
   - Próbuj zaktualizować grupę
   - Sprawdź 400 response

**4.4. Kryteria akceptacji**

✅ PATCH endpoint:
- [ ] Akceptuje wszystkie opcjonalne pola (name, budget, end_date)
- [ ] Wymaga przynajmniej jednego pola
- [ ] Waliduje format i wartości pól
- [ ] Sprawdza autoryzację (tylko twórca)
- [ ] Sprawdza czy losowanie nie zostało przeprowadzone
- [ ] Zwraca 200 z zaktualizowanym GroupDTO
- [ ] Zwraca odpowiednie kody błędów (400, 401, 403, 404, 500)
- [ ] Loguje błędy do konsoli
- [ ] Aktualizuje pole `updated_at`

✅ DELETE endpoint:
- [ ] Usuwa grupę i wszystkie powiązane dane (CASCADE)
- [ ] Sprawdza autoryzację (tylko twórca)
- [ ] Zwraca 204 No Content przy sukcesie
- [ ] Zwraca odpowiednie kody błędów (400, 401, 403, 404, 500)
- [ ] Loguje błędy do konsoli
- [ ] Usuwa wszystkie powiązane rekordy (participants, exclusions, assignments, wishes)

### Etap 5: Dokumentacja

**5.1. Aktualizacja API documentation**

Zaktualizuj plik `.ai/api-plan.md` z nowymi endpointami:
- Dodaj szczegóły PATCH /api/groups/:id
- Dodaj szczegóły DELETE /api/groups/:id
- Dodaj przykłady request/response
- Dodaj kody błędów

**5.2. Aktualizacja CHANGELOG**

Dodaj wpis do CHANGELOG.md (jeśli istnieje):
```markdown
## [Unreleased]

### Added
- PATCH /api/groups/:id - Update group endpoint
- DELETE /api/groups/:id - Delete group endpoint
- GroupService.updateGroup() method
- GroupService.deleteGroup() method

### Security
- Authorization checks for update/delete operations
- Input validation with Zod schemas
```

**5.3. Code comments**

Upewnij się, że:
- Wszystkie metody mają JSDoc comments
- Wszystkie złożone logiki mają inline comments
- Wszystkie error codes są udokumentowane

### Etap 6: Code Review Checklist

Przed mergowaniem sprawdź:

**Funkcjonalność**:
- [ ] PATCH endpoint działa zgodnie ze specyfikacją
- [ ] DELETE endpoint działa zgodnie ze specyfikacją
- [ ] Wszystkie edge cases są obsłużone
- [ ] Walidacja działa poprawnie
- [ ] Autoryzacja działa poprawnie

**Bezpieczeństwo**:
- [ ] Sprawdzanie creator_id przed operacjami
- [ ] Walidacja wszystkich inputów
- [ ] Proper error messages (nie ujawniają sensitive data)
- [ ] SQL injection prevention (Supabase)
- [ ] IDOR prevention

**Kod**:
- [ ] Kod jest czytelny i zgodny z coding standards
- [ ] Brak code duplication
- [ ] Proper error handling
- [ ] Logging jest konsekwentny
- [ ] TypeScript types są poprawne
- [ ] Comments są aktualne

**Testy**:
- [ ] Wszystkie testy manualne przechodzą
- [ ] Wszystkie edge cases są przetestowane
- [ ] CASCADE delete działa poprawnie

**Dokumentacja**:
- [ ] API documentation zaktualizowana
- [ ] Code comments dodane
- [ ] CHANGELOG zaktualizowany (jeśli istnieje)

### Etap 7: Future Improvements

**7.1. Authentication**
- [ ] Replace DEFAULT_USER_ID with actual JWT authentication
- [ ] Implement Bearer token validation
- [ ] Add refresh token mechanism

**7.2. Soft Delete**
- [ ] Implement soft delete instead of hard delete
- [ ] Add `deleted_at` field to groups table
- [ ] Filter out deleted groups in queries

**7.3. Audit Log**
- [ ] Log all update/delete operations
- [ ] Track who made changes and when
- [ ] Add audit_log table

**7.4. Optimistic Locking**
- [ ] Add version field to groups table
- [ ] Implement optimistic locking for updates
- [ ] Prevent concurrent modifications

**7.5. Rate Limiting**
- [ ] Add rate limiting middleware
- [ ] Limit update/delete operations per user
- [ ] Prevent abuse

**7.6. Webhooks**
- [ ] Trigger webhooks on group update/delete
- [ ] Allow external integrations
- [ ] Notify participants about changes

**7.7. Batch Operations**
- [ ] Allow batch update of multiple groups
- [ ] Allow batch delete of multiple groups
- [ ] Optimize database queries

---

## Podsumowanie

Ten plan implementacji obejmuje:
- ✅ Dwa nowe endpointy API (PATCH i DELETE)
- ✅ Dwie nowe metody w GroupService
- ✅ Pełną walidację danych wejściowych
- ✅ Autoryzację i uwierzytelnianie
- ✅ Obsługę wszystkich scenariuszy błędów
- ✅ Logging i monitoring
- ✅ Optymalizację wydajności
- ✅ Dokumentację i testy

Implementacja zgodna z:
- Istniejącymi wzorcami w kodzie
- Tech stackiem (Astro, TypeScript, Supabase)
- Coding practices z dokumentacji
- API specification

**Estimated time**: 4-6 godzin dla doświadczonego developera

**Priority**: High (core CRUD functionality)

**Dependencies**: Brak (używa istniejących serwisów i typów)
