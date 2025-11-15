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

**`Users can view their groups`** (SELECT)
- **Who**: authenticated users
- **Condition**: Users can view groups they created OR groups they participate in
- **Logic**: `creator_id = auth.uid() OR EXISTS (participants where user_id = auth.uid())`

**`Users can create groups`** (INSERT)
- **Who**: authenticated users
- **Condition**: User must be the creator
- **Logic**: `creator_id = auth.uid()`

**`Creators can update their groups`** (UPDATE)
- **Who**: authenticated users
- **Condition**: Only group creators can update their own groups
- **Logic**: `creator_id = auth.uid()`

**`Creators can delete their groups`** (DELETE)
- **Who**: authenticated users
- **Condition**: Only group creators can delete their own groups
- **Logic**: `creator_id = auth.uid()`

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

**Migration File**: `20251115192341_enable_rls_policies.sql`
**Migration Date**: November 15, 2025
**Affected Tables**: groups, participants, exclusion_rules, wishes, assignments

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

| Table | Creator Permissions | Participant Permissions | Service Role Permissions |
|-------|-------------------|----------------------|-------------------------|
| groups | Full CRUD | Read only | None |
| participants | Full CRUD | Read only | None |
| exclusion_rules | Full CRUD | Read only | None |
| wishes | None | CRUD own only | None |
| assignments | None | Read only | Full CRUD |

**Legend:**
- ✅ = Allowed
- ❌ = Not allowed
- Full CRUD = Create, Read, Update, Delete
- Read only = Select operations only
- CRUD own only = Users can only modify their own records
