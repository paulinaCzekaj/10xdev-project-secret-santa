# Database Schema Plan

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
- **budget**:  NUMERIC NOT NULL CHECK (budget > 0)
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
- **created_at**: TIMESTAMPTZ NOT NULL DEFAULT NOW()

*Constraint:*  
- A UNIQUE partial index or constraint is recommended on (`group_id`, `email`) where email is not null.

---

### 1.4. exclusion_rules
This table records the one-way exclusion rules per group, defining which participant cannot draw which other participant.
- **id**: BIGSERIAL PRIMARY KEY  
- **group_id**: BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE  
- **blocker_participant_id**: BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE  
- **blocked_participant_id**: BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE  
- **created_at**: TIMESTAMPTZ NOT NULL DEFAULT NOW()

*Constraints:*
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

*Constraints:*
- This table holds the wish list information for each participant. Typically, each participant will have one wish list.

---

## 2. Relationships

- A **user** can create many **groups** (one-to-many).  
  - `groups.creator_id` references `users.id`.

- Each **group** has many **participants** (one-to-many).  
  - `participants.group_id` references `groups.id`.

- A **user** may be linked to a **participant** record if the participant is registered (one-to-zero/one).  
  - `participants.user_id` references `users.id`.

- Each **group** can have many **exclusion_rules** (one-to-many).  
  - `exclusion_rules.group_id` references `groups.id`.

- Each **exclusion_rule** connects two **participants** within the same group (self-referential on participants).

---

## 3. Indexes

- Unique index on `users.email` (automatically created by UNIQUE constraint).  
- Index on `groups.creator_id` for performance on queries filtering by group creator.  
- Index on `groups.end_date` for queries filtering on upcoming or past groups.  
- Index on `participants.group_id` for fast lookup of participants within a group.  
- Index on `exclusion_rules.group_id` to speed up exclusion rule queries per group.

*Additional Recommendation:*  
- Create a partial unique index on `participants` to enforce uniqueness of `email` within a group where email is provided:
  ```sql
  CREATE UNIQUE INDEX unique_participant_email_per_group ON participants(group_id, email)
  WHERE email IS NOT NULL;
  ```

---

## 4. PostgreSQL Policies and Security

*Row Level Security (RLS):*
- Enable RLS on the tables that require data access restrictions (e.g., `groups`, `participants`):
  ```sql
  ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
  ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
  ```
- Define RLS policies to allow access only to the creators (or permitted users) of a group and to participants within that group.

*Deletion Rules:*
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

This schema provides a solid foundation that meets both the functional requirements and performance considerations for the Secret Santa application.