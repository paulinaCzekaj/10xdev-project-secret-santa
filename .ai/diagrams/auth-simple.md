# Authentication Architecture Diagram - Secret Santa

This diagram shows the main authentication flows in the Secret Santa app using Astro 5 (SSR), React 19 and Supabase Auth.

<mermaid_diagram>

```mermaid
sequenceDiagram
    autonumber

    participant U as User
    participant P as Pages
    participant M as Middleware
    participant C as Components
    participant S as Supabase
    participant D as Database

    Note over U,D: User Registration Flow

    U->>P: GET /register
    activate P
    P->>M: Check session
    activate M
    M->>S: getSession()
    S-->>M: No session
    deactivate M
    P->>U: Show registration form
    deactivate P

    U->>C: Submit registration
    activate C
    C->>S: signUp(email, password)
    activate S
    S->>D: Create user account
    activate D
    D-->>S: Account created
    deactivate D
    S-->>C: Return session
    deactivate S
    C->>U: Save session + redirect
    deactivate C

    Note over U,D: User Login Flow

    U->>P: GET /login
    activate P
    P->>M: Check session
    activate M
    M->>S: getSession()
    S-->>M: No session
    deactivate M
    P->>U: Show login form
    deactivate P

    U->>C: Submit login
    activate C
    C->>S: signInWithPassword()
    activate S
    S->>D: Verify credentials
    activate D
    D-->>S: Valid credentials
    deactivate D
    S-->>C: Return session
    deactivate S
    C->>U: Save session + redirect
    deactivate C

    Note over U,D: Protected Route Access

    U->>P: GET /dashboard
    activate P
    P->>M: Check authentication
    activate M
    M->>S: getSession()
    activate S
    S-->>M: Valid session
    deactivate S
    deactivate M
    P->>U: Render dashboard
    deactivate P

    Note over U,D: Logout Flow

    U->>C: Click logout
    activate C
    C->>S: signOut()
    activate S
    S->>D: Invalidate tokens
    activate D
    D-->>S: Tokens invalidated
    deactivate D
    S->>U: Clear localStorage
    deactivate S
    C->>U: Redirect to home
    deactivate C
```

</mermaid_diagram>
