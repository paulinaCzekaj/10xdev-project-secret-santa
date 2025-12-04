# Database Schema Plan

**Ostatnia aktualizacja**: 2025-11-17
**Wersja dokumentu**: 1.1.0

## Historia zmian

- **2025-11-17 (v1.1.0)**: Dodano funkcjonalność Elfa - kolumny `elf_for_participant_id` i `elf_accessed_at` w tabeli `participants`
- **2025-11-03 (v1.0.1)**: Dodano kolumny AI w tabeli `wishes` - `ai_generated`, `ai_generation_count`, `ai_last_generated_at`
- **2025-10-09 (v1.0.0)**: Inicjalna wersja schematu bazy danych dla MVP

---

This document describes the comprehensive database schema for the Secret Santa project. It is designed to integrate with Supabase Auth for user authentication while supporting all required functionalities as defined in the product requirements (PRD) and session planning notes.

---

## 1. Tables

### 1.1. users

This table is managed by Supabase Auth

- **id**: BIGSERIAL PRIMARY KEY
- **email**: CITEXT NOT NULL UNIQUE
- **password_hash**: TEXT NOT NULL
- **created_at**: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- **updated_at**: TIMESTAMPTZ NOT NULL DEFAULT NOW()

---

### 1.2. groups

- **id**: BIGSERIAL PRIMARY KEY
- **name**: TEXT NOT NULL
- **budget**: NUMERIC NOT NULL CHECK (budget > 0)
- **end_date**: TIMESTAMPTZ NOT NULL
- **creator_id**: BIGINT NOT NULL  
  _Foreign key referencing `users(id)` with ON DELETE CASCADE_
- **created_at**: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- **updated_at**: TIMESTAMPTZ NOT NULL DEFAULT NOW()

_Indexes_:

- Index on `creator_id` for quick lookup of a user’s groups.

---

### 1.3. participants

This table holds participants of a group. It accommodates both registered and unregistered users.

- **id**: BIGSERIAL PRIMARY KEY
- **group_id**: BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE
- **user_id**: BIGINT REFERENCES users(id) ON DELETE SET NULL
- **name**: TEXT NOT NULL
- **email**: CITEXT
  - Note: For unregistered participants, the email (if provided) should be unique within the same group.
- **access_token**: TEXT NOT NULL DEFAULT gen_random_uuid()::text UNIQUE
  - Unique token for unregistered participants to access their results
- **result_viewed_at**: TIMESTAMPTZ NULL
  - Timestamp when the participant first viewed their draw result
- **elf_for_participant_id**: BIGINT NULL REFERENCES participants(id) ON DELETE SET NULL
  - ID of the participant this user is helping as an elf. NULL if not an elf.
  - *Added in v1.1.0*
- **elf_accessed_at**: TIMESTAMPTZ NULL
  - Timestamp when the elf first accessed the result of the participant they are helping
  - *Added in v1.1.0*
- **created_at**: TIMESTAMPTZ NOT NULL DEFAULT NOW()

_Constraints:_

- A UNIQUE partial index on (`group_id`, `email`) where email is not null
- A CHECK constraint ensuring participant cannot be elf for themselves: `id != elf_for_participant_id OR elf_for_participant_id IS NULL`
- A UNIQUE constraint on (`group_id`, `elf_for_participant_id`) where `elf_for_participant_id` IS NOT NULL to ensure one participant can have max one elf
- UNIQUE constraint on `access_token`

_Indexes:_

- Index on `group_id` for fast lookup of participants within a group
- Index on `user_id` for fast lookup of user's participations
- Index on `access_token` (UNIQUE) for token-based access
- Index on `result_viewed_at` for tracking who viewed results
- Index on `elf_for_participant_id` for elf relationship queries *(v1.1.0)*
- Index on `elf_accessed_at` for tracking elf activity *(v1.1.0)*

---

### 1.4. exclusion_rules

This table records the one-way exclusion rules per group, defining which participant cannot draw which other participant.

- **id**: BIGSERIAL PRIMARY KEY
- **group_id**: BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE
- **blocker_participant_id**: BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE
- **blocked_participant_id**: BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE
- **created_at**: TIMESTAMPTZ NOT NULL DEFAULT NOW()

_Constraints:_

- A UNIQUE constraint on the combination (`group_id`, `blocker_participant_id`, `blocked_participant_id`) to avoid duplicate rules.
- A CHECK constraint to ensure that `blocker_participant_id` is not equal to `blocked_participant_id`.

---

### 1.5. wishes

- **id**: BIGSERIAL PRIMARY KEY
- **participant_id**: BIGINT NOT NULL
  _Foreign key referencing `participants(id)` with ON DELETE CASCADE_
- **wishlist**: TEXT NOT NULL
  _Contains the wish list data; auto-linking for URLs can be handled at the application level._
- **updated_at**: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- **ai_generated**: BOOLEAN DEFAULT FALSE
  _Indicates whether the wishlist was generated using AI assistance_
- **ai_generation_count**: INTEGER DEFAULT 0
  _Tracks the number of AI generations used by this participant (per-group limit: 3 for unregistered, 5 for registered users)_
- **ai_last_generated_at**: TIMESTAMPTZ NULL
  _Timestamp of the last AI generation request_

_Constraints:_

- This table holds the wish list information for each participant. Typically, each participant will have one wish list.
- The `ai_generation_count` field enforces usage limits for AI-generated content (3 for unregistered participants, 5 for registered users).

---

## 2. Relationships

- A **user** can create many **groups** (one-to-many).
  - `groups.creator_id` references `users.id`.

- Each **group** has many **participants** (one-to-many).
  - `participants.group_id` references `groups.id`.

- A **user** may be linked to a **participant** record if the participant is registered (one-to-zero/one).
  - `participants.user_id` references `users.id`.

- A **participant** may be an elf for another **participant** in the same group (self-referential, optional, one-to-one). *(v1.1.0)*
  - `participants.elf_for_participant_id` references `participants.id`.
  - This creates a one-way helper relationship where the elf can view the helped participant's draw result.
  - Constraint: One participant can have maximum one elf assigned.

- Each **group** can have many **exclusion_rules** (one-to-many).
  - `exclusion_rules.group_id` references `groups.id`.

- Each **exclusion_rule** connects two **participants** within the same group (self-referential on participants).

- Each **participant** has zero or one **wishes** record (one-to-zero/one).
  - `wishes.participant_id` references `participants.id`.

---

## 3. Indexes

- Unique index on `users.email` (automatically created by UNIQUE constraint).
- Index on `groups.creator_id` for performance on queries filtering by group creator.
- Index on `groups.end_date` for queries filtering on upcoming or past groups.
- Index on `participants.group_id` for fast lookup of participants within a group.
- Index on `participants.user_id` for fast lookup of user's participations.
- Index on `participants.access_token` (UNIQUE) for token-based access by unregistered users.
- Index on `participants.result_viewed_at` for tracking who has viewed their results.
- Index on `participants.elf_for_participant_id` for elf relationship queries *(v1.1.0)*
- Index on `participants.elf_accessed_at` for tracking elf activity *(v1.1.0)*
- Index on `exclusion_rules.group_id` to speed up exclusion rule queries per group.
- Index on `wishes.participant_id` for fast lookup of wishlists by participant.
- Index on `wishes.ai_generation_count` for queries checking AI generation limits *(v1.0.1)*

_Additional Recommendations:_

- Create a partial unique index on `participants` to enforce uniqueness of `email` within a group where email is provided:
  ```sql
  CREATE UNIQUE INDEX unique_participant_email_per_group ON participants(group_id, email)
  WHERE email IS NOT NULL;
  ```

- Create a unique partial index on `participants` to enforce one elf per participant *(v1.1.0)*:
  ```sql
  CREATE UNIQUE INDEX unique_elf_assignment_per_group ON participants(group_id, elf_for_participant_id)
  WHERE elf_for_participant_id IS NOT NULL;
  ```

---

## 4. PostgreSQL Policies and Security

_Row Level Security (RLS):_

- Enable RLS on the tables that require data access restrictions (e.g., `groups`, `participants`):
  ```sql
  ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
  ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
  ```
- Define RLS policies to allow access only to the creators (or permitted users) of a group and to participants within that group.

_Deletion Rules:_

- Foreign keys are set with appropriate `ON DELETE` actions to preserve referential integrity:
  - Groups: `creator_id` has `ON DELETE RESTRICT`
  - Participants: `group_id` has `ON DELETE CASCADE`; `user_id` has `ON DELETE SET NULL`
  - Exclusion rules: cascade deletion when the parent group or participant is removed.

---

## 5. Additional Design Considerations

- **Timestamps Management**:  
  Consider using triggers to update the `updated_at` columns on modification.

- **Transactions and Data Integrity**:  
  Ensure that multi-table operations are wrapped in transactions. Use cascading deletes (ON DELETE CASCADE) where appropriate to maintain referential integrity.

- **Scalability**:  
  The schema is normalized (approximately in 3NF) for clarity and integrity. Advanced features (e.g., table partitioning, archiving) are deferred for future versions beyond the MVP.

- **Supabase Integration**:  
  The `users` table is designed to integrate naturally with Supabase Auth, with additional application-level checks enforced via RLS.

---

## 6. Database Migrations for Version 1.1 (AI Features)

To support the AI-generated wishlist functionality, the following migration should be applied to the existing `wishes` table:

```sql
-- Add AI-related columns to wishes table
ALTER TABLE wishes
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_generation_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_last_generated_at TIMESTAMPTZ NULL;

-- Add index for AI generation count queries
CREATE INDEX IF NOT EXISTS wishes_ai_generation_count_idx ON wishes(ai_generation_count);

-- Add comment for documentation
COMMENT ON COLUMN wishes.ai_generated IS 'Indicates whether the wishlist was generated using AI assistance';
COMMENT ON COLUMN wishes.ai_generation_count IS 'Tracks the number of AI generations used by this participant (per-group limit: 3 for unregistered, 5 for registered users)';
COMMENT ON COLUMN wishes.ai_last_generated_at IS 'Timestamp of the last AI generation request';
```

**Migration Notes:**

- The migration is safe to run on existing data as all new columns have default values.
- Existing wishlists will have `ai_generated = FALSE` and `ai_generation_count = 0` by default.
- The `ai_last_generated_at` column will be `NULL` for existing records until the user generates content using AI.
- No data loss will occur during this migration.

---

## 7. Database Migrations for Version 1.1 (Elf Features)

**Migration File**: `20251117000001_add_elf_functionality.sql`
**Applied**: 2025-11-17

To support the Elf (Helper) functionality, the following migration should be applied to the existing `participants` table:

```sql
-- Migration: Add Elf functionality to Secret Santa
-- Version: 1.1.0
-- Date: 2025-11-17
-- Description: Adds elf_for_participant_id column to participants table
--              for assigning helper role and tracking elf access

BEGIN;

-- Add elf_for_participant_id column to participants table
ALTER TABLE participants
ADD COLUMN elf_for_participant_id BIGINT NULL;

-- Add foreign key constraint
ALTER TABLE participants
ADD CONSTRAINT fk_elf_for_participant
FOREIGN KEY (elf_for_participant_id)
REFERENCES participants(id)
ON DELETE SET NULL;

-- Add check constraint: participant cannot be elf for themselves
ALTER TABLE participants
ADD CONSTRAINT different_elf_participant
CHECK (
  id != elf_for_participant_id
  OR elf_for_participant_id IS NULL
);

-- Add unique constraint: one participant can have max one elf per group
CREATE UNIQUE INDEX unique_elf_assignment_per_group
ON participants(group_id, elf_for_participant_id)
WHERE elf_for_participant_id IS NOT NULL;

-- Add index for efficient elf lookups
CREATE INDEX participants_elf_for_idx
ON participants(elf_for_participant_id);

-- Add column for tracking when elf accessed the result
ALTER TABLE participants
ADD COLUMN elf_accessed_at TIMESTAMPTZ NULL;

-- Add index for elf access tracking
CREATE INDEX participants_elf_accessed_at_idx
ON participants(elf_accessed_at);

-- Add comments explaining the elf relationship
COMMENT ON COLUMN participants.elf_for_participant_id IS
  'ID of the participant this user is helping as an elf. NULL if not an elf.';

COMMENT ON COLUMN participants.elf_accessed_at IS
  'Timestamp when the elf first accessed the result of the participant they are helping.';

COMMIT;
```

**Migration Notes:**

- The migration is safe to run on existing data as both new columns are nullable and have default `NULL` values.
- Existing participants will have `elf_for_participant_id = NULL` and `elf_accessed_at = NULL` by default (not an elf).
- The foreign key uses `ON DELETE SET NULL` to preserve data integrity if the helped participant is deleted.
- The unique partial index ensures that one participant can have maximum one elf within a group.
- The check constraint prevents circular or self-referential elf assignments.
- No data loss will occur during this migration.

**Elf Functionality Overview:**

- **Purpose**: Allows group creators to assign a "helper" role where one participant can assist another in gift selection.
- **Access**: Elfs with registered accounts can view the full draw result of the participant they're helping.
- **Permissions**: Elfs can edit the wishlist of the participant they're helping (if elf has `user_id`).
- **Exclusions**: The draw algorithm automatically excludes elfs from being drawn by the participant they help (one-way exclusion).
- **Tracking**: Separate tracking of elf access (`elf_accessed_at`) vs participant's own access (`result_viewed_at`).

---

This schema provides a solid foundation that meets both the functional requirements and performance considerations for the Secret Santa application.
