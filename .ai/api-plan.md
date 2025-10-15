# REST API Plan - Secret Santa

## 1. Resources

The API is built around the following primary resources, each corresponding to database entities:

- **Auth** - User authentication and account management (managed by Supabase Auth)
- **Groups** - Secret Santa groups/events (`groups` table)
- **Participants** - Group members (`participants` table)
- **Exclusions** - Draw exclusion rules (`exclusion_rules` table)
- **Wishlists** - Participant wish lists (`wishes` table)
- **Results** - Draw results and access tokens (derived from participants and assignments)

---

## 2. Endpoints


### 2.2. Groups

#### Create Group
- **Method**: `POST`
- **Path**: `/api/groups`
- **Description**: Create a new Secret Santa group
- **Headers**: `Authorization: Bearer {access_token}`
- **Request Body**:
```json
{
  "name": "Family Christmas 2025",
  "budget": 150,
  "end_date": "2025-12-25T23:59:59Z"
}
```
- **Success Response** (201):
```json
{
  "id": 1,
  "name": "Family Christmas 2025",
  "budget": 150,
  "end_date": "2025-12-25T23:59:59Z",
  "creator_id": 42,
  "is_drawn": false,
  "created_at": "2025-10-09T10:00:00Z",
  "updated_at": "2025-10-09T10:00:00Z",
  "participants_count": 1
}
```
- **Error Responses**:
  - 400: Invalid data (budget <= 0, invalid date format)
  - 401: Unauthorized
  - 422: Missing required fields

#### List User's Groups
- **Method**: `GET`
- **Path**: `/api/groups`
- **Description**: Get all groups user created or participates in
- **Headers**: `Authorization: Bearer {access_token}`
- **Query Parameters**:
  - `filter` (optional): `created` | `joined` | `all` (default: `all`)
  - `page` (optional): Page number for pagination (default: 1)
  - `limit` (optional): Items per page (default: 20, max: 100)
- **Success Response** (200):
```json
{
  "data": [
    {
      "id": 1,
      "name": "Family Christmas 2025",
      "budget": 150,
      "end_date": "2025-12-25T23:59:59Z",
      "creator_id": 42,
      "is_drawn": false,
      "created_at": "2025-10-09T10:00:00Z",
      "updated_at": "2025-10-09T10:00:00Z",
      "participants_count": 5,
      "is_creator": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```
- **Error Responses**:
  - 401: Unauthorized

#### Get Group Details
- **Method**: `GET`
- **Path**: `/api/groups/:id`
- **Description**: Get detailed information about a specific group
- **Headers**: `Authorization: Bearer {access_token}`
- **Success Response** (200):
```json
{
  "id": 1,
  "name": "Family Christmas 2025",
  "budget": 150,
  "end_date": "2025-12-25T23:59:59Z",
  "creator_id": 42,
  "is_drawn": false,
  "created_at": "2025-10-09T10:00:00Z",
  "updated_at": "2025-10-09T10:00:00Z",
  "participants": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "user_id": 42,
      "created_at": "2025-10-09T10:00:00Z"
    }
  ],
  "exclusions": [
    {
      "id": 1,
      "blocker_participant_id": 1,
      "blocked_participant_id": 2,
      "created_at": "2025-10-09T10:00:00Z"
    }
  ],
  "is_creator": true,
  "can_edit": true
}
```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (user not part of group)
  - 404: Group not found

#### Update Group
- **Method**: `PATCH`
- **Path**: `/api/groups/:id`
- **Description**: Update group details (only before draw)
- **Headers**: `Authorization: Bearer {access_token}`
- **Request Body** (all fields optional):
```json
{
  "name": "Updated Group Name",
  "budget": 200,
  "end_date": "2025-12-31T23:59:59Z"
}
```
- **Success Response** (200): Updated group object
- **Error Responses**:
  - 400: Invalid data, draw already completed
  - 401: Unauthorized
  - 403: Forbidden (only creator can update)
  - 404: Group not found

#### Delete Group
- **Method**: `DELETE`
- **Path**: `/api/groups/:id`
- **Description**: Delete a group and all related data
- **Headers**: `Authorization: Bearer {access_token}`
- **Success Response** (204): No content
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (only creator can delete)
  - 404: Group not found

---

### 2.3. Participants

#### Add Participant
- **Method**: `POST`
- **Path**: `/api/groups/:groupId/participants`
- **Description**: Add a participant to a group
- **Headers**: `Authorization: Bearer {access_token}`
- **Request Body**:
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com"
}
```
- **Success Response** (201):
```json
{
  "id": 2,
  "group_id": 1,
  "user_id": null,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "created_at": "2025-10-09T10:00:00Z",
  "access_token": "unique-secure-token-xyz"
}
```
- **Error Responses**:
  - 400: Invalid data, email already exists in group, draw already completed
  - 401: Unauthorized
  - 403: Forbidden (only creator can add participants)
  - 404: Group not found
  - 422: Missing required field (name)

#### List Participants
- **Method**: `GET`
- **Path**: `/api/groups/:groupId/participants`
- **Description**: Get all participants in a group
- **Headers**: `Authorization: Bearer {access_token}`
- **Success Response** (200):
```json
{
  "data": [
    {
      "id": 1,
      "group_id": 1,
      "user_id": 42,
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2025-10-09T10:00:00Z",
      "has_wishlist": true
    },
    {
      "id": 2,
      "group_id": 1,
      "user_id": null,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "created_at": "2025-10-09T10:00:00Z",
      "has_wishlist": false
    }
  ]
}
```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (user not part of group)
  - 404: Group not found

#### Update Participant
- **Method**: `PATCH`
- **Path**: `/api/participants/:id`
- **Description**: Update participant details (only before draw)
- **Headers**: `Authorization: Bearer {access_token}`
- **Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```
- **Success Response** (200): Updated participant object
- **Error Responses**:
  - 400: Invalid data, email already exists in group, draw already completed
  - 401: Unauthorized
  - 403: Forbidden (only group creator can update)
  - 404: Participant not found 

#### Delete Participant
- **Method**: `DELETE`
- **Path**: `/api/participants/:id`
- **Description**: Remove a participant from a group (only before draw)
- **Headers**: `Authorization: Bearer {access_token}`
- **Success Response** (204): No content
- **Error Responses**:
  - 400: Cannot delete creator, draw already completed
  - 401: Unauthorized
  - 403: Forbidden (only group creator can delete)
  - 404: Participant not found

---

### 2.4. Exclusion Rules

#### Add Exclusion Rule
- **Method**: `POST`
- **Path**: `/api/groups/:groupId/exclusions`
- **Description**: Create a one-way exclusion rule
- **Headers**: `Authorization: Bearer {access_token}`
- **Request Body**:
```json
{
  "blocker_participant_id": 1,
  "blocked_participant_id": 2
}
```
- **Success Response** (201):
```json
{
  "id": 1,
  "group_id": 1,
  "blocker_participant_id": 1,
  "blocked_participant_id": 2,
  "created_at": "2025-10-09T10:00:00Z"
}
```
- **Error Responses**:
  - 400: Invalid data, participants are the same, draw already completed, duplicate rule
  - 401: Unauthorized
  - 403: Forbidden (only creator can add exclusions)
  - 404: Group or participants not found
  - 422: Missing required fields

#### List Exclusion Rules
- **Method**: `GET`
- **Path**: `/api/groups/:groupId/exclusions`
- **Description**: Get all exclusion rules for a group
- **Headers**: `Authorization: Bearer {access_token}`
- **Success Response** (200):
```json
{
  "data": [
    {
      "id": 1,
      "group_id": 1,
      "blocker_participant_id": 1,
      "blocker_name": "John Doe",
      "blocked_participant_id": 2,
      "blocked_name": "Jane Smith",
      "created_at": "2025-10-09T10:00:00Z"
    }
  ]
}
```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (user not part of group)
  - 404: Group not found

#### Delete Exclusion Rule
- **Method**: `DELETE`
- **Path**: `/api/exclusions/:id`
- **Description**: Remove an exclusion rule (only before draw)
- **Headers**: `Authorization: Bearer {access_token}`
- **Success Response** (204): No content
- **Error Responses**:
  - 400: Draw already completed
  - 401: Unauthorized
  - 403: Forbidden (only group creator can delete)
  - 404: Exclusion rule not found

---

### 2.5. Draw

#### Execute Draw
- **Method**: `POST`
- **Path**: `/api/groups/:groupId/draw`
- **Description**: Execute the Secret Santa draw algorithm
- **Headers**: `Authorization: Bearer {access_token}`
- **Request Body**: None
- **Success Response** (200):
```json
{
  "success": true,
  "message": "Draw completed successfully",
  "group_id": 1,
  "drawn_at": "2025-10-09T10:00:00Z",
  "participants_notified": 5
}
```
- **Error Responses**:
  - 400: 
    - Not enough participants (minimum 3 required)
    - Draw already completed
    - Draw impossible with current exclusion rules
  - 401: Unauthorized
  - 403: Forbidden (only creator can execute draw)
  - 404: Group not found

#### Validate Draw
- **Method**: `POST`
- **Path**: `/api/groups/:groupId/draw/validate`
- **Description**: Validate if draw is possible with current exclusions (dry run)
- **Headers**: `Authorization: Bearer {access_token}`
- **Request Body**: None
- **Success Response** (200):
```json
{
  "valid": true,
  "participants_count": 5,
  "exclusions_count": 2,
  "message": "Draw can be executed successfully"
}
```
- **Error Responses**:
  - 400:
```json
{
  "valid": false,
  "participants_count": 5,
  "exclusions_count": 10,
  "message": "Draw is impossible with current exclusion rules",
  "details": "Too many exclusions create an impossible scenario"
}
```
  - 401: Unauthorized
  - 403: Forbidden (only creator can validate)
  - 404: Group not found

---

### 2.6. Results

#### Get Draw Result (Authenticated)
- **Method**: `GET`
- **Path**: `/api/groups/:groupId/result`
- **Description**: Get authenticated user's draw result for a group
- **Headers**: `Authorization: Bearer {access_token}`
- **Success Response** (200):
```json
{
  "group": {
    "id": 1,
    "name": "Family Christmas 2025",
    "budget": 150,
    "end_date": "2025-12-25T23:59:59Z"
  },
  "participant": {
    "id": 1,
    "name": "John Doe"
  },
  "assigned_to": {
    "id": 2,
    "name": "Jane Smith",
    "wishlist": "I would love a book about cooking or a new kitchen gadget.\nhttps://example.com/wishlist"
  },
  "my_wishlist": {
    "content": "I like tech gadgets and board games.",
    "can_edit": true
  }
}
```
- **Error Responses**:
  - 400: Draw not yet completed
  - 401: Unauthorized
  - 403: Forbidden (user not a participant in this group)
  - 404: Group not found

#### Get Draw Result (Unregistered via Token)
- **Method**: `GET`
- **Path**: `/api/results/:token`
- **Description**: Get draw result using unique access token (for unregistered participants)
- **Headers**: None required
- **Success Response** (200): Same as authenticated result
- **Error Responses**:
  - 400: Draw not yet completed
  - 404: Invalid or expired token

#### Track Result Access
- **Method**: `POST`
- **Path**: `/api/results/:token/track`
- **Description**: Record when and how many times a result link was accessed
- **Headers**: None required
- **Request Body**: None (tracking happens automatically on GET)
- **Success Response** (200):
```json
{
  "participant_id": 2,
  "access_count": 3,
  "first_accessed_at": "2025-10-09T10:00:00Z",
  "last_accessed_at": "2025-10-09T12:30:00Z"
}
```

---

### 2.7. Wishlists

#### Create or Update Wishlist
- **Method**: `PUT`
- **Path**: `/api/participants/:participantId/wishlist`
- **Description**: Create or update a participant's wishlist
- **Headers**: 
  - `Authorization: Bearer {access_token}` (for registered users)
  - OR access via participant token in query: `?token={participant_token}` (for unregistered)
- **Request Body**:
```json
{
  "wishlist": "I would love:\n- A new book\n- Kitchen gadgets\nhttps://example.com/my-wishlist"
}
```
- **Success Response** (200):
```json
{
  "id": 1,
  "participant_id": 1,
  "wishlist": "I would love:\n- A new book\n- Kitchen gadgets\nhttps://example.com/my-wishlist",
  "updated_at": "2025-10-09T10:00:00Z"
}
```
- **Error Responses**:
  - 400: Event end date passed (wishlist locked)
  - 401: Unauthorized
  - 403: Forbidden (can only edit own wishlist)
  - 404: Participant not found
  - 422: Missing required field (wishlist)

#### Get Wishlist
- **Method**: `GET`
- **Path**: `/api/participants/:participantId/wishlist`
- **Description**: Get a participant's wishlist
- **Headers**: `Authorization: Bearer {access_token}` OR `?token={participant_token}`
- **Success Response** (200):
```json
{
  "id": 1,
  "participant_id": 1,
  "wishlist": "I would love:\n- A new book\n- Kitchen gadgets\nhttps://example.com/my-wishlist",
  "wishlist_html": "I would love:<br>- A new book<br>- Kitchen gadgets<br><a href='https://example.com/my-wishlist'>https://example.com/my-wishlist</a>",
  "updated_at": "2025-10-09T10:00:00Z",
  "can_edit": true
}
```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden
  - 404: Participant or wishlist not found

#### Delete Wishlist
- **Method**: `DELETE`
- **Path**: `/api/participants/:participantId/wishlist`
- **Description**: Clear a participant's wishlist
- **Headers**: `Authorization: Bearer {access_token}` OR `?token={participant_token}`
- **Success Response** (204): No content
- **Error Responses**:
  - 400: Event end date passed (wishlist locked)
  - 401: Unauthorized
  - 403: Forbidden (can only delete own wishlist)
  - 404: Participant or wishlist not found

---

## 3. Authentication and Authorization

### 3.1. Authentication Mechanism

The API uses **Supabase Auth** with JWT (JSON Web Tokens) for authentication:

1. **Token-based authentication**: All authenticated endpoints require a valid JWT token in the `Authorization` header
2. **Token format**: `Authorization: Bearer {access_token}`
3. **Token expiration**: Tokens expire after a configurable time (default: 3600 seconds / 1 hour)
4. **Refresh tokens**: Long-lived refresh tokens are provided for obtaining new access tokens
5. **Secure token storage**: Tokens should be stored securely on the client (httpOnly cookies recommended)

### 3.2. Authorization Rules

Authorization is implemented using **Supabase Row Level Security (RLS)** policies:

#### Groups Table
- **Create**: Any authenticated user
- **Read**: Group creator OR group participants (via participant.user_id)
- **Update**: Only group creator AND draw not completed
- **Delete**: Only group creator

#### Participants Table
- **Create**: Only group creator AND draw not completed
- **Read**: Group creator OR authenticated user who is a participant in the same group
- **Update**: Only group creator AND draw not completed
- **Delete**: Only group creator AND draw not completed AND not the creator participant

#### Exclusion Rules Table
- **Create**: Only group creator AND draw not completed
- **Read**: Group creator OR group participants
- **Update**: Not allowed (delete and recreate instead)
- **Delete**: Only group creator AND draw not completed

#### Wishes Table
- **Create/Update**: Participant owner (either via user_id match OR via valid participant token) AND event end_date not passed
- **Read**: 
  - Participant owner can read their own wishlist
  - Other participants in the same group can read if draw is completed
- **Delete**: Participant owner AND event end_date not passed

### 3.3. Unregistered User Access

For unregistered participants (those without user_id):

1. **Unique access tokens** are generated when a participant is added
2. **Token format**: Cryptographically secure random string (e.g., UUID v4 or similar)
3. **Token storage**: Stored in database, associated with participant record
4. **Token usage**: 
   - Included in result URLs: `/api/results/{token}`
   - Can be passed as query parameter for wishlist operations: `?token={token}`
5. **Token tracking**: Each access is logged with timestamp

### 3.4. Security Measures

1. **HTTPS only**: All API endpoints must be accessed over HTTPS in production
2. **Rate limiting**: 
   - Authentication endpoints: 5 requests per minute per IP
   - API endpoints: 100 requests per minute per user
   - Public endpoints (result tokens): 20 requests per minute per token
3. **CORS**: Configure allowed origins based on deployment environment
4. **Input sanitization**: All user inputs are sanitized to prevent XSS attacks
5. **SQL injection prevention**: Using parameterized queries via Supabase client
6. **Token security**: 
   - Access tokens have short expiration
   - Participant tokens are cryptographically random
   - Password reset tokens expire after 1 hour

---

## 4. Validation and Business Logic

### 4.1. Validation Rules by Resource

#### Groups
- **name**: 
  - Required, string
  - Min length: 1, Max length: 255
  - Cannot be empty or only whitespace
- **budget**: 
  - Required, numeric
  - Must be > 0
  - Stored as NUMERIC type for precision
- **end_date**: 
  - Required, ISO 8601 datetime string
  - Must be a future date
  - Validated on creation and update

#### Participants
- **name**: 
  - Required, string
  - Min length: 1, Max length: 255
  - Cannot be empty or only whitespace
- **email**: 
  - Optional, string
  - Must be valid email format (case-insensitive)
  - Must be unique within the group (if provided)
  - Automatically attempts to match with existing user_id

#### Exclusion Rules
- **blocker_participant_id**: 
  - Required, integer
  - Must reference existing participant in the group
  - Cannot be same as blocked_participant_id
- **blocked_participant_id**: 
  - Required, integer
  - Must reference existing participant in the group
  - Cannot be same as blocker_participant_id
- **uniqueness**: 
  - Combination of (group_id, blocker_participant_id, blocked_participant_id) must be unique

#### Wishlists
- **wishlist**: 
  - Required (can be empty string to clear)
  - String, max length: 10,000 characters
  - URLs are auto-detected and converted to clickable links in rendering

### 4.2. Business Logic Implementation

#### 4.2.1. Group Creation Flow
1. Validate input data (name, budget, end_date)
2. Create group record with authenticated user as creator_id
3. Automatically create participant record for creator (using their user_id and name from user profile)
4. Return created group with participants_count = 1
5. Transaction: Group creation and initial participant creation must succeed together

#### 4.2.2. Participant Management
1. **Adding participants**:
   - Validate name and optional email
   - Check email uniqueness within group
   - If email matches existing user, link participant.user_id
   - Generate unique access_token for unregistered participants
   - Cannot add if draw is completed
2. **Updating participants**:
   - Only allowed before draw
   - Can update name and email
   - Email uniqueness checked on update
   - Re-link user_id if email changes and matches existing user
3. **Deleting participants**:
   - Cannot delete group creator's participant record
   - Only allowed before draw
   - Cascading delete removes related exclusion rules and wishlist

#### 4.2.3. Exclusion Rules Logic
1. **Validation**:
   - Both participants must exist in the same group
   - Blocker and blocked cannot be the same person
   - Rule must be unique (no duplicate rules)
2. **Editing**:
   - No direct update; must delete and create new rule
   - Only allowed before draw
3. **Impact on draw**:
   - Considered during draw validation
   - May make draw impossible if too restrictive

#### 4.2.4. Draw Algorithm
1. **Pre-validation**:
   - Minimum 3 participants required
   - Draw not already completed for this group
   - Only group creator can execute
2. **Exclusion rules validation**:
   - Build graph of possible assignments
   - Check if valid assignment exists considering all exclusions
   - Algorithm must ensure:
     - No one draws themselves
     - All exclusion rules are respected
     - Every participant draws exactly one other participant
     - Every participant is drawn by exactly one person
3. **Algorithm approach**:
   - Use graph-based algorithm (e.g., random derangement with constraints)
   - Retry logic with maximum attempts
   - If impossible after N attempts, return validation error
4. **Assignment storage**:
   - Store assignments in a new table or as encrypted data
   - Generate access tokens for unregistered participants
   - Mark group as drawn (is_drawn = true)
5. **Post-draw**:
   - Lock group and participants from editing
   - Transaction: All assignments must be created atomically
   - Return success with metadata

#### 4.2.5. Results Access
1. **For registered users**:
   - Authenticate via JWT
   - Verify user is participant in the group
   - Return assigned person and their wishlist
2. **For unregistered users**:
   - Validate access token
   - Track access (timestamp, count)
   - Return same data as registered users
3. **Common logic**:
   - Only show results after draw is completed
   - Include group info, assigned person's wishlist, and own wishlist with edit capability

#### 4.2.6. Wishlist Management
1. **Creation/Update**:
   - Verify participant ownership (via user_id OR access token)
   - Check event end_date hasn't passed
   - Sanitize input to prevent XSS
   - Auto-detect and prepare URLs for linking (but store as plain text)
   - Upsert operation: create if doesn't exist, update if exists
2. **URL auto-linking**:
   - Performed on read/display, not on storage
   - Regex to detect URLs (http:// or https://)
   - Convert to HTML anchor tags for frontend rendering
   - Return both plain text and HTML versions
3. **Edit restrictions**:
   - Can edit until group.end_date
   - After end_date, wishlist becomes read-only
   - Always readable by assigned participant after draw

#### 4.2.7. Data Integrity and Transactions

All multi-step operations use database transactions:

1. **Group creation**: Create group + create creator participant
2. **Draw execution**: Validate + create all assignments + update group.is_drawn
3. **Group deletion**: Cascading delete handled by database foreign keys
4. **Participant deletion**: Remove participant + cascade to exclusions and wishlist

### 4.3. Error Handling Strategy

#### Standard Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Specific field that caused error",
      "constraint": "Validation rule that failed"
    }
  }
}
```

#### Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `AUTH_ERROR`: Authentication failed
- `FORBIDDEN`: User lacks permission
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource conflict (e.g., duplicate email)
- `DRAW_ERROR`: Draw-specific errors (already drawn, impossible, etc.)
- `LOCKED_ERROR`: Resource locked for editing (after draw or after end_date)
- `INTERNAL_ERROR`: Unexpected server error

#### HTTP Status Code Usage
- `200 OK`: Successful GET, PUT, PATCH requests
- `201 Created`: Successful POST request creating new resource
- `204 No Content`: Successful DELETE request
- `400 Bad Request`: Client error in request (validation, business logic)
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Valid authentication but insufficient permissions
- `404 Not Found`: Resource does not exist
- `422 Unprocessable Entity`: Request syntax valid but semantically incorrect
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Unexpected server error

---

## 5. Additional Considerations

### 5.1. Pagination
All list endpoints support pagination:
- **Query parameters**: `page` (1-indexed), `limit` (default: 20, max: 100)
- **Response format**: Includes `data` array and `pagination` metadata object

### 5.2. Filtering and Sorting
- **Groups list**: Filter by `created`/`joined`/`all`
- **Future enhancement**: Sort by `created_at`, `end_date`, `name`

### 5.3. API Versioning
- Current version: v1 (implicit in `/api` prefix)
- Future versions can use `/api/v2` prefix if breaking changes needed

### 5.4. Logging and Monitoring
- Log all draw executions with timestamp and user
- Log all result access (especially via tokens) for tracking
- Monitor rate limiting violations
- Track API response times for performance optimization

### 5.5. Testing Requirements
- Unit tests for draw algorithm (various exclusion scenarios)
- Integration tests for complete user flows
- Security tests for authorization rules
- Load tests for draw algorithm with large participant counts

### 5.6. Future Enhancements (Out of MVP Scope)
- Email notifications (signup confirmations, draw completion, reminders)
- Webhook support for group events
- Bulk participant import via CSV
- Re-draw capability with proper authorization
- Multi-currency support
- Rich text wishlist editor
- File attachments for wishlists
- Group invitation system via unique codes
- Multiple co-organizers per group

