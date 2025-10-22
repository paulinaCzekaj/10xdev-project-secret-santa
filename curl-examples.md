# cURL Examples for PATCH & DELETE Endpoints

## Prerequisites

1. Start the dev server: `npm run dev`
2. Create a test group first to get a GROUP_ID

## Step 0: Create a Test Group

```bash
curl -X POST http://localhost:4321/api/groups \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Secret Santa 2025",
    "budget": 100,
    "end_date": "2025-12-25T23:59:59Z"
  }' | jq '.'
```

**Copy the `id` from the response and use it as GROUP_ID below!**

---

## PATCH /api/groups/:id Tests

### ✅ Test 1: Update group name only

```bash
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Secret Santa 2025"
  }' | jq '.'
```

**Expected:** HTTP 200 + Updated GroupDTO with new name

---

### ✅ Test 2: Update budget only

```bash
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{
    "budget": 150
  }' | jq '.'
```

**Expected:** HTTP 200 + Updated GroupDTO with new budget

---

### ✅ Test 3: Update multiple fields

```bash
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Christmas 2025",
    "budget": 200,
    "end_date": "2026-01-01T23:59:59Z"
  }' | jq '.'
```

**Expected:** HTTP 200 + Updated GroupDTO with all new values

---

### ❌ Test 4: Empty body (should fail)

```bash
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'
```

**Expected:** HTTP 400 + Error: "At least one field must be provided for update"

---

### ❌ Test 5: Negative budget (should fail)

```bash
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{
    "budget": -50
  }' | jq '.'
```

**Expected:** HTTP 400 + Error: "Budget must be greater than 0"

---

### ❌ Test 6: Empty name (should fail)

```bash
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": ""
  }' | jq '.'
```

**Expected:** HTTP 400 + Error: "Name cannot be empty"

---

### ❌ Test 7: Invalid date format (should fail)

```bash
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{
    "end_date": "2025-12-31"
  }' | jq '.'
```

**Expected:** HTTP 400 + Error: "Invalid date format. Use ISO 8601 format"

---

### ❌ Test 8: Group not found (should fail)

```bash
curl -X PATCH http://localhost:4321/api/groups/99999 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test"
  }' | jq '.'
```

**Expected:** HTTP 404 + Error: "Group not found"

---

### ❌ Test 9: Invalid group ID format (should fail)

```bash
curl -X PATCH http://localhost:4321/api/groups/abc \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test"
  }' | jq '.'
```

**Expected:** HTTP 400 + Error: "Group ID must be a positive integer"

---

## DELETE /api/groups/:id Tests

### ✅ Test 10: Successfully delete a group

```bash
curl -X DELETE http://localhost:4321/api/groups/1 -v
```

**Expected:** HTTP 204 No Content (empty response body)

---

### ❌ Test 11: Delete non-existent group (should fail)

```bash
curl -X DELETE http://localhost:4321/api/groups/99999 | jq '.'
```

**Expected:** HTTP 404 + Error: "Group not found"

---

### ❌ Test 12: Invalid group ID format (should fail)

```bash
curl -X DELETE http://localhost:4321/api/groups/xyz | jq '.'
```

**Expected:** HTTP 400 + Error: "Group ID must be a positive integer"

---

### ✅ Test 13: Verify CASCADE delete

First, create a group with participants:

```bash
# 1. Create group
GROUP_ID=$(curl -s -X POST http://localhost:4321/api/groups \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "budget": 100,
    "end_date": "2025-12-25T23:59:59Z"
  }' | jq -r '.id')

echo "Created group with ID: $GROUP_ID"

# 2. Get group details (should have 1 participant - the creator)
curl -X GET http://localhost:4321/api/groups/$GROUP_ID | jq '.'

# 3. Delete the group
curl -X DELETE http://localhost:4321/api/groups/$GROUP_ID -v

# 4. Try to get the group again (should return 404)
curl -X GET http://localhost:4321/api/groups/$GROUP_ID | jq '.'
```

**Expected:**

- Step 1: Group created with ID
- Step 2: HTTP 200 with group details + participants
- Step 3: HTTP 204 No Content
- Step 4: HTTP 404 (group deleted successfully)

---

## Quick Test Commands

### Quick PATCH test (replace GROUP_ID)

```bash
curl -X PATCH http://localhost:4321/api/groups/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}' | jq '.'
```

### Quick DELETE test (replace GROUP_ID)

```bash
curl -X DELETE http://localhost:4321/api/groups/1 -v
```

---

## Notes

- Replace `1` with actual GROUP_ID from your database
- Use `| jq '.'` to pretty-print JSON responses
- Use `-v` flag to see verbose output including HTTP status codes
- Make sure jq is installed: `sudo apt-get install jq` (Ubuntu/Debian)
