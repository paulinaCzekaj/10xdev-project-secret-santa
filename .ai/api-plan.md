# REST API Plan - Secret Santa

**Ostatnia aktualizacja**: 2025-11-17
**Wersja dokumentu**: 1.1.0

## Historia zmian

- **2025-11-17 (v1.1.0)**: Dodano endpointy dla funkcjonalności Elfa - `GET /api/participants/:id/elf-result`, `POST /api/participants/:id/track-elf-access`, rozszerzono endpointy CRUD participants o pole `elfForParticipantId`
- **2025-11-03 (v1.0.1)**: Dodano endpointy AI-generowania wishlist - `POST /api/participants/:id/wishlist/generate-ai`, `GET /api/participants/:id/wishlist/ai-status`
- **2025-10-09 (v1.0.0)**: Inicjalna wersja API dla MVP

---

## 1. Resources

The API is built around the following primary resources, each corresponding to database entities:

- **Auth** - User authentication and account management (managed by Supabase Auth)
- **Groups** - Secret Santa groups/events (`groups` table)
- **Participants** - Group members (`participants` table)
  - Includes elf assignment support (Version 1.1)
  - Elf-to-participant relationship tracking
- **Exclusions** - Draw exclusion rules (`exclusion_rules` table)
  - Automatic exclusions for elf relationships (Version 1.1)
- **Wishlists** - Participant wish lists (`wishes` table)
  - Includes AI-generated content support (Version 1.1)
  - AI generation quota tracking per participant
  - Editable by elfs (if elf has account) (Version 1.1)
- **Results** - Draw results and access tokens (derived from participants and assignments)
  - Includes elf result access (Version 1.1)
  - Separate tracking for elf access vs participant access
- **AI Generation** - AI-powered wishlist generation (Version 1.1)
  - OpenRouter API integration for personalized Santa letters
  - Usage limits: 3 generations (unregistered) / 5 generations (registered)
- **Elf Access** - Elf helper functionality (Version 1.1)
  - Elfs can view results of participants they help
  - Elf access tracking and permissions

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
  "email": "jane@example.com",
  "elfForParticipantId": 1
}
```

**Fields:**
- `name` (required): Participant's name
- `email` (optional): Participant's email (must be unique per group)
- `elfForParticipantId` (optional, v1.1.0): ID of participant this person will help as an elf

- **Success Response** (201):

```json
{
  "id": 2,
  "group_id": 1,
  "user_id": null,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "elf_for_participant_id": 1,
  "created_at": "2025-10-09T10:00:00Z",
  "access_token": "unique-secure-token-xyz"
}
```

- **Error Responses**:
  - 400: Invalid data, email already exists in group, draw already completed, elf target not in same group, participant already has an elf
  - 401: Unauthorized
  - 403: Forbidden (only creator can add participants)
  - 404: Group not found, elf target participant not found
  - 422: Missing required field (name)

#### List Participants

- **Method**: `GET`
- **Path**: `/api/groups/:groupId/participants`
- **Description**: Get all participants in a group with elf relationship information (v1.1.0)
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
      "has_wishlist": true,
      "elfForParticipantId": null,
      "elfForParticipantName": null,
      "isElfForSomeone": false,
      "hasElf": true,
      "elfName": "Jane Smith",
      "elfAccessedAt": null
    },
    {
      "id": 2,
      "group_id": 1,
      "user_id": null,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "created_at": "2025-10-09T10:00:00Z",
      "has_wishlist": false,
      "elfForParticipantId": 1,
      "elfForParticipantName": "John Doe",
      "isElfForSomeone": true,
      "hasElf": false,
      "elfName": null,
      "elfAccessedAt": null
    }
  ]
}
```

**Response Fields (v1.1.0 Elf fields):**
- `elfForParticipantId`: ID of participant this person is helping (null if not an elf)
- `elfForParticipantName`: Name of participant this person is helping
- `isElfForSomeone`: Boolean indicating if this participant is an elf
- `hasElf`: Boolean indicating if this participant has an assigned elf
- `elfName`: Name of this participant's elf (null if no elf)
- `elfAccessedAt`: Timestamp when elf accessed this participant's result (null if not accessed)

- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (user not part of group)
  - 404: Group not found

#### Update Participant

- **Method**: `PATCH`
- **Path**: `/api/participants/:id`
- **Description**: Update participant details (name only before draw, email always, elf assignment only before draw - v1.1.0)
- **Headers**: `Authorization: Bearer {access_token}`
- **Request Body** (all fields optional):

```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "elfForParticipantId": 2
}
```

**Fields:**
- `name` (optional): Can only be updated before draw
- `email` (optional): Can be updated anytime
- `elfForParticipantId` (optional, v1.1.0): ID of participant this person will help as an elf. Can only be updated before draw. Set to `null` to remove elf assignment.

- **Success Response** (200): Updated participant object
- **Error Responses**:
  - 400: Invalid data, email already exists in group, draw already completed (for name/elf changes), elf target not in same group, participant already has an elf
  - 401: Unauthorized
  - 403: Forbidden (only group creator can update)
  - 404: Participant not found, elf target participant not found

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

### 2.8. AI Wishlist Generation

#### Generate AI Wishlist

- **Method**: `POST`
- **Path**: `/api/participants/:participantId/wishlist/generate-ai`
- **Description**: Generate a personalized Santa letter using AI based on user preferences
- **Headers**:
  - `Authorization: Bearer {access_token}` (for registered users)
  - OR access via participant token in query: `?token={participant_token}` (for unregistered)
- **Request Body**:

```json
{
  "prompt": "Lubię książki fantasy, dobrą kawę i ciepłe szaliki"
}
```

- **Success Response** (200):

```json
{
  "generated_content": "Cześć Mikołaju! 🎅\n\nW tym roku byłam/em grzeczna/y i marzę o kilku rzeczach pod choinkę 🎄. Mega chciałabym/bym dostać \"Wiedźmin: Ostatnie życzenie\" Sapkowskiego 📚, bo fantasy to moja ulubiona bajka! Poza tym uwielbiam dobrą kawę ☕ - jakiś ciekawy zestaw z różnych zakątków świata byłby super. I jeszcze ciepły, kolorowy szalik 🧣, bo zima idzie!\n\nDzięki i wesołych Świąt! ⭐",
  "remaining_generations": 4,
  "can_generate_more": true
}
```

- **Error Responses**:
  - 400:
    - `END_DATE_PASSED`: Event end date has passed, wishlist is locked
    - `INVALID_PROMPT`: Prompt is too short (min 10 chars) or too long (max 1000 chars)
  - 401: Unauthorized
  - 403: Forbidden (can only generate for own wishlist)
  - 404: Participant not found
  - 429:
    - `AI_GENERATION_LIMIT_REACHED`: User has exhausted their AI generation quota
  - 500:
    - `AI_API_ERROR`: OpenRouter API is unavailable or returned an error
  - 504: Gateway Timeout (AI generation took longer than 15 seconds)

#### Get AI Generation Status

- **Method**: `GET`
- **Path**: `/api/participants/:participantId/wishlist/ai-status`
- **Description**: Get current AI generation usage status for a participant
- **Headers**:
  - `Authorization: Bearer {access_token}` (for registered users)
  - OR access via participant token in query: `?token={participant_token}` (for unregistered)
- **Success Response** (200):

```json
{
  "ai_generation_count": 2,
  "remaining_generations": 3,
  "max_generations": 5,
  "can_generate": true,
  "is_registered": true,
  "last_generated_at": "2025-11-04T14:30:00Z"
}
```

- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden
  - 404: Participant not found

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

- **SELECT**: All users (authenticated + anonymous) - Permissive RLS policy `using (true)`
  - Note: Application layer enforces access control via token validation
  - Rationale: Unregistered participants with tokens need to view group details
- **INSERT**: Authenticated users only - Permissive policy `with check (true)`
  - Backend ensures creator_id assignment
- **UPDATE**: Restrictive - Only group creator - `using (creator_id = auth.uid())`
  - Business logic also checks: draw not completed
- **DELETE**: Restrictive - Only group creator - `using (creator_id = auth.uid())`

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
- **ai_generated**:
  - Boolean, default: false
  - Indicates if wishlist was generated using AI
- **ai_generation_count**:
  - Integer, default: 0
  - Tracks number of AI generations per participant
  - Max: 3 for unregistered users, 5 for registered users
- **ai_last_generated_at**:
  - Timestamp, nullable
  - Records last AI generation attempt

#### AI Generation Prompts

- **prompt**:
  - Required for AI generation
  - String, min length: 10 characters, max length: 1000 characters
  - Must not be empty or only whitespace
  - Basic content moderation for offensive language (client-side)

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

#### 4.2.7. AI Wishlist Generation

1. **Pre-generation validation**:
   - Verify participant ownership (via user_id OR access token)
   - Check event end_date hasn't passed
   - Validate prompt length (10-1000 characters)
   - Check AI generation quota (3 for unregistered, 5 for registered)
   - Return 429 error if quota exceeded

2. **OpenRouter API integration**:
   - Model: `openai/gpt-4o-mini`
   - System prompt includes context about Secret Santa and Polish language requirement
   - User prompt combines participant preferences with Santa letter format instructions
   - Request timeout: 15 seconds
   - Retry policy: 2 attempts with exponential backoff (1s, 2s)
   - Temperature: 0.7 for creative but consistent output
   - Max tokens: 1000

3. **Response processing**:
   - Validate generated content length (max 1000 chars from API, fits within 10,000 char wishlist limit)
   - Sanitize HTML to prevent XSS attacks
   - Return generated content with remaining quota information
   - DO NOT automatically save to wishlist - user must explicitly accept

4. **Quota management**:
   - Increment `ai_generation_count` on each request (even if rejected)
   - Update `ai_last_generated_at` timestamp
   - Calculate remaining generations: `max_limit - ai_generation_count`
   - For registered users: check if participant has `user_id` to determine max limit

5. **Error handling**:
   - OpenRouter API timeout: Return 504 with user-friendly message
   - OpenRouter API error: Return 500 with fallback to manual editing
   - Rate limiting: Return 429 when quota exhausted
   - Invalid prompt: Return 400 with specific validation message
   - Log errors for monitoring but do not expose API keys or sensitive details

6. **Security considerations**:
   - Never send participant PII (names, emails) to OpenRouter
   - Only send user-provided prompt text
   - API key stored in environment variables only
   - No logging of prompts or generated content (except for debugging in dev environment)

#### 4.2.8. Data Integrity and Transactions

All multi-step operations use database transactions:

1. **Group creation**: Create group + create creator participant
2. **Draw execution**: Validate + create all assignments + update group.is_drawn
3. **Group deletion**: Cascading delete handled by database foreign keys
4. **Participant deletion**: Remove participant + cascade to exclusions and wishlist
5. **AI generation**: Increment counter + update timestamp (atomic operation)

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
- `AI_GENERATION_LIMIT_REACHED`: AI generation quota exhausted
- `AI_API_ERROR`: OpenRouter API error or unavailable
- `INVALID_PROMPT`: AI prompt validation failed (too short/long, inappropriate content)
- `END_DATE_PASSED`: Event end date has passed, resource is locked
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

### 5.6. OpenRouter API Integration (Version 1.1)

**Configuration:**
- Provider: OpenRouter (https://openrouter.ai)
- Model: `openai/gpt-4o-mini`
- API Key: Stored in `OPENROUTER_API_KEY` environment variable
- Base URL: `https://openrouter.ai/api/v1`

**Request Parameters:**
- `max_tokens`: 1000
- `temperature`: 0.7
- `top_p`: 1.0
- `timeout`: 15 seconds

**Rate Limiting:**
- Per-participant limits: 3 generations (unregistered) / 5 generations (registered)
- Tracked in database via `wishes.ai_generation_count`
- No global rate limiting on OpenRouter side (handled by their infrastructure)

**Cost Monitoring:**
- Track API usage in application logs
- Alert mechanism for monthly budget threshold
- Ability to disable AI feature if costs exceed budget

**System Prompt Template:**
```
Jesteś asystentem pomagającym tworzyć listy do świętego Mikołaja na Gwiazdkę (Secret Santa).

Zadanie:
Na podstawie preferencji użytkownika wygeneruj ciepły, narracyjny list do Mikołaja zawierający listę życzeń.

Wytyczne:
1. Użyj formy listu (np. "Drogi Mikołaju,..." lub "Hej Mikołaju!")
2. Ton ma być ciepły, personalny i świąteczny (nie oficjalny czy suchy)
3. Zawrzyj pomysły na prezenty wysłane przez użytkownika w narracji listu
4. Dodaj emoji świąteczne (🎁, 🎄, ⭐, 🎅, ❄️, 🔔)
5. Maksymalnie 1000 znaków
6. Odpowiadaj TYLKO po polsku
7. Zakończ list w ciepły, świąteczny sposób
```

### 2.9. Elf Access (v1.1.0)

#### Get Elf Result

- **Method**: `GET`
- **Path**: `/api/participants/:participantId/elf-result`
- **Description**: Get the draw result of the participant the elf is helping (elf must be logged in)
- **Headers**: `Authorization: Bearer {access_token}` (required - elf must have account)
- **Success Response** (200):

```json
{
  "assignment": {
    "receiverName": "Alice Johnson",
    "receiverWishlist": "I would love a new book...",
    "receiverWishlistHtml": "<p>I would love a new book...</p>"
  },
  "group": {
    "id": 1,
    "name": "Family Christmas 2025",
    "budget": 150,
    "endDate": "2025-12-25T23:59:59Z"
  },
  "helpedParticipant": {
    "id": 3,
    "name": "John Doe"
  }
}
```

**Response Fields:**
- `assignment`: Draw result of the participant the elf is helping
  - `receiverName`: Name of person the helped participant drew
  - `receiverWishlist`: Raw wishlist text of the receiver
  - `receiverWishlistHtml`: HTML-formatted wishlist with clickable links
- `group`: Group information (name, budget, end date)
- `helpedParticipant`: Information about the participant the elf is helping

**Authorization Logic:**
1. Check if authenticated user is a participant in this group
2. Check if participant has `elf_for_participant_id` set (is an elf)
3. Fetch assignment for `elf_for_participant_id`
4. Track access via `elf_accessed_at` timestamp

- **Error Responses**:
  - 401: Unauthorized (no Bearer token)
  - 403: Forbidden (not an elf, or not an elf for anyone)
  - 404: Participant not found, assignment not found (draw not completed)
  - 500: Internal server error

#### Track Elf Access

- **Method**: `POST`
- **Path**: `/api/participants/:participantId/track-elf-access`
- **Description**: Track when elf accessed the result (sets `elf_accessed_at` timestamp if not already set)
- **Headers**: `Authorization: Bearer {access_token}` (required)
- **Success Response** (200):

```json
{
  "success": true
}
```

**Behavior:**
- Only sets `elf_accessed_at` on first access (if currently NULL)
- Subsequent calls do not update the timestamp
- Used for analytics to track elf engagement

- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (not an elf)
  - 404: Participant not found
  - 500: Internal server error

**Notes:**
- Both endpoints require the elf to be a registered user (have `user_id`)
- Niezarejestrowani elfowie (without `user_id`) cannot access these endpoints
- Access token for unregistered participants does NOT grant access to elf endpoints
- Separate tracking: `elf_accessed_at` (elf's access) vs `result_viewed_at` (participant's own access)

---

### 5.7. Future Enhancements (Out of Scope)

**Beyond Version 1.1:**
- Email notifications (signup confirmations, draw completion, reminders)
- Webhook support for group events
- Bulk participant import via CSV
- Re-draw capability with proper authorization
- Multi-currency support
- Rich text wishlist editor
- File attachments for wishlists
- Group invitation system via unique codes
- Multiple co-organizers per group
- AI-generated content analytics and statistics (acceptance rate, regeneration patterns)
- AI model selection (allow users to choose from multiple AI models)
- AI prompt templates and suggestions
