# API Endpoint Implementation Plan: Add Exclusion Rule

## 1. Endpoint Overview

The **Add Exclusion Rule** endpoint allows group creators to define one-way exclusion rules for Secret Santa draws. An exclusion rule specifies that a particular participant (the "blocker") cannot be assigned to give a gift to another specific participant (the "blocked"). This is useful for scenarios like preventing spouses from drawing each other or avoiding conflicts of interest.

**Key Characteristics:**

- **Purpose**: Create a one-way exclusion rule within a Secret Santa group
- **Authorization Model**: Only the group creator can add exclusion rules
- **Timing Constraint**: Rules can only be added before the draw is executed
- **Business Rule**: A participant cannot be excluded from drawing themselves (enforced at validation level)
- **Uniqueness**: Duplicate rules are not allowed (same blocker and blocked pair)

## 2. Request Details

### HTTP Method

`POST`

### URL Structure

```
/api/groups/:groupId/exclusions
```

**Path Parameters:**

- `groupId` (number, required): The unique identifier of the Secret Santa group
  - Must be a positive integer
  - Group must exist in the database

### Headers

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Note**: In the current implementation, authentication uses a placeholder (`DEFAULT_USER_ID`) until Supabase Auth is fully integrated.

### Request Body

```json
{
  "blocker_participant_id": 1,
  "blocked_participant_id": 2
}
```

**Request Body Schema:**

| Field                    | Type   | Required | Constraints      | Description                                                   |
| ------------------------ | ------ | -------- | ---------------- | ------------------------------------------------------------- |
| `blocker_participant_id` | number | Yes      | Positive integer | ID of the participant who cannot draw the blocked participant |
| `blocked_participant_id` | number | Yes      | Positive integer | ID of the participant who cannot be drawn by the blocker      |

**Validation Rules:**

1. Both IDs must be positive integers
2. `blocker_participant_id` must NOT equal `blocked_participant_id`
3. Both participants must exist in the database
4. Both participants must belong to the specified group
5. The rule must not already exist (no duplicates)
6. The group's draw must not have been completed yet

## 3. Types Used

### Command Model (Input)

```typescript
// From src/types.ts lines 152-155
export interface CreateExclusionRuleCommand {
  blocker_participant_id: number;
  blocked_participant_id: number;
}
```

### Response DTO (Output)

```typescript
// From src/types.ts lines 159-160
export type ExclusionRuleDTO = Tables<"exclusion_rules">;

// Database structure (from database.types.ts):
{
  id: number; // Auto-generated
  group_id: number; // Inherited from path parameter
  blocker_participant_id: number; // From request body
  blocked_participant_id: number; // From request body
  created_at: string; // ISO 8601 timestamp
}
```

### Error Response

```typescript
// From src/types.ts lines 20-26
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### Insert Type (Database Operation)

```typescript
// From src/types.ts line 342
export type ExclusionRuleInsert = TablesInsert<"exclusion_rules">;

// Structure:
{
  group_id: number;                // Required
  blocker_participant_id: number;  // Required
  blocked_participant_id: number;  // Required
  created_at?: string;             // Optional (defaults to NOW())
  id?: number;                     // Optional (auto-generated)
}
```

## 4. Response Details

### Success Response (201 Created)

```json
{
  "id": 1,
  "group_id": 1,
  "blocker_participant_id": 1,
  "blocked_participant_id": 2,
  "created_at": "2025-10-09T10:00:00Z"
}
```

**Headers:**

```
Content-Type: application/json
Cache-Control: no-cache, no-store, must-revalidate
```

**Status Code**: `201 Created`

- Indicates the exclusion rule was successfully created
- Returns the complete exclusion rule object including the generated ID

### Error Responses

#### 400 Bad Request

**Scenarios:**

1. Invalid data types (non-numeric IDs)
2. Same participant for blocker and blocked
3. Draw already completed
4. Duplicate rule exists
5. Participants don't belong to the specified group

**Example Responses:**

```json
// Same participant
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Blocker and blocked participants cannot be the same",
    "details": {
      "blocker_participant_id": 1,
      "blocked_participant_id": 1
    }
  }
}

// Draw completed
{
  "error": {
    "code": "DRAW_COMPLETED",
    "message": "Cannot add exclusion rules after draw has been completed"
  }
}

// Duplicate rule
{
  "error": {
    "code": "DUPLICATE_RULE",
    "message": "This exclusion rule already exists"
  }
}

// Participants not in group
{
  "error": {
    "code": "INVALID_PARTICIPANTS",
    "message": "One or both participants do not belong to this group"
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

**Scenario**: Missing or invalid Bearer token

#### 403 Forbidden

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the group creator can add exclusion rules"
  }
}
```

**Scenario**: Authenticated user is not the group creator

#### 404 Not Found

```json
{
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "Group not found"
  }
}
```

```json
{
  "error": {
    "code": "PARTICIPANT_NOT_FOUND",
    "message": "One or both participants not found"
  }
}
```

**Scenarios**:

- Group with specified ID doesn't exist
- One or both participants don't exist

#### 422 Unprocessable Entity

```json
{
  "error": {
    "code": "MISSING_FIELD",
    "message": "blocker_participant_id is required",
    "details": {
      "field": "blocker_participant_id",
      "value": null
    }
  }
}
```

**Scenario**: Missing required fields in request body

#### 500 Internal Server Error

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to create exclusion rule. Please try again later."
  }
}
```

**Scenario**: Unexpected database or server errors

## 5. Data Flow

### Step-by-Step Flow

```
1. Client Request
   ↓
2. API Route Handler (src/pages/api/groups/[groupId]/exclusions.ts)
   │
   ├─→ Validate path parameter (groupId)
   │   └─→ Zod: GroupIdParamSchema
   │
   ├─→ Authenticate user
   │   └─→ Extract userId from Bearer token (currently DEFAULT_USER_ID)
   │
   ├─→ Parse request body
   │   └─→ JSON.parse with error handling
   │
   ├─→ Validate request body
   │   └─→ Zod: CreateExclusionRuleSchema
   │
   └─→ Call ExclusionRuleService.createExclusionRule(groupId, userId, command)
       ↓
3. Service Layer (src/lib/services/exclusion-rule.service.ts)
   │
   ├─→ [Guard] Validate group exists
   │   └─→ Query: SELECT * FROM groups WHERE id = :groupId
   │   └─→ If not found: throw "GROUP_NOT_FOUND"
   │
   ├─→ [Guard] Check user is creator
   │   └─→ Compare group.creator_id === userId
   │   └─→ If not: throw "FORBIDDEN"
   │
   ├─→ [Guard] Check draw not completed
   │   └─→ Query: SELECT id FROM assignments WHERE group_id = :groupId LIMIT 1
   │   └─→ If exists: throw "DRAW_COMPLETED"
   │
   ├─→ [Guard] Validate participants are different
   │   └─→ Compare blocker_participant_id !== blocked_participant_id
   │   └─→ If same: throw "SAME_PARTICIPANT"
   │
   ├─→ [Guard] Validate participants exist and belong to group
   │   └─→ Query: SELECT id FROM participants WHERE id IN (:blocker, :blocked) AND group_id = :groupId
   │   └─→ If count !== 2: throw "INVALID_PARTICIPANTS"
   │
   ├─→ [Guard] Check for duplicate rule
   │   └─→ Query: SELECT id FROM exclusion_rules WHERE group_id = :groupId AND blocker_participant_id = :blocker AND blocked_participant_id = :blocked
   │   └─→ If exists: throw "DUPLICATE_RULE"
   │
   └─→ Create exclusion rule
       └─→ INSERT INTO exclusion_rules (group_id, blocker_participant_id, blocked_participant_id)
       └─→ Return created ExclusionRuleDTO
       ↓
4. API Route Handler (continued)
   │
   └─→ Return 201 response with created rule
       ↓
5. Client receives response
```

### Database Interactions

**Tables Accessed:**

1. `groups` - Validate existence and check creator
2. `assignments` - Check if draw completed
3. `participants` - Validate participant existence and group membership
4. `exclusion_rules` - Check duplicates and insert new rule

**Query Patterns:**

- Single row lookups: `.single()` for groups
- Existence checks: `.maybeSingle()` for assignments and duplicate rules
- Multiple row validation: `.in()` for participant validation
- Insert operations: `.insert().select().single()` for atomic creation

## 6. Security Considerations

### Authentication

- **Current Implementation**: Uses `DEFAULT_USER_ID` placeholder
- **Production**: Will use Bearer token from `Authorization` header
- **Validation**: Check token exists and is valid
- **Error Handling**: Return 401 if missing or invalid

### Authorization

- **Group Creator Check**: Verify `group.creator_id === userId`
- **Rationale**: Only group creators should manage exclusion rules
- **Error Handling**: Return 403 if user is not creator

### Input Validation

- **Zod Schemas**: Validate all inputs at API route level
- **Type Safety**: TypeScript ensures type correctness
- **Sanitization**: Zod `.trim()` for string inputs (if added)
- **Constraints**:
  - Positive integers for all IDs
  - Non-empty required fields

### Business Logic Validation

- **Group Membership**: Ensure participants belong to the specified group
- **Temporal Constraints**: Prevent modifications after draw completion
- **Logical Constraints**: Prevent self-exclusions and duplicate rules
- **Error Handling**: Return appropriate 400 status codes with clear messages

### SQL Injection Prevention

- **Supabase SDK**: Uses parameterized queries automatically
- **No Raw SQL**: All queries use Supabase query builder
- **Type Safety**: TypeScript prevents type-related SQL issues

### Data Integrity

- **Database Constraints**:
  - UNIQUE constraint on (group_id, blocker_participant_id, blocked_participant_id)
  - CHECK constraint: blocker_participant_id ≠ blocked_participant_id
  - Foreign key constraints with CASCADE delete
- **Application-Level Validation**: Duplicate checks before insert
- **Transaction Safety**: Supabase handles transactions internally

## 7. Error Handling

### Error Classification

#### Client Errors (4xx)

**400 Bad Request** - Invalid input or business rule violations

```typescript
Scenarios:
- Invalid data types
- Same participant for blocker and blocked
- Draw already completed
- Duplicate rule exists
- Participants not in group
- Invalid JSON in request body

Handling Strategy:
- Validate with Zod at API layer
- Check business rules in service layer
- Return descriptive error messages with details
```

**401 Unauthorized** - Authentication failures

```typescript
Scenarios:
- Missing Bearer token
- Invalid or expired token

Handling Strategy:
- Check authentication at API layer
- Return generic error message (security best practice)
```

**403 Forbidden** - Authorization failures

```typescript
Scenarios:
- User is not the group creator

Handling Strategy:
- Check authorization in service layer
- Return clear error indicating insufficient permissions
```

**404 Not Found** - Resource not found

```typescript
Scenarios:
- Group doesn't exist
- One or both participants don't exist

Handling Strategy:
- Check existence in service layer
- Return specific error for missing resource
```

**422 Unprocessable Entity** - Missing required fields

```typescript
Scenarios:
- blocker_participant_id not provided
- blocked_participant_id not provided

Handling Strategy:
- Validate with Zod at API layer
- Return field-specific error with details
```

#### Server Errors (5xx)

**500 Internal Server Error** - Unexpected errors

```typescript
Scenarios:
- Database connection failures
- Unexpected exceptions
- Data corruption

Handling Strategy:
- Log detailed error information
- Return generic user-friendly message
- Never expose internal details to client
```

### Error Response Format

All errors follow the `ApiErrorResponse` type:

```typescript
{
  error: {
    code: string;        // Machine-readable error code
    message: string;     // Human-readable error message
    details?: {          // Optional additional context
      field?: string;    // Problematic field name
      value?: unknown;   // Problematic value (sanitized)
    }
  }
}
```

### Error Handling Pattern

```typescript
try {
  // Main logic
} catch (error) {
  if (error instanceof Error) {
    // Handle known service errors
    if (error.message === "GROUP_NOT_FOUND") {
      return new Response(
        JSON.stringify({
          error: {
            code: "GROUP_NOT_FOUND",
            message: "Group not found",
          },
        }),
        { status: 404 }
      );
    }
    // ... other error cases
  }

  // Log unexpected errors
  console.error("[POST /api/groups/:groupId/exclusions] Error:", error);

  // Return generic 500 error
  return new Response(
    JSON.stringify({
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to create exclusion rule. Please try again later.",
      },
    }),
    { status: 500 }
  );
}
```

## 8. Performance Considerations

### Query Optimization

**Batch Validation Queries:**

```typescript
// Instead of 2 separate queries for each participant
const { data: participants } = await supabase
  .from("participants")
  .select("id")
  .in("id", [blocker_participant_id, blocked_participant_id])
  .eq("group_id", groupId);

// Validate count === 2 (both exist and belong to group)
```

**Index Utilization:**

- `groups.id` - Primary key index
- `groups.creator_id` - Indexed for quick creator lookups
- `participants.group_id` - Indexed for group membership queries
- `exclusion_rules (group_id, blocker_participant_id, blocked_participant_id)` - UNIQUE index for duplicate checks

**Limit Query Results:**

```typescript
// For existence checks, use LIMIT 1
.limit(1).maybeSingle()
```

### Caching Strategy

**Not Applicable for POST Endpoints:**

- POST requests should never be cached
- Response includes `Cache-Control: no-cache, no-store, must-revalidate` header

**Future Optimization for GET Endpoints:**

- Cache group metadata (creator_id, is_drawn)
- Invalidate cache on exclusion rule creation
- Short TTL (5-10 minutes) for participant lists

### Scalability Considerations

**Current Implementation:**

- Single database transaction per request
- O(1) complexity for all validations (indexed lookups)
- No N+1 query problems

**Potential Bottlenecks:**

- High concurrent writes to same group (rare in practice)
- Database connection pool exhaustion under load

**Mitigation Strategies:**

- Database-level UNIQUE constraint prevents race conditions
- Supabase handles connection pooling automatically
- Rate limiting at API gateway level (future)

### Monitoring Recommendations

**Key Metrics:**

1. Response time (target: < 200ms)
2. Error rate by status code
3. Request volume per group
4. Database query duration

**Logging:**

- All validation failures (debug level)
- Authorization failures (info level)
- Database errors (error level)
- Successful creations (info level)

## 9. Implementation Steps

### Step 1: Create ExclusionRuleService

**File**: `src/lib/services/exclusion-rule.service.ts`

**Tasks:**

1. Import required types from `src/types.ts` and `src/db/supabase.client.ts`
2. Create `ExclusionRuleService` class with constructor accepting `SupabaseClient`
3. Implement `createExclusionRule(groupId, userId, command)` method:
   - Add guard clause for input validation
   - Query and validate group exists
   - Check user is creator
   - Check draw not completed
   - Validate participants are different
   - Validate participants exist and belong to group
   - Check for duplicate rule
   - Insert exclusion rule
   - Return `ExclusionRuleDTO`
4. Add comprehensive logging at each step
5. Use early returns and guard clauses for error handling
6. Throw descriptive errors for each failure scenario

**Code Structure:**

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateExclusionRuleCommand, ExclusionRuleDTO, ExclusionRuleInsert, UserId } from "../../types";

export class ExclusionRuleService {
  constructor(private supabase: SupabaseClient) {}

  async createExclusionRule(
    groupId: number,
    userId: UserId,
    command: CreateExclusionRuleCommand
  ): Promise<ExclusionRuleDTO> {
    // Implementation with guard clauses
  }
}
```

### Step 2: Create API Endpoint

**File**: `src/pages/api/groups/[groupId]/exclusions.ts`

**Tasks:**

1. Set `export const prerender = false` and `export const trailingSlash = "never"`
2. Create Zod schemas:
   - `GroupIdParamSchema`: Validate groupId is positive integer
   - `CreateExclusionRuleSchema`: Validate request body with custom refinement
3. Implement `POST` handler:
   - Validate path parameter
   - Check authentication (currently DEFAULT_USER_ID)
   - Parse request body with error handling
   - Validate request body with Zod
   - Instantiate `ExclusionRuleService` with `locals.supabase`
   - Call service method
   - Return 201 response on success
   - Map service errors to appropriate HTTP responses
4. Add comprehensive error handling for all scenarios
5. Include detailed logging

**Zod Schema Example:**

```typescript
const CreateExclusionRuleSchema = z
  .object({
    blocker_participant_id: z.coerce.number().int().positive(),
    blocked_participant_id: z.coerce.number().int().positive(),
  })
  .refine((data) => data.blocker_participant_id !== data.blocked_participant_id, {
    message: "Blocker and blocked participants cannot be the same",
    path: ["blocked_participant_id"],
  });
```

<!-- ### Step 3: Test the Implementation

**Manual Testing:**
1. Test successful creation:
   ```bash
   curl -X POST http://localhost:4321/api/groups/1/exclusions \
     -H "Authorization: Bearer test-token" \
     -H "Content-Type: application/json" \
     -d '{"blocker_participant_id": 1, "blocked_participant_id": 2}'
   ```
   Expected: 201 with created rule

2. Test validation errors:
   - Same participant: `{"blocker_participant_id": 1, "blocked_participant_id": 1}`
   - Missing field: `{"blocker_participant_id": 1}`
   - Invalid type: `{"blocker_participant_id": "abc", "blocked_participant_id": 2}`

3. Test authorization errors:
   - Non-creator user trying to add rule
   - Missing authentication

4. Test business rule violations:
   - Duplicate rule (submit same rule twice)
   - Draw already completed
   - Participants not in group

**Database Verification:**
```sql
SELECT * FROM exclusion_rules WHERE group_id = 1;
```

**Logging Verification:**
- Check console logs for each step
- Verify error logs include relevant context
- Ensure no sensitive data in logs -->

### Step 4: Integration Verification

**Checklist:**

- [ ] Service compiles without TypeScript errors
- [ ] API endpoint compiles without TypeScript errors
- [ ] All imports resolve correctly
- [ ] Zod schemas validate correctly
- [ ] Service methods return correct types
- [ ] Error responses match ApiErrorResponse type
- [ ] Success response matches ExclusionRuleDTO type
- [ ] HTTP status codes are correct
- [ ] Headers include proper cache control
- [ ] Logging is comprehensive and useful

**Code Quality:**

- [ ] Follow guard clause pattern (early returns)
- [ ] Use const for all variables that don't change
- [ ] Add JSDoc comments for public methods
- [ ] Include error handling for all async operations
- [ ] Use descriptive variable names
- [ ] No magic numbers or strings
- [ ] Consistent code formatting
- [ ] No console.log in production code (use proper logging)

### Step 5: Documentation Updates

**Files to Update:**

- [x] This implementation plan (complete)
- [ ] API documentation (if exists)
- [ ] Postman/Thunder Client collection (if exists)
- [ ] README or developer docs (if needed)

### Step 6: Future Enhancements

**Not in Scope for MVP:**

1. Bulk creation of exclusion rules
2. Bidirectional exclusion rules (A excludes B and B excludes A)
3. Exclusion rule deletion endpoint
4. Exclusion rule update endpoint
5. Exclusion rule listing with filtering
6. Exclusion rule validation before draw (suggest incompatible rules)
7. Email notifications for rule creation
8. Audit log for rule changes
9. Rate limiting per user/group
10. GraphQL API support

**Potential Optimizations:**

1. Add database function `is_group_creator(p_group_id, p_user_id)` similar to `is_user_in_group`
2. Cache group metadata (creator_id, is_drawn) in Redis
3. Batch validation using database functions
4. Add indexes on frequently queried fields
5. Implement soft deletes for audit trail

---

## Appendix A: Database Schema

### exclusion_rules Table

```sql
CREATE TABLE exclusion_rules (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  blocker_participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  blocked_participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT exclusion_rules_unique UNIQUE (group_id, blocker_participant_id, blocked_participant_id),
  CONSTRAINT exclusion_rules_check_different CHECK (blocker_participant_id != blocked_participant_id)
);

CREATE INDEX idx_exclusion_rules_group_id ON exclusion_rules(group_id);
CREATE INDEX idx_exclusion_rules_blocker ON exclusion_rules(blocker_participant_id);
CREATE INDEX idx_exclusion_rules_blocked ON exclusion_rules(blocked_participant_id);
```

**Constraints:**

- `exclusion_rules_unique`: Prevents duplicate rules
- `exclusion_rules_check_different`: Prevents self-exclusions
- Foreign keys: Ensure referential integrity
- ON DELETE CASCADE: Automatically delete rules when group or participants are deleted

## Appendix B: Error Code Reference

| HTTP Status | Error Code              | Scenario                     | User Action                   |
| ----------- | ----------------------- | ---------------------------- | ----------------------------- |
| 400         | `INVALID_INPUT`         | Invalid data types or format | Check request format          |
| 400         | `SAME_PARTICIPANT`      | Blocker and blocked are same | Use different participants    |
| 400         | `DRAW_COMPLETED`        | Draw already executed        | Cannot add rules after draw   |
| 400         | `DUPLICATE_RULE`        | Rule already exists          | No action needed (idempotent) |
| 400         | `INVALID_PARTICIPANTS`  | Participants not in group    | Verify participant IDs        |
| 400         | `INVALID_REQUEST`       | Invalid JSON                 | Fix JSON syntax               |
| 401         | `UNAUTHORIZED`          | Missing/invalid auth token   | Login or refresh token        |
| 403         | `FORBIDDEN`             | User is not creator          | Contact group creator         |
| 404         | `GROUP_NOT_FOUND`       | Group doesn't exist          | Verify group ID               |
| 404         | `PARTICIPANT_NOT_FOUND` | Participant doesn't exist    | Verify participant IDs        |
| 422         | `MISSING_FIELD`         | Required field missing       | Add missing field             |
| 422         | `VALIDATION_ERROR`      | Validation failed            | Check field values            |
| 500         | `DATABASE_ERROR`        | Database error               | Retry or contact support      |

## Appendix C: Testing Scenarios

### Positive Test Cases

1. **Basic Creation**
   - Group exists, user is creator, draw not completed
   - Expected: 201 with valid ExclusionRuleDTO

2. **Multiple Rules**
   - Create multiple different rules for same group
   - Expected: All succeed with 201

3. **Bidirectional Rules**
   - Create A → B, then B → A (two separate rules)
   - Expected: Both succeed

### Negative Test Cases

1. **Validation Errors**
   - Same participant (1 → 1)
   - Negative IDs
   - Non-numeric IDs
   - Missing fields
   - Invalid JSON

2. **Authorization Errors**
   - No auth token
   - Non-creator user
   - User not in database

3. **Business Rule Violations**
   - Group doesn't exist
   - Participants don't exist
   - Participants not in group
   - Draw already completed
   - Duplicate rule

4. **Edge Cases**
   - Group with minimum participants (3)
   - Maximum exclusion rules (near combinatorial limit)
   - Concurrent creation attempts (race conditions)
   - Very large participant IDs

---

_This implementation plan provides comprehensive guidance for implementing the Add Exclusion Rule endpoint. Follow the steps sequentially, validate each step, and ensure all tests pass before considering the implementation complete._
