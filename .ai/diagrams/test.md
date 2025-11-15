# Test Diagram

<mermaid_diagram>

```mermaid
sequenceDiagram
    autonumber

    participant U as User
    participant S as System

    U->>S: Login request
    activate S
    S-->>U: Login successful
    deactivate S
```

</mermaid_diagram>
