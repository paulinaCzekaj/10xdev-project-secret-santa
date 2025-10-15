# Diagram Architektury Autentykacji - Secret Santa

Ten diagram przedstawia kompleksowy przepływ autentykacji w aplikacji Secret Santa, wykorzystującej Astro 5 (SSR), React 19 i Supabase Auth.

<mermaid_diagram>
```mermaid
sequenceDiagram
    autonumber

    participant U as Przeglądarka
    participant AP as Astro Pages
    participant MW as Middleware
    participant RC as React Components
    participant API as Astro API Routes
    participant SA as Supabase Auth
    participant DB as Database

    Note over U,DB: PRZEPŁYW 1: REJESTRACJA NOWEGO UŻYTKOWNIKA

    U->>AP: GET /register
    activate AP
    AP->>MW: Żądanie renderowania
    activate MW
    MW->>SA: getSession()
    SA-->>MW: Brak sesji
    MW-->>AP: context.locals.session = null
    deactivate MW
    AP->>U: Renderuje stronę rejestracji
    deactivate AP

    U->>RC: Wypełnia formularz RegisterForm
    activate RC
    RC->>RC: Walidacja client-side (Zod)

    alt Walidacja pozytywna
        RC->>SA: signUp(email, password)
        activate SA
        SA->>DB: Tworzenie konta użytkownika
        activate DB
        DB-->>SA: Konto utworzone
        deactivate DB

        Note over SA: Email confirmation wyłączona w MVP<br/>Auto-login aktywny

        SA->>SA: Generuje JWT tokens
        SA-->>RC: Zwraca session + user
        deactivate SA
        RC->>U: Zapisuje session w localStorage
        RC->>U: Toast: "Konto utworzone!"
        U->>AP: Przekierowanie do /dashboard
    else Walidacja negatywna
        RC->>U: Komunikat błędu walidacji
    end
    deactivate RC

    Note over U,DB: PRZEPŁYW 2: LOGOWANIE UŻYTKOWNIKA

    U->>AP: GET /login
    activate AP
    AP->>MW: Żądanie renderowania
    activate MW
    MW->>SA: getSession()
    SA-->>MW: Brak sesji
    MW-->>AP: context.locals.session = null
    deactivate MW
    AP->>U: Renderuje stronę logowania
    deactivate AP

    U->>RC: Wypełnia LoginForm (email, hasło)
    activate RC
    RC->>RC: Walidacja client-side
    RC->>SA: signInWithPassword(email, password)
    activate SA
    SA->>DB: Weryfikacja credentials
    activate DB

    alt Credentials poprawne
        DB-->>SA: Użytkownik zweryfikowany
        deactivate DB
        SA->>SA: Generuje JWT tokens
        SA-->>RC: Zwraca session + user
        deactivate SA
        RC->>U: Zapisuje tokens w localStorage
        RC->>U: Toast: "Zalogowano!"
        U->>AP: Przekierowanie do /dashboard
    else Credentials niepoprawne
        DB-->>SA: Błąd autentykacji
        deactivate DB
        SA-->>RC: Error: Invalid credentials
        deactivate SA
        RC->>U: Toast: "Nieprawidłowy email lub hasło"
    end
    deactivate RC

    Note over U,DB: PRZEPŁYW 3: DOSTĘP DO CHRONIONEJ TRASY

    U->>AP: GET /groups/123
    activate AP
    AP->>MW: Żądanie renderowania
    activate MW
    MW->>SA: getSession()
    activate SA
    SA->>SA: Sprawdza access token z localStorage

    alt Token ważny
        SA-->>MW: Zwraca session
        deactivate SA
        MW->>MW: Dodaje session do context.locals
        MW-->>AP: context.locals.session = session
        deactivate MW

        AP->>AP: Sprawdza session
        AP->>API: GET /api/groups/123
        activate API
        API->>API: requireApiAuth(context)
        API->>MW: Pobiera session z context.locals
        activate MW
        MW-->>API: session.user.id
        deactivate MW

        API->>DB: Pobiera dane grupy dla user_id
        activate DB

        alt Użytkownik ma dostęp
            DB-->>API: Dane grupy
            deactivate DB
            API-->>AP: 200 OK + dane grupy
            deactivate API
            AP->>U: Renderuje GroupView z danymi
            deactivate AP
        else Brak dostępu
            DB-->>API: Brak danych
            deactivate DB
            API-->>AP: 403 Forbidden
            deactivate API
            AP->>U: Przekierowanie do /dashboard
            deactivate AP
        end

    else Token wygasł lub brak
        SA-->>MW: Brak sesji / token wygasł
        deactivate SA
        MW-->>AP: context.locals.session = null
        deactivate MW
        AP->>U: Przekierowanie do /login
        deactivate AP
    end

    Note over U,DB: PRZEPŁYW 4: AUTOMATYCZNE ODŚWIEŻANIE TOKENU

    U->>API: Żądanie do chronionego API
    activate API
    API->>SA: Weryfikacja access token
    activate SA
    SA->>SA: Sprawdza TTL access token

    alt Access token wygasł
        SA->>SA: Pobiera refresh token z localStorage
        SA->>SA: Wysyła refresh token do Supabase

        alt Refresh token ważny
            SA->>SA: Generuje nowy access token
            SA->>U: Aktualizuje localStorage
            SA-->>API: Nowy access token
            deactivate SA
            API->>DB: Wykonuje operację
            activate DB
            DB-->>API: Wynik operacji
            deactivate DB
            API-->>U: 200 OK + dane
            deactivate API
        else Refresh token wygasł
            SA-->>API: Error: Session expired
            deactivate SA
            API-->>U: 401 Unauthorized
            deactivate API
            U->>AP: Przekierowanie do /login
        end
    else Access token ważny
        SA-->>API: Token zweryfikowany
        deactivate SA
        API->>DB: Wykonuje operację
        activate DB
        DB-->>API: Wynik
        deactivate DB
        API-->>U: 200 OK + dane
        deactivate API
    end

    Note over U,DB: PRZEPŁYW 5: RESET HASŁA

    U->>AP: GET /forgot-password
    activate AP
    AP->>U: Renderuje ForgotPasswordForm
    deactivate AP

    U->>RC: Wypełnia email
    activate RC
    RC->>SA: resetPasswordForEmail(email)
    activate SA
    SA->>DB: Generuje recovery token
    activate DB
    DB-->>SA: Token wygenerowany
    deactivate DB
    SA->>SA: Wysyła email z linkiem
    SA-->>RC: Email wysłany
    deactivate SA
    RC->>U: Toast: "Sprawdź swoją skrzynkę"
    deactivate RC

    Note over U: Użytkownik klika link w emailu

    U->>AP: GET /reset-password?token=abc123
    activate AP
    AP->>U: Renderuje ResetPasswordForm
    deactivate AP

    U->>RC: Wypełnia nowe hasło
    activate RC
    RC->>SA: setSession(token) - weryfikacja
    activate SA

    alt Token ważny
        SA-->>RC: Token zweryfikowany
        RC->>SA: updateUser({password: newPassword})
        SA->>DB: Aktualizacja hasła
        activate DB
        DB-->>SA: Hasło zmienione
        deactivate DB
        SA->>SA: Unieważnia wszystkie sesje
        SA-->>RC: Hasło zaktualizowane
        deactivate SA
        RC->>U: Toast: "Hasło zmienione!"
        U->>AP: Przekierowanie do /login
    else Token wygasł lub nieprawidłowy
        SA-->>RC: Error: Invalid token
        deactivate SA
        RC->>U: Komunikat: "Link wygasł"
    end
    deactivate RC

    Note over U,DB: PRZEPŁYW 6: WYLOGOWANIE

    U->>RC: Klika przycisk LogoutButton
    activate RC
    RC->>SA: signOut()
    activate SA
    SA->>DB: Unieważnia refresh token
    activate DB
    DB-->>SA: Token unieważniony
    deactivate DB
    SA->>U: Usuwa session z localStorage
    SA-->>RC: Wylogowano
    deactivate SA
    RC->>U: Toast: "Wylogowano pomyślnie"
    U->>AP: Przekierowanie do /
    deactivate RC

    Note over U,DB: PRZEPŁYW 7: DOSTĘP DLA NIEZAREJESTROWANYCH

    U->>AP: GET /results/uuid-token-abc123
    activate AP
    AP->>DB: Sprawdza token w tabeli participants
    activate DB

    alt Token istnieje
        DB-->>AP: Dane uczestnika + wynik losowania
        deactivate DB

        AP->>DB: UPDATE last_accessed_at, access_count
        activate DB
        DB-->>AP: Zaktualizowano
        deactivate DB

        AP->>U: Renderuje ResultView z danymi
        deactivate AP

        Note over U: Użytkownik widzi:<br/>- Imię wylosowanej osoby<br/>- Listę życzeń<br/>- Własną listę życzeń (edytowalną)

    else Token nie istnieje
        DB-->>AP: Brak danych
        deactivate DB
        AP->>U: Przekierowanie do /404
        deactivate AP
    end

    Note over U,DB: Kluczowe elementy bezpieczeństwa:<br/>1. JWT tokens w localStorage<br/>2. Middleware sprawdza sesję przy każdym żądaniu<br/>3. API endpoints wymagają autentykacji<br/>4. Access tokens: TTL 1h, Refresh: 24h-30d<br/>5. Automatyczne odświeżanie tokenów<br/>6. RLS (Row Level Security) w produkcji<br/>7. Unikalne UUID tokeny dla niezarejestrowanych
```
</mermaid_diagram>

## Wyjaśnienie przepływów

### 1. Rejestracja (US-001)
Nowy użytkownik tworzy konto z emailem i hasłem. W MVP email confirmation jest **wyłączona**, więc użytkownik jest automatycznie logowany po rejestracji i przekierowywany do dashboard.

### 2. Logowanie (US-002)
Użytkownik podaje credentials, Supabase weryfikuje je i zwraca JWT tokens. Session jest przechowywana w localStorage przez Supabase SDK.

### 3. Dostęp do chronionej trasy (US-002 punkt 5)
Strony jak `/dashboard` i `/groups/:id` wymagają autentykacji. Middleware sprawdza sesję, a jeśli jej brak, przekierowuje do `/login` z parametrem `redirectTo`.

### 4. Automatyczne odświeżanie tokenu
Supabase SDK automatycznie wykrywa wygaśnięcie access token (1h TTL) i używa refresh token do pobrania nowego access token, bez przerywania działania aplikacji.

### 5. Reset hasła (US-003)
Dwuetapowy proces: wysłanie linku na email, a następnie ustawienie nowego hasła przez formularz. Po zmianie hasła wszystkie sesje użytkownika są unieważniane.

### 6. Wylogowanie (US-004)
Proste wywołanie `signOut()` unieważnia refresh token w bazie i usuwa session z localStorage.

### 7. Dostęp dla niezarejestrowanych (US-013)
Uczestnicy bez konta otrzymują unikalny link UUID do wyniku losowania. System śledzi otwarcia linku (PRD 3.4) przez zapisywanie `last_accessed_at` i `access_count`.

## Komponenty techniczne

### Middleware (`src/middleware/index.ts`)
- Dodaje `supabaseClient` do `context.locals`
- Sprawdza sesję przy każdym żądaniu
- Udostępnia `session` i `user` w `context.locals`

### Auth Utils (`src/lib/utils/auth.utils.ts`)
- `requireAuth()` - sprawdza sesję w Astro pages
- `getCurrentUser()` - pobiera aktualnego użytkownika
- `hasGroupAccess()` - weryfikuje dostęp do grupy

### API Auth Utils (`src/lib/utils/api-auth.utils.ts`)
- `requireApiAuth()` - sprawdza autentykację w API endpoints
- `requireGroupOwner()` - weryfikuje czy użytkownik jest twórcą grupy
- `requireGroupAccess()` - sprawdza dostęp jako twórca lub uczestnik

### React Components
- `LoginForm.tsx` - formularz logowania z walidacją Zod
- `RegisterForm.tsx` - formularz rejestracji
- `ForgotPasswordForm.tsx` - formularz zapomnienia hasła
- `ResetPasswordForm.tsx` - formularz nowego hasła
- `LogoutButton.tsx` - przycisk wylogowania
- `Dashboard.tsx` - pulpit użytkownika

### Astro Pages
- `/login.astro` - strona logowania
- `/register.astro` - strona rejestracji
- `/forgot-password.astro` - strona zapomnienia hasła
- `/reset-password.astro` - strona resetu hasła
- `/dashboard.astro` - pulpit użytkownika (chroniony)
- `/groups/[id].astro` - widok grupy (chroniony)
- `/results/[token].astro` - widok wyniku dla niezarejestrowanych (publiczny)

## Bezpieczeństwo

### JWT Tokens
- **Access Token**: JWT z TTL 1 godzina, zawiera `user_id`, `email`, `role`
- **Refresh Token**: TTL 24 godziny - 30 dni, służy do odnawiania access token

### Rate Limiting (Supabase Auth)
- Rejestracja: 10 prób/godzinę na IP
- Logowanie: 30 prób/godzinę na IP
- Reset hasła: 5 prób/godzinę na email

### Row Level Security (RLS)
W produkcji należy włączyć RLS na tabelach:
- `groups` - tylko twórca ma pełny dostęp
- `participants` - tylko twórca grupy może edytować
- `assignments` - tylko uczestnik widzi swoje przypisanie

### Tokeny dla niezarejestrowanych
- UUID v4 (trudny do odgadnięcia)
- Unikalny indeks w bazie
- Śledzenie dostępu (last_accessed_at, access_count)

## Status implementacji

✅ Obecny stan:
- Konfiguracja Supabase Client
- Middleware z supabaseClient
- Sprawdzanie sesji w `/groups/[id].astro`
- API endpoints z TODO dla autentykacji

❌ Do zaimplementowania:
- Rozszerzenie middleware o sesję
- Wszystkie strony autentykacji
- Wszystkie komponenty React
- Auth utils i API auth utils
- Aktualizacja wszystkich API endpoints
- Strona dashboard
- Strona `/results/[token]` dla niezarejestrowanych
- Konfiguracja Supabase Dashboard (redirect URLs, email templates)
- Migracja: dodanie `last_accessed_at` i `access_count` do `participants`
- Usunięcie `DEFAULT_USER_ID`
