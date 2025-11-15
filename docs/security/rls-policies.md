# Row-Level Security (RLS) Policies

## Overview

This document describes the Row-Level Security implementation for the Secret Santa application.

## Security Architecture

### Defense in Depth Approach

The application uses a layered security model:

1. **Database Layer** (RLS Policies) - Restrictive write operations, permissive read operations
2. **API Layer** - Token validation and access control
3. **Application Layer** - Business logic enforcement

### RLS Policy Types

- **Permissive Policies**: Allow broad access, rely on application layer for fine-grained control
- **Restrictive Policies**: Enforce strict database-level access control

## Groups Table Policies

### SELECT Policy: "anyone can view groups"

**Type**: Permissive
**Access**: All users (authenticated + anonymous)
**Condition**: `using (true)`

**Why Permissive?**

- Supports unregistered participants with access tokens
- No sensitive data in groups table (only name, budget, end_date)
- Application layer validates token ownership before serving data

**Security Notes:**

- API endpoints validate participant membership via tokens
- Sensitive data (assignments, wishlists) protected on other tables
- Write operations remain restrictive

### INSERT Policy: "authenticated users can create groups"

**Type**: Permissive
**Access**: Authenticated role only
**Condition**: `with check (true)`

**Why Permissive?**

- Backend handles creator_id assignment
- Simplifies group creation flow
- Authentication requirement prevents spam

### UPDATE Policy: "creators can update their groups"

**Type**: Restrictive
**Access**: Authenticated role, group creators only
**Condition**: `using (creator_id = auth.uid()) with check (creator_id = auth.uid())`

**Protected Fields:**

- name
- budget
- end_date

### DELETE Policy: "creators can delete their groups"

**Type**: Restrictive
**Access**: Authenticated role, group creators only
**Condition**: `using (creator_id = auth.uid())`

**Cascade Behavior:**

- Deleting a group cascades to: participants, exclusion_rules, assignments, wishes

## Migration History

| Migration File                            | Date       | Status    |
| ----------------------------------------- | ---------- | --------- |
| `20251115222409_enable_rls_on_groups.sql` | 2025-11-15 | ✅ Active |

## Testing RLS Policies

### Test Coverage

- ✅ Anonymous users can SELECT groups (via application layer)
- ✅ Authenticated users can INSERT groups
- ✅ Only creators can UPDATE groups
- ✅ Only creators can DELETE groups
- ✅ Non-creators cannot UPDATE/DELETE others' groups

## Security Considerations

### Known Trade-offs

1. **Permissive SELECT**: Groups metadata visible to all
   - **Acceptable**: No PII in groups table
   - **Mitigation**: Sensitive data protected on other tables

2. **Application Layer Dependency**: Access control relies on API validation
   - **Acceptable**: Standard pattern for token-based access
   - **Mitigation**: Comprehensive API endpoint testing

### Future Enhancements

- Monitoring of unauthorized access attempts
- Rate limiting on group creation
- Audit logging for group modifications

## Implementation Details

### SQL Policies

```sql
-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- SELECT: Permissive for all users
CREATE POLICY "anyone can view groups"
  ON public.groups
  FOR SELECT
  USING (true);

-- INSERT: Permissive for authenticated users
CREATE POLICY "authenticated users can create groups"
  ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Restrictive - only group creator
CREATE POLICY "creators can update their groups"
  ON public.groups
  FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- DELETE: Restrictive - only group creator
CREATE POLICY "creators can delete their groups"
  ON public.groups
  FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());
```

### API Layer Validation

When implementing API endpoints that query groups:

1. **Always validate participant tokens** before serving data
2. **Never rely solely on RLS** for access control to groups
3. **Implement additional authorization checks** in API handlers
4. **Log unauthorized access attempts** for security monitoring

### Example: Token Validation Pattern

```typescript
// ❌ WRONG: Relying only on RLS
const { data: group } = await supabase.from("groups").select("*").eq("id", groupId).single();

// ✅ CORRECT: Validate token ownership first
const participant = await validateParticipantToken(token);
if (participant.group_id !== groupId) {
  throw new Error("FORBIDDEN");
}
const { data: group } = await supabase.from("groups").select("*").eq("id", groupId).single();
```

## Related Documentation

- [API Authorization Examples (cURL)](../api/curl-examples.md)
- [API Authorization Guide (Postman)](../api/postman-guide.md)
- [Testing Guide](../testing/guide.md)
- [Cloudflare Deployment](../deployment/cloudflare-deployment.md)

---

**Last Updated**: 2025-11-16
**Migration File**: `supabase/migrations/20251115222409_enable_rls_on_groups.sql`
