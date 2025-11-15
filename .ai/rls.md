# Row Level Security (RLS) Policies - Secret Santa Application

## Overview

This document describes the comprehensive Row Level Security (RLS) implementation for the Secret Santa application. RLS ensures that users can only access data they are authorized to see, based on their role and group membership.

## Security Model

- **All tables have RLS enabled**
- **Role-based access control** with different permissions for group creators vs participants
- **Service role restrictions** for sensitive operations like draw results
- **Data integrity validation** in policies to prevent invalid operations

## Tables with RLS

### 1. `groups` table

**RLS Status**: ✅ Enabled

#### Policies:

**`anyone can view groups`** (SELECT)
- **Type**: Permissive
- **Who**: All users (authenticated + anonymous)
- **Condition**: No restrictions
- **Logic**: `using (true)`
- **Rationale**: Application layer controls fine-grained access. Anonymous participants with valid tokens need to view group details.

**`authenticated users can create groups`** (INSERT)
- **Type**: Permissive
- **Who**: authenticated role only
- **Condition**: Permissive - application handles creator_id assignment
- **Logic**: `with check (true)`
- **Rationale**: Any authenticated user can create groups; backend ensures creator_id integrity.

**`creators can update their groups`** (UPDATE)
- **Type**: Restrictive
- **Who**: authenticated role only
- **Condition**: Only group creators
- **Logic**: `using (creator_id = auth.uid()) with check (creator_id = auth.uid())`
- **Rationale**: Only owners can modify group settings (name, budget, end_date).

**`creators can delete their groups`** (DELETE)
- **Type**: Restrictive
- **Who**: authenticated role only
- **Condition**: Only group creators
- **Logic**: `using (creator_id = auth.uid())`
- **Rationale**: Destructive operation restricted to owner. Cascading deletes handle related data.

#### Security Model: Why SELECT is Permissive

**Design Decision**: The groups table uses a permissive SELECT policy (`using (true)`) instead of restrictive access control.

**Rationale**:
1. **Unregistered Participant Support**: Anonymous users with valid participant tokens need to view group details (budget, end_date, name) without authentication
2. **Application Layer Security**: Fine-grained access control is implemented in API endpoints, not at database level
3. **Token-Based Access**: Access tokens validate participant membership before serving group data
4. **No Sensitive Data**: Groups table contains no sensitive information that requires database-level restrictions
5. **Performance**: Eliminates complex RLS joins for better query performance

**Security Measures**:
- API endpoints validate token ownership before returning data
- Participant-specific data (assignments, wishlists) protected by restrictive RLS on other tables
- Write operations (INSERT/UPDATE/DELETE) remain restrictive - only creators can modify

**Trade-offs Considered**:
- ✅ Simplifies architecture for token-based unregistered users
- ✅ Better performance (no complex EXISTS queries on SELECT)
- ⚠️ Groups metadata visible to all (acceptable - no PII in groups table)
- ✅ Strong write protection maintained

---

### 2. `participants` table

**RLS Status**: ✅ Enabled

#### Policies:

**`Users can view participants in their groups`** (SELECT)
- **Who**: authenticated users
- **Condition**: Users can view participants in groups they belong to (including themselves)
- **Logic**: `user_id = auth.uid() OR EXISTS (other participants in same group)`

**`Group creators can add participants`** (INSERT)
- **Who**: authenticated users
- **Condition**: Only group creators can add participants to their groups
- **Logic**: `EXISTS (groups where creator_id = auth.uid())`

**`Group creators can update participants`** (UPDATE)
- **Who**: authenticated users
- **Condition**: Only group creators can update participants in their groups
- **Logic**: `EXISTS (groups where creator_id = auth.uid())`

**`Group creators can delete participants`** (DELETE)
- **Who**: authenticated users
- **Condition**: Only group creators can remove participants from their groups
- **Logic**: `EXISTS (groups where creator_id = auth.uid())`

---

### 3. `exclusion_rules` table

**RLS Status**: ✅ Enabled

#### Policies:

**`Users can view exclusion rules in their groups`** (SELECT)
- **Who**: authenticated users
- **Condition**: Users can view exclusion rules in groups they participate in
- **Logic**: `EXISTS (participants where user_id = auth.uid() AND group_id matches)`

**`Group creators can create exclusion rules`** (INSERT)
- **Who**: authenticated users
- **Condition**: Only group creators can create exclusion rules for their groups
- **Logic**: `EXISTS (groups where creator_id = auth.uid())`

**`Group creators can update exclusion rules`** (UPDATE)
- **Who**: authenticated users
- **Condition**: Only group creators can update exclusion rules in their groups
- **Logic**: `EXISTS (groups where creator_id = auth.uid())`

**`Group creators can delete exclusion rules`** (DELETE)
- **Who**: authenticated users
- **Condition**: Only group creators can delete exclusion rules from their groups
- **Logic**: `EXISTS (groups where creator_id = auth.uid())`

---

### 4. `wishes` table

**RLS Status**: ✅ Enabled

#### Policies:

**`Users can view wishes in their groups`** (SELECT)
- **Who**: authenticated users
- **Condition**: Users can view wishes from participants in the same groups
- **Logic**: `EXISTS (participants -> groups where user participates)`

**`Users can create their own wishes`** (INSERT)
- **Who**: authenticated users
- **Condition**: Users can only create wishes for themselves
- **Logic**: `EXISTS (participants where participant belongs to user)`

**`Users can update their own wishes`** (UPDATE)
- **Who**: authenticated users
- **Condition**: Users can only update their own wishes
- **Logic**: `EXISTS (participants where participant belongs to user)`

**`Users can delete their own wishes`** (DELETE)
- **Who**: authenticated users
- **Condition**: Users can only delete their own wishes
- **Logic**: `EXISTS (participants where participant belongs to user)`

---

### 5. `assignments` table

**RLS Status**: ✅ Enabled

#### Policies:

**`Users can view assignments for their groups`** (SELECT)
- **Who**: authenticated users
- **Condition**: Users can view draw results for groups they participate in
- **Logic**: `EXISTS (participants where user_id = auth.uid())`

**`Service role can create assignments`** (INSERT)
- **Who**: service_role only
- **Condition**: Only backend can create draw results with validation:
  - Giver and receiver must belong to the same group
  - Giver and receiver must be different participants
  - No duplicate assignments for the same giver
- **Logic**: Complex validation queries

**`Service role can update assignments`** (UPDATE)
- **Who**: service_role only
- **Condition**: Only backend can update draw results with validation
- **Logic**: Same validation as INSERT but excluding current record

**`Service role can delete assignments`** (DELETE)
- **Who**: service_role only
- **Condition**: Only backend can delete draw results
- **Logic**: No additional conditions

---

## Migration Details

**Migration File**: `20251115222409_enable_rls_on_groups.sql`
**Migration Date**: November 15, 2025
**Affected Tables**: groups (currently), participants, exclusion_rules, wishes, assignments (future)
**Status**: ✅ Active and enforced

### Key Security Features:

1. **Defense in Depth**: Multiple layers of access control
2. **Principle of Least Privilege**: Users only see what they need
3. **Data Integrity**: Policies prevent invalid data operations
4. **Service Role Protection**: Sensitive operations restricted to backend
5. **Group Isolation**: Users cannot access data from other groups

### Testing Recommendations:

- Test all policies with different user roles
- Verify that users cannot access data from other groups
- Confirm service role operations work correctly
- Test edge cases like group deletion, participant removal

### Maintenance Notes:

- All policies use `auth.uid()` for user identification
- Group membership is validated through participant records
- Service role is used for automated operations
- Policies include both `USING` and `WITH CHECK` clauses where appropriate

---

## Quick Reference

| Table | Creator Permissions | Participant Permissions | Anonymous Users | Service Role |
|-------|-------------------|------------------------|-----------------|--------------|
| groups | Full CRUD | Read only | Read only | None |
| participants | Full CRUD | Read only | None | None |
| exclusion_rules | Full CRUD | Read only | None | None |
| wishes | None | CRUD own only | None | None |
| assignments | None | Read only | None | Full CRUD |

**Legend:**
- ✅ = Allowed
- ❌ = Not allowed
- Full CRUD = Create, Read, Update, Delete
- Read only = Select operations only
- CRUD own only = Users can only modify their own records
