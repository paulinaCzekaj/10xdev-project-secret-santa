# Specyfikacja Techniczna: Moduł Autentykacji - Secret Santa

## 1. WSTĘP

### 1.1. Cel dokumentu

Niniejszy dokument zawiera szczegółową specyfikację techniczną modułu autentykacji dla aplikacji Secret Santa. Specyfikacja opisuje architekturę, komponenty, kontrakt API oraz przepływy danych niezbędne do realizacji funkcjonalności określonych w PRD (US-001 do US-004).

### 1.2. Zakres funkcjonalny

Moduł autentykacji obejmuje następujące funkcjonalności:

- **US-001**: Rejestracja nowego użytkownika (email + hasło)
- **US-002**: Logowanie użytkownika
- **US-003**: Resetowanie hasła
- **US-004**: Wylogowanie użytkownika

### 1.3. Stack technologiczny

- **Frontend**: Astro 5 (SSR) + React 19 (komponenty interaktywne)
- **Backend**: Astro API Routes + Supabase jako BaaS
- **Autentykacja**: Supabase Auth
- **Walidacja**: Zod (schema validation)
- **Formularze**: React Hook Form + @hookform/resolvers
- **UI**: Shadcn/ui + Tailwind CSS 4
- **Typy**: TypeScript 5

### 1.4. Architektura obecna

Projekt już posiada:

- Konfigurację Supabase Client (`src/db/supabase.client.ts`)
- Middleware Astro dostarczający `supabaseClient` do `context.locals`
- Strukturę API endpointów w `src/pages/api/`
- Services layer (`src/lib/services/`)
- Kompletny system typów (`src/types.ts`)
- Migracje bazy danych w `supabase/migrations/`
- Istniejące endpointy używają `DEFAULT_USER_ID` - należy je zaktualizować

### 1.5. Założenia projektowe

1. **Bezpieczeństwo przede wszystkim**: Wszystkie operacje autentykacji wykorzystują Supabase Auth
2. **Server-Side Rendering**: Sprawdzanie sesji na poziomie serwera (Astro)
3. **Progressive Enhancement**: Strony działają bez JS, React dodaje interaktywność
4. **Atomowość**: Każdy komponent ma jedną, jasno określoną odpowiedzialność
5. **Typowanie**: Wszystkie dane są typowane TypeScript
6. **Walidacja**: Podwójna walidacja - client-side (UX) i server-side (bezpieczeństwo)
7. **Zgodność z istniejącym kodem**: Nowe elementy muszą integrować się z obecną strukturą

---

## 2. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 2.1. Struktura stron (Astro Pages)

#### 2.1.1. Strona logowania (`src/pages/login.astro`)

**Ścieżka**: `/login`
**Tryb renderowania**: SSR (`export const prerender = false`)
**Layout**: `src/layouts/AuthLayout.astro` (nowy - minimalistyczny layout bez nawigacji)

**Odpowiedzialność**:

- Sprawdzenie czy użytkownik jest już zalogowany (jeśli tak → redirect do `/dashboard`)
- Renderowanie komponentu `LoginForm` (React)
- Obsługa przekierowań po logowaniu
- Wyświetlanie komunikatów z URL query params (np. `?message=password_reset_success`)

**Logika SSR**:

```typescript
// Pseudo-kod struktury
const {
  data: { session },
} = await supabaseClient.auth.getSession();

if (session) {
  // Użytkownik już zalogowany
  const redirectTo = Astro.url.searchParams.get("redirectTo") || "/dashboard";
  return Astro.redirect(redirectTo);
}

// Pobierz komunikat z query params (jeśli istnieje)
const message = Astro.url.searchParams.get("message");
const messageText = getMessageText(message); // Helper do mapowania kodów na teksty
```

**Props przekazywane do komponentu**:

- `redirectTo?: string` - URL do przekierowania po logowaniu
- `message?: { type: 'success' | 'error' | 'info', text: string }` - Komunikat do wyświetlenia

**Meta tags**:

```html
<title>Logowanie | Secret Santa</title> <meta name="robots" content="noindex, nofollow" />
```

---

#### 2.1.2. Strona rejestracji (`src/pages/register.astro`)

**Ścieżka**: `/register`
**Tryb renderowania**: SSR
**Layout**: `src/layouts/AuthLayout.astro`

**Odpowiedzialność**:

- Sprawdzenie czy użytkownik jest już zalogowany (jeśli tak → redirect do `/dashboard`)
- Renderowanie komponentu `RegisterForm` (React)
- Obsługa przekierowań po rejestracji
- Wyświetlanie komunikatów informacyjnych

**Logika SSR**:

```typescript
const {
  data: { session },
} = await supabaseClient.auth.getSession();

if (session) {
  return Astro.redirect("/dashboard");
}
```

**Props przekazywane do komponentu**:

- `redirectTo?: string` - URL do przekierowania po rejestracji

**Meta tags**:

```html
<title>Rejestracja | Secret Santa</title> <meta name="robots" content="noindex, nofollow" />
```

---

#### 2.1.3. Strona resetowania hasła - krok 1 (`src/pages/forgot-password.astro`)

**Ścieżka**: `/forgot-password`
**Tryb renderowania**: SSR
**Layout**: `src/layouts/AuthLayout.astro`

**Odpowiedzialność**:

- Renderowanie komponentu `ForgotPasswordForm` (React)
- Wyświetlanie komunikatu sukcesu po wysłaniu emaila
- Opcjonalnie: sprawdzenie czy użytkownik jest zalogowany (może chcieć zmienić hasło)

**Logika SSR**:

```typescript
// Opcjonalne: pokazać komunikat jeśli użytkownik jest zalogowany
const {
  data: { session },
} = await supabaseClient.auth.getSession();
const isLoggedIn = !!session;
```

**Props przekazywane do komponentu**:

- `isLoggedIn: boolean` - Czy użytkownik jest zalogowany

**Meta tags**:

```html
<title>Resetowanie hasła | Secret Santa</title> <meta name="robots" content="noindex, nofollow" />
```

---

#### 2.1.4. Strona resetowania hasła - krok 2 (`src/pages/reset-password.astro`)

**Ścieżka**: `/reset-password`
**Tryb renderowania**: SSR
**Layout**: `src/layouts/AuthLayout.astro`

**Odpowiedzialność**:

- Walidacja tokenu resetowania hasła z URL (fragment hash lub query params)
- Renderowanie komponentu `ResetPasswordForm` (React) jeśli token jest ważny
- Wyświetlanie błędu jeśli token jest nieprawidłowy lub wygasł
- Przekierowanie do `/login` po udanym resecie

**Logika SSR**:

```typescript
// Supabase Auth przesyła token w URL jako fragment (#access_token=...)
// Astro nie ma bezpośredniego dostępu do fragmentu, więc:
// 1. Strona renderuje się
// 2. Client-side JS wyciąga token z window.location.hash
// 3. Token jest przekazywany do komponentu React

// Alternatywnie: konfiguracja Supabase Auth może użyć query params
const accessToken = Astro.url.searchParams.get("access_token");
const type = Astro.url.searchParams.get("type");

if (type !== "recovery") {
  // Nieprawidłowy lub brakujący token
  return Astro.redirect("/forgot-password?error=invalid_token");
}

// Token będzie weryfikowany w komponencie React przez Supabase Auth
```

**Props przekazywane do komponentu**:

- `accessToken?: string` - Token dostępu (może być null, wtedy pobierany client-side)

**Meta tags**:

```html
<title>Ustaw nowe hasło | Secret Santa</title> <meta name="robots" content="noindex, nofollow" />
```

---

#### 2.1.5. Dashboard użytkownika (`src/pages/dashboard.astro`)

**Ścieżka**: `/dashboard`
**Tryb renderowania**: SSR
**Layout**: `src/layouts/Layout.astro` (główny layout z nawigacją)

**Odpowiedzialność**:

- **Ochrona trasy**: Sprawdzenie sesji, przekierowanie do `/login` jeśli brak
- Pobranie danych użytkownika z Supabase Auth
- Pobranie list grup (utworzonych przez użytkownika i tych, do których należy)
- Renderowanie komponentu `Dashboard` (React) z danymi

**Logika SSR**:

```typescript
const {
  data: { session },
} = await supabaseClient.auth.getSession();

if (!session) {
  return Astro.redirect("/login?redirectTo=/dashboard");
}

// Pobierz ID użytkownika
const userId = session.user.id;

// Pobierz grupy z API (lub bezpośrednio z serwisu)
const groupService = new GroupService(supabaseClient);
const { data: groups } = await groupService.listGroups(userId, { filter: "all" });

// Rozdziel grupy na utworzone i dołączone
const createdGroups = groups.filter((g) => g.is_creator);
const joinedGroups = groups.filter((g) => !g.is_creator);
```

**Props przekazywane do komponentu**:

- `user: { id: string, email: string }` - Dane użytkownika
- `createdGroups: GroupListItemDTO[]` - Grupy utworzone przez użytkownika
- `joinedGroups: GroupListItemDTO[]` - Grupy, do których należy użytkownik

**Meta tags**:

```html
<title>Mój pulpit | Secret Santa</title> <meta name="robots" content="noindex, nofollow" />
```

---

#### 2.1.6. Aktualizacja strony głównej (`src/pages/index.astro`)

**Ścieżka**: `/`
**Obecny stan**: Wyświetla komponent `Welcome.astro` (placeholder)
**Zmiany**: Dodać logikę przekierowania dla zalogowanych użytkowników

**Logika SSR**:

```typescript
const {
  data: { session },
} = await supabaseClient.auth.getSession();

if (session) {
  // Użytkownik zalogowany - przekieruj do dashboard
  return Astro.redirect("/dashboard");
}

// Użytkownik niezalogowany - pokaż stronę powitalną/landing page
```

**Modyfikacje**:

- Dodać CTA (Call-to-Action) do rejestracji i logowania
- Zaktualizować `Welcome.astro` lub stworzyć nowy komponent `LandingPage.astro`

---

#### 2.1.7. Aktualizacja strony grupy (`src/pages/groups/[id].astro`)

**Ścieżka**: `/groups/:id`
**Obecny stan**: Sprawdza sesję i przekierowuje do `/login` jeśli brak
**Zmiany**: Aktualizacja komunikatu błędu i przekierowania

**Logika SSR** (obecna, do zachowania):

```typescript
const {
  data: { session },
} = await supabaseClient.auth.getSession();

if (!session) {
  return Astro.redirect(`/login?redirectTo=/groups/${id}`);
}

// Sprawdzenie dostępu do grupy (TODO już istnieje w kodzie)
// Walidacja czy użytkownik ma dostęp do tej grupy
```

**Modyfikacje**: Minimalne - kod już obsługuje autentykację

---

#### 2.1.8. Nowa strona: Tworzenie grupy (`src/pages/groups/new.astro`)

**Ścieżka**: `/groups/new`
**Obecny stan**: Strona już istnieje
**Zmiany**: Dodać sprawdzenie sesji (obecnie brak ochrony)

**Logika SSR do dodania**:

```typescript
const {
  data: { session },
} = await supabaseClient.auth.getSession();

if (!session) {
  return Astro.redirect("/login?redirectTo=/groups/new");
}
```

---

### 2.2. Nowy Layout: AuthLayout

**Plik**: `src/layouts/AuthLayout.astro`

**Odpowiedzialność**:

- Minimalistyczny layout dla stron autentykacji
- Brak nawigacji głównej aplikacji
- Centrowanie formularzy
- Wyświetlanie loga aplikacji
- Responsywny design

**Struktura**:

```astro
---
interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <title>{title}</title>
  </head>
  <body class="bg-gradient-to-br from-red-50 via-white to-green-50 min-h-screen">
    <div class="container mx-auto px-4 py-8 md:py-16">
      <div class="max-w-md mx-auto">
        <!-- Logo -->
        <div class="text-center mb-8">
          <a href="/">
            <h1 class="text-3xl font-bold text-red-600">🎅 Secret Santa</h1>
          </a>
        </div>

        <!-- Content slot -->
        <slot />

        <!-- Footer links -->
        <div class="mt-8 text-center text-sm text-gray-600">
          <slot name="footer-links" />
        </div>
      </div>
    </div>
    <Toaster client:load />
  </body>
</html>
```

---

### 2.3. Komponenty React (Formularze)

#### 2.3.1. LoginForm (`src/components/auth/LoginForm.tsx`)

**Odpowiedzialność**:

- Wyświetlanie i walidacja formularza logowania
- Obsługa submit (wywołanie Supabase Auth)
- Wyświetlanie błędów walidacji i błędów API
- Przekierowanie po udanym logowaniu

**Props**:

```typescript
interface LoginFormProps {
  redirectTo?: string;
  message?: {
    type: "success" | "error" | "info";
    text: string;
  };
}
```

**Schemat walidacji (Zod)**:

```typescript
const loginFormSchema = z.object({
  email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
});

type LoginFormData = z.infer<typeof loginFormSchema>;
```

**Struktura komponentu**:

- Wykorzystuje `react-hook-form` z `zodResolver`
- Pola: email (Input), password (Input type="password")
- Przycisk submit: "Zaloguj się"
- Link do `/forgot-password`
- Link do `/register` ("Nie masz konta?")

**UWAGA**: Checkbox "Zapamiętaj mnie" nie jest wymieniony w PRD, więc pomijamy go w MVP

**Logika submit**:

```typescript
const onSubmit = async (data: LoginFormData) => {
  setIsSubmitting(true);
  setApiError(null);

  try {
    const { data: authData, error } = await supabaseClient.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw error;
    }

    // Sukces - przekieruj
    toast.success("Zalogowano pomyślnie!");
    window.location.href = redirectTo || "/dashboard";
  } catch (error) {
    const errorMessage = getAuthErrorMessage(error);
    setApiError(errorMessage);
    toast.error("Błąd logowania", { description: errorMessage });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Error mapping** (helper):

```typescript
function getAuthErrorMessage(error: any): string {
  const errorMessages: Record<string, string> = {
    "Invalid login credentials": "Nieprawidłowy email lub hasło",
    "Email not confirmed": "Email nie został potwierdzony. Sprawdź swoją skrzynkę.",
    "User not found": "Użytkownik nie istnieje",
    // ... inne błędy
  };

  return errorMessages[error.message] || "Wystąpił błąd podczas logowania. Spróbuj ponownie.";
}
```

---

#### 2.3.2. RegisterForm (`src/components/auth/RegisterForm.tsx`)

**Odpowiedzialność**:

- Wyświetlanie i walidacja formularza rejestracji
- Obsługa submit (wywołanie Supabase Auth)
- Wyświetlanie błędów walidacji i błędów API
- Przekierowanie lub wyświetlenie komunikatu po rejestracji

**Props**:

```typescript
interface RegisterFormProps {
  redirectTo?: string;
}
```

**Schemat walidacji (Zod)**:

```typescript
const registerFormSchema = z
  .object({
    email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Hasło musi zawierać małą literę, dużą literę i cyfrę"),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerFormSchema>;
```

**Struktura komponentu**:

- Pola: email, password, confirmPassword
- Checkbox "Akceptuję regulamin" (wymagane)
- Przycisk submit: "Zarejestruj się"
- Link do `/login` ("Masz już konto?")

**Logika submit**:

```typescript
const onSubmit = async (data: RegisterFormData) => {
  setIsSubmitting(true);
  setApiError(null);

  try {
    const { data: authData, error } = await supabaseClient.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      throw error;
    }

    // UWAGA MVP: Email confirmation będzie WYŁĄCZONE (zgodnie z PRD US-001 punkt 5)
    // Zawsze oczekujemy auto-login po rejestracji

    // Sprawdź czy Supabase wymaga potwierdzenia email
    if (authData.user && !authData.session) {
      // Email confirmation required (nie powinno wystąpić w MVP)
      toast.success("Sprawdź swoją skrzynkę email!", {
        description: "Wysłaliśmy link potwierdzający. Kliknij w niego, aby aktywować konto.",
      });
      // W przyszłości (post-MVP): redirect do strony informacyjnej
      // window.location.href = '/email-confirmation-required';
    } else {
      // Auto-login enabled (no email confirmation) - DOMYŚLNE DLA MVP
      toast.success("Konto utworzone pomyślnie!");
      window.location.href = redirectTo || "/dashboard";
    }
  } catch (error) {
    const errorMessage = getAuthErrorMessage(error);
    setApiError(errorMessage);
    toast.error("Błąd rejestracji", { description: errorMessage });
  } finally {
    setIsSubmitting(false);
  }
};
```

---

#### 2.3.3. ForgotPasswordForm (`src/components/auth/ForgotPasswordForm.tsx`)

**Odpowiedzialność**:

- Wyświetlanie formularza z polem email
- Obsługa submit (wywołanie Supabase Auth resetPassword)
- Wyświetlenie komunikatu sukcesu po wysłaniu emaila

**Props**:

```typescript
interface ForgotPasswordFormProps {
  isLoggedIn?: boolean;
}
```

**Schemat walidacji (Zod)**:

```typescript
const forgotPasswordFormSchema = z.object({
  email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordFormSchema>;
```

**Struktura komponentu**:

- Pole: email
- Przycisk submit: "Wyślij link resetujący"
- Link do `/login` ("Pamiętasz hasło?")
- Stan sukcesu: komunikat "Email został wysłany"

**Logika submit**:

```typescript
const onSubmit = async (data: ForgotPasswordFormData) => {
  setIsSubmitting(true);
  setApiError(null);

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }

    // Sukces
    setEmailSent(true);
    toast.success("Email wysłany!", {
      description: "Sprawdź swoją skrzynkę i kliknij w link resetujący.",
    });
  } catch (error) {
    const errorMessage = getAuthErrorMessage(error);
    setApiError(errorMessage);
    toast.error("Błąd", { description: errorMessage });
  } finally {
    setIsSubmitting(false);
  }
};
```

---

#### 2.3.4. ResetPasswordForm (`src/components/auth/ResetPasswordForm.tsx`)

**Odpowiedzialność**:

- Weryfikacja tokenu dostępu
- Wyświetlanie formularza nowego hasła
- Obsługa submit (wywołanie Supabase Auth updateUser)
- Przekierowanie po udanej zmianie hasła

**Props**:

```typescript
interface ResetPasswordFormProps {
  accessToken?: string; // Może być null - wtedy pobierany z URL hash
}
```

**Schemat walidacji (Zod)**:

```typescript
const resetPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Hasło musi zawierać małą literę, dużą literę i cyfrę"),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;
```

**Struktura komponentu**:

- useEffect do weryfikacji tokenu przy montowaniu
- Pola: password, confirmPassword
- Przycisk submit: "Ustaw nowe hasło"
- Stan ładowania podczas weryfikacji tokenu
- Stan błędu jeśli token jest nieprawidłowy

**Logika inicjalizacji**:

```typescript
useEffect(() => {
  const verifyToken = async () => {
    // Pobierz token z props lub z URL hash
    const token = accessToken || extractTokenFromHash();

    if (!token) {
      setTokenError("Brak tokenu resetowania hasła");
      return;
    }

    try {
      // Supabase automatycznie weryfikuje token przy setSession
      const { error } = await supabaseClient.auth.setSession({
        access_token: token,
        refresh_token: "", // Nie jest wymagany dla recovery
      });

      if (error) {
        throw error;
      }

      setTokenValid(true);
    } catch (error) {
      setTokenError("Token jest nieprawidłowy lub wygasł");
    }
  };

  verifyToken();
}, [accessToken]);
```

**Logika submit**:

```typescript
const onSubmit = async (data: ResetPasswordFormData) => {
  setIsSubmitting(true);
  setApiError(null);

  try {
    const { error } = await supabaseClient.auth.updateUser({
      password: data.password,
    });

    if (error) {
      throw error;
    }

    // Sukces
    toast.success("Hasło zmienione pomyślnie!");
    // Przekieruj do logowania z komunikatem sukcesu
    window.location.href = "/login?message=password_reset_success";
  } catch (error) {
    const errorMessage = getAuthErrorMessage(error);
    setApiError(errorMessage);
    toast.error("Błąd", { description: errorMessage });
  } finally {
    setIsSubmitting(false);
  }
};
```

---

#### 2.3.5. Dashboard (`src/components/dashboard/Dashboard.tsx`)

**Odpowiedzialność**:

- Wyświetlanie powitania z imieniem użytkownika
- Lista grup utworzonych przez użytkownika
- Lista grup, do których użytkownik należy
- Przycisk "Utwórz nową grupę"
- Linki do szczegółów grup

**Props**:

```typescript
interface DashboardProps {
  user: {
    id: string;
    email: string;
  };
  createdGroups: GroupListItemDTO[];
  joinedGroups: GroupListItemDTO[];
}
```

**Struktura komponentu**:

- Header z powitaniem: "Witaj, {email}"
- Sekcja: "Grupy, które stworzyłem" z kartami grup
- Sekcja: "Grupy, do których należę" z kartami grup
- Empty state dla pustych list
- Przycisk CTA: "Utwórz nową grupę Secret Santa"

**Komponenty pomocnicze**:

- `GroupCard.tsx` - karta grupy z podstawowymi informacjami
- `EmptyState.tsx` - komunikat gdy brak grup

---

### 2.4. Komponenty Nawigacji

#### 2.4.1. Aktualizacja Layout.astro

**Plik**: `src/layouts/Layout.astro`

**Zmiany**:

- Dodać nawigację z przyciskami autentykacji
- Warunkowo renderować przyciski w zależności od stanu sesji

**Logika**:

```astro
---
const {
  data: { session },
} = await supabaseClient.auth.getSession();
const isLoggedIn = !!session;
const userEmail = session?.user?.email;
---

<!-- W body, przed <slot /> -->
<nav class="bg-white border-b border-gray-200">
  <div class="container mx-auto px-4">
    <div class="flex justify-between items-center h-16">
      <!-- Logo -->
      <a href={isLoggedIn ? "/dashboard" : "/"} class="text-xl font-bold text-red-600"> 🎅 Secret Santa </a>

      <!-- Auth buttons -->
      <div class="flex items-center gap-4">
        {
          isLoggedIn ? (
            <>
              <span class="text-sm text-gray-600">{userEmail}</span>
              <a href="/dashboard" class="text-sm text-gray-700 hover:text-red-600">
                Pulpit
              </a>
              <LogoutButton client:load />
            </>
          ) : (
            <>
              <a href="/login" class="text-sm text-gray-700 hover:text-red-600">
                Logowanie
              </a>
              <a href="/register" class="btn btn-primary">
                Rejestracja
              </a>
            </>
          )
        }
      </div>
    </div>
  </div>
</nav>
```

---

#### 2.4.2. LogoutButton (`src/components/auth/LogoutButton.tsx`)

**Odpowiedzialność**:

- Przycisk wylogowania
- Obsługa wywołania Supabase Auth signOut
- Przekierowanie do strony głównej po wylogowaniu

**Props**: Brak

**Struktura**:

```typescript
export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        throw error;
      }

      toast.success('Wylogowano pomyślnie');
      window.location.href = '/';
    } catch (error) {
      toast.error('Błąd podczas wylogowania');
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="text-sm text-gray-700 hover:text-red-600"
    >
      {isLoading ? 'Wylogowywanie...' : 'Wyloguj'}
    </button>
  );
}
```

---

### 2.5. Walidacja i komunikaty błędów

#### 2.5.1. Reguły walidacji

**Email**:

- Wymagany
- Format email (regex)
- Długość max 255 znaków

**Hasło (rejestracja/reset)**:

- Wymagane
- Minimum 8 znaków
- Co najmniej jedna mała litera
- Co najmniej jedna duża litera
- Co najmniej jedna cyfra
- Opcjonalnie: znak specjalny

**Hasło (logowanie)**:

- Wymagane
- Minimum 6 znaków (mniejsze wymagania dla kompatybilności)

**Potwierdzenie hasła**:

- Wymagane
- Musi być identyczne z hasłem

---

#### 2.5.2. Komunikaty błędów

**Walidacja client-side** (Zod):

- Wyświetlane pod polami formularza
- Kolor czerwony
- Ikona błędu
- Real-time validation (onChange)

**Błędy API** (Supabase Auth):

- Wyświetlane nad formularzem w Alert box
- Mapowanie błędów Supabase na polskie komunikaty
- Toast notification dla feedback

**Przykłady mapowania**:

```typescript
const authErrorMessages: Record<string, string> = {
  "Invalid login credentials": "Nieprawidłowy email lub hasło",
  "Email not confirmed": "Potwierdź swój email, aby się zalogować",
  "User already registered": "Użytkownik z tym adresem email już istnieje",
  "Password should be at least 6 characters": "Hasło musi mieć co najmniej 6 znaków",
  "Invalid email": "Nieprawidłowy format adresu email",
  "Email rate limit exceeded": "Zbyt wiele prób. Spróbuj ponownie później.",
  "Token has expired or is invalid": "Link wygasł lub jest nieprawidłowy",
};
```

---

### 2.6. Scenariusze użytkownika

#### 2.6.1. Scenariusz: Rejestracja nowego użytkownika

**Przebieg**:

1. Użytkownik wchodzi na `/` → widzi landing page z przyciskiem "Zarejestruj się"
2. Kliknięcie w "Zarejestruj się" → przekierowanie do `/register`
3. Wypełnienie formularza: email, hasło, potwierdzenie hasła
4. Zaznaczenie checkboxa "Akceptuję regulamin" (opcjonalne - nie wymienione w PRD)
5. Kliknięcie "Zarejestruj się"
6. **MVP - zgodnie z PRD US-001 punkt 5** (email confirmation **wyłączona**):
   - Auto-login
   - Toast: "Konto utworzone pomyślnie!"
   - Przekierowanie do `/dashboard`

**UWAGA**: Email confirmation będzie wyłączona w MVP aby spełnić wymóg PRD US-001 punkt 5:
"Po pomyślnej rejestracji jestem automatycznie logowany i przekierowany na główny pulpit (dashboard)"

**Obsługa błędów**:

- Email już istnieje → komunikat "Użytkownik z tym adresem email już istnieje"
- Hasła niezgodne → komunikat "Hasła nie są identyczne"
- Błąd serwera → komunikat "Wystąpił błąd. Spróbuj ponownie później."

---

#### 2.6.2. Scenariusz: Logowanie użytkownika

**Przebieg**:

1. Użytkownik wchodzi na `/login`
2. Wypełnienie formularza: email, hasło
3. Kliknięcie "Zaloguj się"
4. Supabase Auth weryfikuje credentials
5. Sukces:
   - Toast: "Zalogowano pomyślnie!"
   - Przekierowanie do `/dashboard` (lub `redirectTo` z query params)
6. Błąd:
   - Komunikat błędu w formularzu
   - Toast z opisem błędu

**Obsługa błędów**:

- Nieprawidłowe credentials → "Nieprawidłowy email lub hasło"
- Email nie potwierdzony → "Potwierdź swój email, aby się zalogować"
- Za dużo prób → "Zbyt wiele prób. Spróbuj ponownie później."

---

#### 2.6.3. Scenariusz: Resetowanie hasła

**Przebieg**:

1. Użytkownik na `/login` klika "Zapomniałem hasła"
2. Przekierowanie do `/forgot-password`
3. Wypełnienie pola email
4. Kliknięcie "Wyślij link resetujący"
5. Supabase wysyła email z linkiem
6. Toast: "Email wysłany! Sprawdź swoją skrzynkę."
7. Użytkownik klika link w emailu
8. Link prowadzi do `/reset-password?token=...`
9. Strona weryfikuje token
10. Jeśli token ważny → wyświetlenie formularza nowego hasła
11. Wypełnienie: nowe hasło, potwierdzenie hasła
12. Kliknięcie "Ustaw nowe hasło"
13. Sukces:
    - Toast: "Hasło zmienione pomyślnie!"
    - Przekierowanie do `/login?message=password_reset_success`
14. Komunikat na `/login`: "Hasło zostało zmienione. Zaloguj się przy użyciu nowego hasła."

**Obsługa błędów**:

- Token wygasł → komunikat "Link wygasł. Wygeneruj nowy link."
- Token nieprawidłowy → komunikat "Link jest nieprawidłowy"
- Nowe hasło za słabe → komunikaty walidacji

---

#### 2.6.4. Scenariusz: Wylogowanie użytkownika

**Przebieg**:

1. Zalogowany użytkownik klika przycisk "Wyloguj" w nawigacji
2. Wywołanie `supabaseClient.auth.signOut()`
3. Sukces:
   - Toast: "Wylogowano pomyślnie"
   - Przekierowanie do `/`
4. Błąd:
   - Toast z komunikatem błędu
   - Pozostanie na obecnej stronie

---

#### 2.6.5. Scenariusz: Dostęp do chronionej trasy bez logowania

**Przebieg**:

1. Użytkownik niezalogowany próbuje wejść na `/dashboard`
2. Middleware sprawdza sesję
3. Brak sesji → przekierowanie do `/login?redirectTo=/dashboard`
4. Komunikat: "Zaloguj się, aby kontynuować"
5. Po zalogowaniu → automatyczne przekierowanie do `/dashboard`

**Chronione trasy** (zgodnie z PRD US-002 punkt 5):

- `/dashboard`
- `/groups/new`
- `/groups/:id` (widok zarządzania grupą - wymaga autentykacji)

**Publiczne trasy**:

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/results/:token` (dostęp dla niezarejestrowanych przez token)

**WAŻNE - zgodność z PRD US-002**:

- **Punkt 5**: "Użytkownik nie może wchodzić na widok grupy bez logowania" → `/groups/:id` wymaga autentykacji
- **Punkt 6**: "Użytkownik może widzieć swój wynik w losowaniu bez logowania" → `/results/:token` jest publiczne
- **Rozwiązanie**: `/results/:token` to **osobna strona** od `/groups/:id`. Niezarejestrowani użytkownicy otrzymują link do `/results/:token`, nie do `/groups/:id`

---

## 3. LOGIKA BACKENDOWA

### 3.1. Aktualizacja Middleware

#### 3.1.1. Rozszerzenie istniejącego middleware (`src/middleware/index.ts`)

**Obecny stan**:
Middleware dostarcza tylko `supabaseClient` do `context.locals`.

**Zmiany**:

- Dodać pobieranie sesji użytkownika
- Dodać informacje o użytkowniku do `context.locals`
- Zachować kompatybilność wsteczną

**Nowa struktura**:

```typescript
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client";

export const onRequest = defineMiddleware(async (context, next) => {
  // Dodaj supabaseClient do locals (istniejące)
  context.locals.supabase = supabaseClient;

  // Pobierz sesję użytkownika
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  // Dodaj informacje o sesji i użytkowniku do locals
  context.locals.session = session;
  context.locals.user = session?.user ?? null;

  return next();
});
```

**Aktualizacja typów** (`src/env.d.ts`):

```typescript
/// <reference types="astro/client" />

import type { Database } from "./db/database.types";
import type { SupabaseClient } from "./db/supabase.client";
import type { Session, User } from "@supabase/supabase-js";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      session: Session | null;
      user: User | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

#### 3.1.2. Helper do ochrony tras

**Plik**: `src/lib/utils/auth.utils.ts` (nowy)

**Odpowiedzialność**:

- Helper functions do sprawdzania autentykacji
- Helpers do przekierowań
- Mapowanie komunikatów

**Struktura**:

```typescript
import type { AstroGlobal } from "astro";

/**
 * Sprawdza czy użytkownik jest zalogowany
 * Jeśli nie, przekierowuje do /login z parametrem redirectTo
 */
export function requireAuth(Astro: AstroGlobal): void {
  const { session } = Astro.locals;

  if (!session) {
    const redirectTo = Astro.url.pathname + Astro.url.search;
    return Astro.redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }
}

/**
 * Sprawdza czy użytkownik NIE jest zalogowany
 * Jeśli jest, przekierowuje do wskazanej lokalizacji (domyślnie /dashboard)
 */
export function requireGuest(Astro: AstroGlobal, redirectTo: string = "/dashboard"): void {
  const { session } = Astro.locals;

  if (session) {
    return Astro.redirect(redirectTo);
  }
}

/**
 * Pobiera aktualnego użytkownika
 * Rzuca wyjątek jeśli użytkownik nie jest zalogowany
 */
export function getCurrentUser(Astro: AstroGlobal) {
  const { user } = Astro.locals;

  if (!user) {
    throw new Error("User not authenticated");
  }

  return user;
}

/**
 * Sprawdza czy użytkownik ma dostęp do określonej grupy
 * @returns true jeśli użytkownik jest twórcą lub uczestnikiem grupy
 */
export async function hasGroupAccess(userId: string, groupId: number, supabase: any): Promise<boolean> {
  // Sprawdź czy użytkownik jest twórcą grupy
  const { data: group } = await supabase.from("groups").select("creator_id").eq("id", groupId).single();

  if (group?.creator_id === userId) {
    return true;
  }

  // Sprawdź czy użytkownik jest uczestnikiem grupy
  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();

  return !!participant;
}

/**
 * Mapowanie kodów komunikatów na teksty
 */
export function getMessageText(code: string | null): { type: string; text: string } | null {
  if (!code) return null;

  const messages: Record<string, { type: string; text: string }> = {
    password_reset_success: {
      type: "success",
      text: "Hasło zostało zmienione. Zaloguj się przy użyciu nowego hasła.",
    },
    email_confirmed: {
      type: "success",
      text: "Email został potwierdzony. Możesz się teraz zalogować.",
    },
    session_expired: {
      type: "info",
      text: "Twoja sesja wygasła. Zaloguj się ponownie.",
    },
    unauthorized: {
      type: "error",
      text: "Nie masz uprawnień do tej operacji.",
    },
  };

  return messages[code] || null;
}
```

---

### 3.2. Aktualizacja istniejących API endpoints

#### 3.2.1. Integracja autentykacji w endpointach

Wszystkie istniejące endpointy API używające `DEFAULT_USER_ID` muszą zostać zaktualizowane do używania rzeczywistego `user_id` z sesji.

**Przykład aktualizacji** (`src/pages/api/groups/index.ts`):

**Przed**:

```typescript
const groupService = new GroupService(supabase);
const group = await groupService.createGroup(DEFAULT_USER_ID, validatedData);
```

**Po**:

```typescript
// Guard: Sprawdź autentykację
const { session } = locals;
if (!session) {
  const errorResponse: ApiErrorResponse = {
    error: {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    },
  };
  return new Response(JSON.stringify(errorResponse), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

const userId = session.user.id;
const groupService = new GroupService(supabase);
const group = await groupService.createGroup(userId, validatedData);
```

---

#### 3.2.2. Lista endpointów do aktualizacji

**Endpointy wymagające autentykacji**:

1. **POST /api/groups** (`src/pages/api/groups/index.ts`)
   - Dodać sprawdzenie sesji
   - Użyć `session.user.id` zamiast `DEFAULT_USER_ID`

2. **GET /api/groups** (`src/pages/api/groups/index.ts`)
   - Dodać sprawdzenie sesji
   - Użyć `session.user.id` zamiast `DEFAULT_USER_ID`

3. **GET /api/groups/:id** (`src/pages/api/groups/[id]/index.ts`)
   - Dodać sprawdzenie sesji
   - Dodać walidację dostępu (czy użytkownik ma dostęp do grupy)
   - Użyć `session.user.id`

4. **PATCH /api/groups/:id** (`src/pages/api/groups/[id]/index.ts`)
   - Dodać sprawdzenie sesji
   - Sprawdzić czy użytkownik jest twórcą grupy
   - Użyć `session.user.id`

5. **DELETE /api/groups/:id** (`src/pages/api/groups/[id]/index.ts`)
   - Dodać sprawdzenie sesji
   - Sprawdzić czy użytkownik jest twórcą grupy
   - Użyć `session.user.id`

6. **POST /api/groups/:id/participants** (`src/pages/api/groups/[id]/participants.ts`)
   - Dodać sprawdzenie sesji
   - Sprawdzić czy użytkownik jest twórcą grupy
   - Użyć `session.user.id`

7. **GET /api/groups/:id/participants** (`src/pages/api/groups/[id]/participants.ts`)
   - Dodać sprawdzenie sesji
   - Sprawdzić czy użytkownik ma dostęp do grupy
   - Użyć `session.user.id`

8. **POST /api/groups/:id/exclusions** (`src/pages/api/groups/[id]/exclusions.ts`)
   - Dodać sprawdzenie sesji
   - Sprawdzić czy użytkownik jest twórcą grupy
   - Użyć `session.user.id`

9. **POST /api/groups/:id/draw** (`src/pages/api/groups/[id]/draw.ts`)
   - Dodać sprawdzenie sesji
   - Sprawdzić czy użytkownik jest twórcą grupy
   - Użyć `session.user.id`

10. **PATCH /api/participants/:id** (`src/pages/api/participants/[id].ts`)
    - Dodać sprawdzenie sesji
    - Sprawdzić czy użytkownik jest twórcą grupy
    - Użyć `session.user.id`

11. **DELETE /api/participants/:id** (`src/pages/api/participants/[id].ts`)
    - Dodać sprawdzenie sesji
    - Sprawdzić czy użytkownik jest twórcą grupy
    - Użyć `session.user.id`

---

#### 3.2.3. Wspólny pattern autentykacji dla API

**Helper do standaryzacji** (`src/lib/utils/api-auth.utils.ts`):

```typescript
import type { APIContext } from "astro";
import type { ApiErrorResponse } from "@/types";

/**
 * Weryfikuje sesję użytkownika w endpoincie API
 * Zwraca user_id lub odpowiedź 401
 */
export function requireApiAuth(context: APIContext): string | Response {
  const { session } = context.locals;

  if (!session) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return session.user.id;
}

/**
 * Sprawdza czy użytkownik jest twórcą grupy
 * Zwraca true lub odpowiedź 403
 */
export async function requireGroupOwner(context: APIContext, groupId: number): Promise<true | Response> {
  const userIdOrResponse = requireApiAuth(context);

  if (typeof userIdOrResponse !== "string") {
    return userIdOrResponse;
  }

  const userId = userIdOrResponse;
  const { supabase } = context.locals;

  const { data: group, error } = await supabase.from("groups").select("creator_id").eq("id", groupId).single();

  if (error || !group) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "NOT_FOUND",
        message: "Group not found",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (group.creator_id !== userId) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return true;
}

/**
 * Sprawdza czy użytkownik ma dostęp do grupy (jako twórca lub uczestnik)
 */
export async function requireGroupAccess(context: APIContext, groupId: number): Promise<true | Response> {
  const userIdOrResponse = requireApiAuth(context);

  if (typeof userIdOrResponse !== "string") {
    return userIdOrResponse;
  }

  const userId = userIdOrResponse;
  const { supabase } = context.locals;

  // Sprawdź czy użytkownik jest twórcą
  const { data: group } = await supabase.from("groups").select("creator_id").eq("id", groupId).single();

  if (group?.creator_id === userId) {
    return true;
  }

  // Sprawdź czy użytkownik jest uczestnikiem
  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();

  if (participant) {
    return true;
  }

  // Brak dostępu
  const errorResponse: ApiErrorResponse = {
    error: {
      code: "FORBIDDEN",
      message: "You do not have access to this group",
    },
  };
  return new Response(JSON.stringify(errorResponse), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
```

**Przykład użycia**:

```typescript
// W endpoincie
export const POST: APIRoute = async (context) => {
  const userIdOrResponse = requireApiAuth(context);

  // Jeśli nie jest stringiem, to jest to Response z błędem
  if (typeof userIdOrResponse !== "string") {
    return userIdOrResponse;
  }

  const userId = userIdOrResponse;
  // Kontynuuj z userId...
};
```

---

### 3.3. Linkowanie uczestników z kontami użytkowników

#### 3.3.1. Automatyczne linkowanie przy dodawaniu uczestnika

Gdy twórca grupy dodaje uczestnika z adresem email, system powinien sprawdzić czy istnieje konto z tym emailem i automatycznie połączyć uczestnika z użytkownikiem.

**Modyfikacja** (`src/lib/services/participant.service.ts`):

**W metodzie `addParticipant`** (lub podobnej):

```typescript
async addParticipant(
  groupId: number,
  command: CreateParticipantCommand
): Promise<ParticipantWithTokenDTO> {
  // Jeśli podano email, sprawdź czy użytkownik z tym emailem istnieje
  let userId: string | null = null;

  if (command.email) {
    const { data: user, error } = await this.supabase.auth.admin.getUserByEmail(
      command.email
    );

    if (user && !error) {
      userId = user.id;
    }
  }

  // Dodaj uczestnika z powiązaniem do użytkownika (jeśli znaleziono)
  const participantInsert: ParticipantInsert = {
    group_id: groupId,
    name: command.name,
    email: command.email || null,
    user_id: userId, // Może być null dla niezarejestrowanych
  };

  const { data, error } = await this.supabase
    .from('participants')
    .insert(participantInsert)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
```

**Uwaga**: `auth.admin.getUserByEmail()` wymaga użycia Service Role Key (server-side only). W MVP można uprościć i pominąć automatyczne linkowanie, realizując je później.

---

#### 3.3.2. Alternatywne podejście: Linkowanie przy logowaniu

Prościejsze podejście dla MVP:

- Uczestnicy są dodawani bez `user_id`
- Gdy zalogowany użytkownik wchodzi do grupy, system sprawdza czy jego email pasuje do któregoś uczestnika
- Jeśli tak, automatycznie linkuje uczestnika z kontem

**Hook w middleware lub w komponencie Dashboard**:

```typescript
// Pseudo-kod
async function linkParticipantsOnLogin(userId: string, userEmail: string, supabase: any) {
  // Znajdź wszystkich uczestników z tym emailem bez user_id
  const { data: participants } = await supabase
    .from("participants")
    .select("id")
    .eq("email", userEmail)
    .is("user_id", null);

  if (participants && participants.length > 0) {
    // Zaktualizuj wszystkich znalezionych uczestników
    await supabase
      .from("participants")
      .update({ user_id: userId })
      .in(
        "id",
        participants.map((p) => p.id)
      );
  }
}
```

---

### 3.4. Walidacja i error handling

#### 3.4.1. Walidacja na poziomie API

Wszystkie endpointy powinny mieć jednolitą strukturę walidacji:

**Schemat walidacji**:

1. Sprawdzenie autentykacji (`requireApiAuth`)
2. Sprawdzenie uprawnień (`requireGroupOwner` / `requireGroupAccess`)
3. Walidacja danych wejściowych (Zod schema)
4. Wykonanie operacji biznesowej
5. Obsługa błędów

**Przykład pełnego endpointu** (POST /api/groups):

```typescript
export const POST: APIRoute = async (context) => {
  const { request, locals } = context;

  // Guard 1: Autentykacja
  const userIdOrResponse = requireApiAuth(context);
  if (typeof userIdOrResponse !== "string") {
    return userIdOrResponse;
  }
  const userId = userIdOrResponse;

  // Guard 2: Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INVALID_REQUEST",
        message: "Invalid JSON in request body",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Guard 3: Walidacja danych
  let validatedData: CreateGroupCommand;
  try {
    validatedData = CreateGroupSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_INPUT",
          message: firstError.message,
          details: {
            field: firstError.path.join("."),
            value: (body as any)?.[firstError.path[0]],
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw error;
  }

  // Wykonanie operacji
  try {
    const groupService = new GroupService(locals.supabase);
    const group = await groupService.createGroup(userId, validatedData);

    return new Response(JSON.stringify(group), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[POST /api/groups] Error:", error);

    const errorResponse: ApiErrorResponse = {
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to create group",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

---

#### 3.4.2. Standaryzowane kody błędów API

**Kody błędów** (`src/types.ts` - już istnieje ApiErrorResponse):

```typescript
// Rozszerzenie istniejącego typu
export type ApiErrorCode =
  | "UNAUTHORIZED" // 401 - Brak autentykacji
  | "FORBIDDEN" // 403 - Brak uprawnień
  | "NOT_FOUND" // 404 - Zasób nie istnieje
  | "INVALID_REQUEST" // 422 - Nieprawidłowy format żądania
  | "INVALID_INPUT" // 400 - Nieprawidłowe dane wejściowe
  | "VALIDATION_ERROR" // 400 - Błąd walidacji
  | "MISSING_FIELD" // 422 - Brakujące pole
  | "DATABASE_ERROR" // 500 - Błąd bazy danych
  | "SERVER_ERROR"; // 500 - Ogólny błąd serwera

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

---

### 3.5. Services Layer - Aktualizacje

#### 3.5.1. Aktualizacja GroupService

**Plik**: `src/lib/services/group.service.ts`

**Zmiany**:

- Wszystkie metody przyjmują `userId` jako pierwszy parametr
- Usunięcie referencji do `DEFAULT_USER_ID`
- Dodanie metod sprawdzających uprawnienia

**Nowe metody**:

```typescript
/**
 * Sprawdza czy użytkownik jest twórcą grupy
 */
async isGroupCreator(userId: string, groupId: number): Promise<boolean> {
  const { data } = await this.supabase
    .from('groups')
    .select('creator_id')
    .eq('id', groupId)
    .single();

  return data?.creator_id === userId;
}

/**
 * Sprawdza czy użytkownik ma dostęp do grupy (jako twórca lub uczestnik)
 */
async hasGroupAccess(userId: string, groupId: number): Promise<boolean> {
  // Sprawdź czy jest twórcą
  if (await this.isGroupCreator(userId, groupId)) {
    return true;
  }

  // Sprawdź czy jest uczestnikiem
  const { data } = await this.supabase
    .from('participants')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  return !!data;
}
```

---

#### 3.5.2. Aktualizacja ParticipantService

**Plik**: `src/lib/services/participant.service.ts`

**Zmiany**:

- Dodanie automatycznego linkowania uczestników (jeśli implementowane)
- Metody walidujące dostęp

---

### 3.6. Testy i walidacja

#### 3.6.1. Scenariusze testowe dla API

**Test 1: Tworzenie grupy jako zalogowany użytkownik**

- Request: POST /api/groups z valid data + auth token
- Expected: 201 Created, grupa z `creator_id = user.id`

**Test 2: Tworzenie grupy bez autentykacji**

- Request: POST /api/groups bez auth token
- Expected: 401 Unauthorized

**Test 3: Dostęp do grupy jako twórca**

- Request: GET /api/groups/:id przez użytkownika będącego twórcą
- Expected: 200 OK z danymi grupy

**Test 4: Dostęp do grupy jako uczestnik**

- Request: GET /api/groups/:id przez użytkownika będącego uczestnikiem
- Expected: 200 OK z danymi grupy

**Test 5: Dostęp do grupy bez uprawnień**

- Request: GET /api/groups/:id przez użytkownika nie należącego do grupy
- Expected: 403 Forbidden

**Test 6: Edycja grupy przez nie-twórcę**

- Request: PATCH /api/groups/:id przez uczestnika (nie twórcy)
- Expected: 403 Forbidden

**Test 7: Usunięcie grupy przez twórcę**

- Request: DELETE /api/groups/:id przez twórcę
- Expected: 204 No Content

---

## 4. SYSTEM AUTENTYKACJI

### 4.1. Konfiguracja Supabase Auth

#### 4.1.1. Obecna konfiguracja

Projekt już posiada:

- Zainstalowany pakiet `@supabase/supabase-js` (v2.75.0)
- Skonfigurowany `supabaseClient` w `src/db/supabase.client.ts`
- Zmienne środowiskowe: `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_ANON_KEY`

**Brak**:

- Konfiguracji redirect URLs w Supabase Dashboard
- Konfiguracji email templates
- Ustawień polityk haseł

---

#### 4.1.2. Wymagane zmiany w Supabase Dashboard

**1. Redirect URLs (Authentication → URL Configuration)**

Dodać dozwolone URL przekierowań:

```
# Development
http://localhost:3000/dashboard
http://localhost:3000/reset-password

# Production
https://yourdomain.com/dashboard
https://yourdomain.com/reset-password
```

**2. Email Templates (Authentication → Email Templates)**

**Szablon: Confirm Signup**

```html
<h2>Potwierdź swoje konto</h2>
<p>Witaj w Secret Santa!</p>
<p>Kliknij poniższy link, aby potwierdzić swoje konto:</p>
<p><a href="{{ .ConfirmationURL }}">Potwierdź email</a></p>
<p>Link wygasa za 24 godziny.</p>
```

**Szablon: Reset Password**

```html
<h2>Resetowanie hasła</h2>
<p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta Secret Santa.</p>
<p>Kliknij poniższy link, aby ustawić nowe hasło:</p>
<p><a href="{{ .ConfirmationURL }}">Zresetuj hasło</a></p>
<p>Link wygasa za 1 godzinę.</p>
<p>Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
```

**3. Polityki haseł (Authentication → Policies)**

- Minimum 6 znaków (dla kompatybilności z istniejącymi użytkownikami)
- W aplikacji: walidacja 8+ znaków + litery + cyfry dla nowych kont

**4. Email Confirmation**

- **MVP**: **WYŁĄCZONA** (auto-confirm users) - zgodnie z PRD US-001 punkt 5: "Po pomyślnej rejestracji jestem automatycznie logowany i przekierowany na główny pulpit (dashboard)"
- **Przyszłość**: Włączona dla bezpieczeństwa (post-MVP)

---

### 4.2. Przepływy autentykacji Supabase

#### 4.2.1. Rejestracja (signUp)

**Metoda**: `supabaseClient.auth.signUp()`

**Parametry**:

```typescript
{
  email: string;
  password: string;
  options?: {
    emailRedirectTo?: string;
    data?: object; // metadata użytkownika
  }
}
```

**Proces**:

1. Użytkownik wypełnia formularz rejestracji
2. Client wywołuje `signUp()` z email i hasłem
3. **Jeśli email confirmation wyłączona**:
   - Supabase tworzy konto i automatycznie loguje użytkownika
   - Zwraca `session` i `user`
   - Frontend przekierowuje do `/dashboard`
4. **Jeśli email confirmation włączona**:
   - Supabase tworzy konto ale nie loguje
   - Zwraca `user` bez `session`
   - Wysyła email z linkiem potwierdzającym
   - Frontend pokazuje komunikat "Sprawdź email"
   - Użytkownik klika link → przekierowanie do `/dashboard` + auto-login

**Kluczowe uwagi**:

- Email musi być unikalny w bazie `auth.users`
- Hasło jest hashowane przez Supabase (bcrypt)
- Session token jest przechowywany w localStorage (przez Supabase SDK)

---

#### 4.2.2. Logowanie (signInWithPassword)

**Metoda**: `supabaseClient.auth.signInWithPassword()`

**Parametry**:

```typescript
{
  email: string;
  password: string;
}
```

**Proces**:

1. Użytkownik wypełnia formularz logowania
2. Client wywołuje `signInWithPassword()`
3. Supabase weryfikuje credentials
4. **Sukces**:
   - Zwraca `session` (access_token, refresh_token) i `user`
   - SDK automatycznie zapisuje session w localStorage
   - Frontend przekierowuje do `/dashboard` (lub `redirectTo`)
5. **Błąd**:
   - Zwraca error z kodem (np. "Invalid login credentials")
   - Frontend wyświetla zmapowany komunikat błędu

**Kluczowe uwagi**:

- Session ma domyślny TTL (Time To Live) 1 godzinę
- Refresh token ma TTL 24 godziny (może być dłużej w zależności od konfiguracji)
- SDK automatycznie refreshuje tokeny w tle

---

#### 4.2.3. Wylogowanie (signOut)

**Metoda**: `supabaseClient.auth.signOut()`

**Proces**:

1. Użytkownik klika "Wyloguj"
2. Client wywołuje `signOut()`
3. Supabase unieważnia refresh token
4. SDK usuwa session z localStorage
5. Frontend przekierowuje do `/`

**Kluczowe uwagi**:

- `signOut()` zawsze zwraca sukces (nawet jeśli użytkownik nie był zalogowany)
- Po wylogowaniu wszystkie chronione trasy powinny przekierować do `/login`

---

#### 4.2.4. Reset hasła (resetPasswordForEmail + updateUser)

**Metoda 1**: `supabaseClient.auth.resetPasswordForEmail()`

**Parametry**:

```typescript
{
  email: string;
  options?: {
    redirectTo?: string;
  }
}
```

**Proces - Krok 1** (Wysłanie emaila):

1. Użytkownik wchodzi na `/forgot-password`
2. Wypełnia pole email
3. Client wywołuje `resetPasswordForEmail()`
4. Supabase wysyła email z linkiem resetującym
5. Link zawiera token: `/reset-password#access_token=...&type=recovery`
6. Frontend pokazuje komunikat "Email wysłany"

**Metoda 2**: `supabaseClient.auth.updateUser()`

**Parametry**:

```typescript
{
  password: string;
}
```

**Proces - Krok 2** (Ustawienie nowego hasła):

1. Użytkownik klika link w emailu
2. Przekierowanie do `/reset-password` z tokenem w URL
3. Frontend wyciąga token i wywołuje `setSession()` aby zweryfikować token
4. Jeśli token ważny, wyświetla formularz nowego hasła
5. Użytkownik wypełnia nowe hasło
6. Client wywołuje `updateUser({ password: newPassword })`
7. Supabase aktualizuje hasło
8. Frontend przekierowuje do `/login` z komunikatem sukcesu

**Kluczowe uwagi**:

- Token resetowania ma TTL 1 godzinę
- Token może być użyty tylko raz
- Po użyciu tokenu wszystkie sesje użytkownika są unieważniane

---

#### 4.2.5. Sesje i tokeny

**Access Token**:

- JWT zawierający `user_id`, `email`, `role` i inne metadata
- TTL: 1 godzina (domyślnie)
- Używany do autoryzacji w API

**Refresh Token**:

- Token do odnawiania access token
- TTL: 24 godziny - 30 dni (konfigurowalny)
- Przechowywany w localStorage przez SDK

**Automatyczny refresh**:

- Supabase SDK automatycznie odświeża access token przed wygaśnięciem
- Nie wymaga interwencji developera

**Pobieranie sesji**:

```typescript
const {
  data: { session },
} = await supabaseClient.auth.getSession();

if (session) {
  const userId = session.user.id;
  const accessToken = session.access_token;
  // ...
}
```

**Nasłuchiwanie zmian sesji** (opcjonalnie):

```typescript
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN") {
    // Użytkownik zalogowany
  } else if (event === "SIGNED_OUT") {
    // Użytkownik wylogowany
  } else if (event === "TOKEN_REFRESHED") {
    // Token odświeżony
  }
});
```

---

### 4.3. Bezpieczeństwo

#### 4.3.1. Row Level Security (RLS)

**Obecny stan**: RLS wyłączony dla development (komentarze w migracjach)
**Przyszłość**: Należy włączyć RLS przed production

**Przykładowe polityki** (z migracji, zakomentowane):

**Grupy** (`groups` table):

```sql
-- Twórca ma pełny dostęp do swoich grup
CREATE POLICY "Creators have full access to their groups"
ON public.groups
FOR ALL
TO authenticated
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

-- Uczestnicy mogą przeglądać grupy, do których należą
CREATE POLICY "Participants can view their groups"
ON public.groups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.participants
    WHERE group_id = public.groups.id AND user_id = auth.uid()
  )
);
```

**Uczestnicy** (`participants` table):

```sql
-- Twórcy grup mogą zarządzać uczestnikami
CREATE POLICY "Group creators can manage participants"
ON public.participants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = public.participants.group_id AND creator_id = auth.uid()
  )
);

-- Użytkownicy mogą zobaczyć innych uczestników w swoich grupach
CREATE POLICY "Users can view participants in their groups"
ON public.participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.participants AS my_participation
    WHERE my_participation.group_id = public.participants.group_id
    AND my_participation.user_id = auth.uid()
  )
);
```

**Aktywacja RLS**:

```sql
-- W przyszłości, przed production:
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
-- ... pozostałe tabele
```

---

#### 4.3.2. HTTPS i ciasteczka

**Development**:

- HTTP localhost jest OK
- Ciasteczka session przechowywane w localStorage

**Production**:

- HTTPS obowiązkowe
- Opcjonalnie: przejście na httpOnly cookies dla lepszego bezpieczeństwa

**Konfiguracja dla cookies** (opcjonalnie, post-MVP):

```typescript
const supabase = createClient(url, key, {
  auth: {
    storage: customStorage, // Custom storage używający httpOnly cookies
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

---

#### 4.3.3. Rate limiting

Supabase Auth ma wbudowane rate limiting:

- **Rejestracja**: 10 prób / godzinę na IP
- **Logowanie**: 30 prób / godzinę na IP
- **Reset hasła**: 5 prób / godzinę na email

**Obsługa błędu**:

```typescript
// Error: Email rate limit exceeded
if (error.message.includes("rate limit")) {
  toast.error("Zbyt wiele prób. Spróbuj ponownie później.");
}
```

---

#### 4.3.4. Walidacja input

**Client-side** (UX):

- Zod schemas w komponentach React
- Real-time validation z React Hook Form

**Server-side** (bezpieczeństwo):

- Walidacja w API endpointach (już istnieje)
- Supabase automatycznie sanitizuje input SQL injection

**CSRF**:

- Nie dotyczy, bo używamy JWT (stateless auth)
- Brak cookies = brak problemu CSRF

---

### 4.4. Dostęp dla niezarejestrowanych uczestników

#### 4.4.1. Access token w tabeli participants

Każdy uczestnik (niezależnie czy ma konto) ma unikalny `access_token` generowany przy dodawaniu do grupy.

**Z migracji** (`20251013000001_add_access_token_to_participants.sql`):

```sql
ALTER TABLE public.participants
ADD COLUMN access_token text NOT NULL DEFAULT gen_random_uuid()::text;

CREATE UNIQUE INDEX participants_access_token_idx
ON public.participants(access_token);
```

**Generowanie tokenu**:

- Automatycznie przy INSERT (default value)
- UUID v4 (trudny do odgadnięcia)
- Unikalny w całej tabeli

**Śledzenie dostępu** (OBOWIĄZKOWE zgodnie z PRD 3.4 i US-013):
Wymagana nowa migracja dodająca kolumny:

```sql
ALTER TABLE public.participants
ADD COLUMN last_accessed_at timestamptz,
ADD COLUMN access_count integer DEFAULT 0 NOT NULL;
```

Te kolumny będą aktualizowane przy każdym dostępie do `/results/:token`

---

#### 4.4.2. Endpoint dostępu przez token

**Planowany endpoint**: `GET /api/results/:token` lub `GET /results/:token` (strona Astro)

**Logika**:

1. Niezarejestrowany użytkownik dostaje link: `/results/:token`
2. Strona sprawdza czy token istnieje w `participants`
3. Jeśli tak, wyciąga:
   - Dane uczestnika (name, email)
   - Dane grupy (name, budget, end_date)
   - Wynik losowania (kogo obdarowuje)
   - Listę życzeń osoby obdarowanej
   - Własną listę życzeń (edytowalna)
4. Renderuje widok wyniku (taki sam jak dla zalogowanych)

**Przykład implementacji** (Astro page):

```typescript
// src/pages/results/[token].astro
---
export const prerender = false;

const { token } = Astro.params;

// Znajdź uczestnika po tokenie
const { data: participant } = await supabaseClient
  .from('participants')
  .select('*, groups(*), assignments(*)')
  .eq('access_token', token)
  .single();

if (!participant) {
  return Astro.redirect('/404');
}

// OBOWIĄZKOWE: Śledź dostęp do linku (PRD 3.4, US-013 punkt 4)
await supabaseClient
  .from('participants')
  .update({
    last_accessed_at: new Date().toISOString(),
    access_count: (participant.access_count || 0) + 1,
  })
  .eq('id', participant.id);

// Pobierz szczegóły wyniku losowania
// ...
---

<Layout>
  <ResultView client:load data={resultData} />
</Layout>
```

**Bezpieczeństwo**:

- Token jest trudny do odgadnięcia (UUID v4)
- Brak rate limiting (bo token jest "hasłem")
- **Śledzenie otwarć (OBOWIĄZKOWE dla MVP - zgodnie z PRD 3.4 i US-013)**:
  - `last_accessed_at` - data i czas ostatniego dostępu
  - `access_count` - liczba otwarć linku
  - Implementacja: UPDATE w endpoint /results/:token przy każdym dostępie

---

#### 4.4.3. Migracja do konta zarejestrowanego

**Scenariusz**: Niezarejestrowany uczestnik chce założyć konto

**Proces**:

1. Niezarejestrowany uczestnik ma `email` w `participants` (ale `user_id` jest NULL)
2. Uczestnik rejestruje się z tym samym emailem
3. System automatycznie linkuje uczestnika z nowym kontem (sekcja 3.3)
4. Następnym razem uczestnik loguje się normalnie i widzi grupę na `/dashboard`

---

### 4.5. Integracja z istniejącym kodem

#### 4.5.1. Usunięcie DEFAULT_USER_ID

**Obecny plik**: `src/db/supabase.client.ts`

```typescript
export const DEFAULT_USER_ID = "94ea8dc9-638c-4b4b-87f5-f6b0846b790b";
```

**Akcja**: Usunąć tę stałą po integracji autentykacji

**Miejsca do aktualizacji**:

- Wszystkie endpointy API (sekcja 3.2)
- Wszystkie serwisy (sekcja 3.5)
- Komponenty wykorzystujące hardcoded user ID

---

#### 4.5.2. Aktualizacja komponentów

**CreateGroupForm** (już używa sesji):

- Już pobiera `session.access_token` dla API calls ✓
- Brak zmian wymaganych

**GroupView i inne komponenty**:

- Powinny działać z nowym systemem bez zmian
- Dane użytkownika pochodzą z API endpointów (które będą używać prawdziwych user ID)

---

#### 4.5.3. Migracje bazy danych

**Obecne migracje są OK** - nie wymagają zmian:

- Tabela `participants` już ma `user_id uuid references auth.users(id)`
- Tabela `groups` już ma `creator_id uuid references auth.users(id)`
- Access tokeny są już zaimplementowane

**Jedyna zmiana**: Aktywacja RLS (przed production)

---

## 5. PODSUMOWANIE I NASTĘPNE KROKI

### 5.1. Architektura końcowa

**Frontend**:

- 4 strony autentykacji: login, register, forgot-password, reset-password
- 1 dashboard użytkownika
- Nawigacja z przyciskami autentykacji
- 5 komponentów React: LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm, LogoutButton

**Backend**:

- Middleware dostarczający sesję do wszystkich tras
- Helpers do ochrony tras (auth.utils.ts, api-auth.utils.ts)
- 11 endpointów API zaktualizowanych o autentykację
- Services layer z metodami sprawdzającymi uprawnienia

**Autentykacja**:

- Supabase Auth jako provider
- JWT tokens (access + refresh)
- Email/hasło jako metoda logowania
- Reset hasła przez email
- Access tokeny dla niezarejestrowanych uczestników

---

### 5.2. Kolejność implementacji

**Faza 1: Podstawowa autentykacja** (priorytet wysoki)

1. Rozszerzenie middleware o pobieranie sesji
2. Aktualizacja typów w `env.d.ts`
3. Stworzenie `AuthLayout.astro`
4. Implementacja `LoginForm.tsx` i strony `/login`
5. Implementacja `RegisterForm.tsx` i strony `/register`
6. Implementacja `LogoutButton.tsx`
7. Aktualizacja `Layout.astro` z nawigacją
8. Ochrona tras: dodanie guards do `/dashboard`, `/groups/new`, `/groups/[id]`

**Faza 2: Aktualizacja API** (priorytet wysoki)

1. Implementacja helperów: `auth.utils.ts`, `api-auth.utils.ts`
2. Aktualizacja wszystkich 11 endpointów API (dodanie autentykacji)
3. Usunięcie `DEFAULT_USER_ID` z kodu
4. Aktualizacja serwisów (GroupService, ParticipantService)

**Faza 3: Reset hasła** (priorytet średni)

1. Konfiguracja email templates w Supabase Dashboard
2. Konfiguracja redirect URLs
3. Implementacja `ForgotPasswordForm.tsx` i `/forgot-password`
4. Implementacja `ResetPasswordForm.tsx` i `/reset-password`

**Faza 4: Dashboard** (priorytet średni)

1. Implementacja strony `/dashboard.astro`
2. Implementacja komponentu `Dashboard.tsx`
3. Implementacja pomocniczych komponentów: GroupCard, EmptyState

**Faza 5: Linkowanie uczestników** (priorytet niski)

1. Implementacja automatycznego linkowania przy logowaniu (sekcja 3.3.2)
2. Aktualizacja `ParticipantService` (opcjonalne, sekcja 3.3.1)

**Faza 6: Bezpieczeństwo** (przed production)

1. Aktywacja RLS na wszystkich tabelach
2. Test wszystkich polityk RLS
3. Wymuszenie HTTPS
4. Przegląd bezpieczeństwa (security audit)

---

### 5.3. Checklist implementacji

**UI (Frontend)**:

- [ ] `src/layouts/AuthLayout.astro`
- [ ] `src/pages/login.astro`
- [ ] `src/pages/register.astro`
- [ ] `src/pages/forgot-password.astro`
- [ ] `src/pages/reset-password.astro`
- [ ] `src/pages/dashboard.astro`
- [ ] **`src/pages/results/[token].astro`** (OBOWIĄZKOWE - dla niezarejestrowanych US-013)
- [ ] `src/components/auth/LoginForm.tsx`
- [ ] `src/components/auth/RegisterForm.tsx`
- [ ] `src/components/auth/ForgotPasswordForm.tsx`
- [ ] `src/components/auth/ResetPasswordForm.tsx`
- [ ] `src/components/auth/LogoutButton.tsx`
- [ ] `src/components/dashboard/Dashboard.tsx`
- [ ] `src/components/dashboard/GroupCard.tsx`
- [ ] `src/components/dashboard/EmptyState.tsx`
- [ ] Aktualizacja `src/layouts/Layout.astro` (nawigacja)
- [ ] Aktualizacja `src/pages/index.astro` (przekierowanie)
- [ ] Aktualizacja `src/pages/groups/[id].astro` (komunikaty)
- [ ] Aktualizacja `src/pages/groups/new.astro` (ochrona)

**Backend**:

- [ ] Aktualizacja `src/middleware/index.ts`
- [ ] Aktualizacja `src/env.d.ts`
- [ ] Nowy plik `src/lib/utils/auth.utils.ts`
- [ ] Nowy plik `src/lib/utils/api-auth.utils.ts`
- [ ] Aktualizacja `src/pages/api/groups/index.ts` (POST i GET)
- [ ] Aktualizacja `src/pages/api/groups/[id]/index.ts` (GET, PATCH, DELETE)
- [ ] Aktualizacja `src/pages/api/groups/[id]/participants.ts` (POST, GET)
- [ ] Aktualizacja `src/pages/api/groups/[id]/exclusions.ts`
- [ ] Aktualizacja `src/pages/api/groups/[id]/draw.ts`
- [ ] Aktualizacja `src/pages/api/participants/[id].ts` (PATCH, DELETE)
- [ ] Aktualizacja `src/lib/services/group.service.ts`
- [ ] Aktualizacja `src/lib/services/participant.service.ts`
- [ ] Usunięcie `DEFAULT_USER_ID` z `src/db/supabase.client.ts`

**Konfiguracja Supabase**:

- [ ] Konfiguracja Redirect URLs w Dashboard
- [ ] Konfiguracja Email Templates (Confirm Signup, Reset Password)
- [ ] Konfiguracja polityk haseł
- [ ] **Email confirmation: WYŁĄCZONE w MVP** (zgodnie z PRD US-001 punkt 5)
- [ ] **Nowa migracja: dodanie last_accessed_at i access_count do participants** (OBOWIĄZKOWE - PRD 3.4)

**Testy**:

- [ ] Test rejestracji nowego użytkownika
- [ ] Test logowania użytkownika
- [ ] Test wylogowania
- [ ] Test reset hasła (pełny flow)
- [ ] Test ochrony tras (próba dostępu bez auth)
- [ ] Test endpointów API bez auth (401)
- [ ] Test endpointów API z auth (200/201)
- [ ] Test uprawnień (twórca vs uczestnik vs obcy)
- [ ] Test linkowania uczestników z kontami

---

### 5.4. Znane ograniczenia i przyszłe usprawnienia

**Ograniczenia MVP**:

1. Brak weryfikacji emaila (dla uproszczenia)
2. Brak uwierzytelniania dwuskładnikowego (2FA)
3. Brak logowania przez OAuth (Google, Facebook)
4. Brak zarządzania sesjami (lista aktywnych sesji)
5. Brak możliwości zmiany emaila
6. Brak możliwości usunięcia konta
7. RLS wyłączone (dla development)

**Przyszłe usprawnienia** (post-MVP):

1. **Email verification**: Włączenie potwierdzania emaila przed logowaniem
2. **OAuth providers**: Dodanie logowania przez Google, Facebook, GitHub
3. **2FA**: Implementacja dwuskładnikowego uwierzytelniania (TOTP)
4. **Session management**: Panel zarządzania aktywnymi sesjami
5. **Account settings**: Strona ustawień konta (zmiana emaila, hasła, usunięcie konta)
6. **Remember me**: Opcja "Zapamiętaj mnie" (dłuższy refresh token)
7. **RLS activation**: Włączenie Row Level Security przed production
8. **Audit log**: Logowanie wszystkich operacji autentykacji
9. **CAPTCHA**: Ochrona przed botami na formularzu rejestracji
10. **Password strength indicator**: Wizualny wskaźnik siły hasła
11. **Magic links**: Logowanie bez hasła (przez link w emailu)
12. **SSO**: Single Sign-On dla organizacji

---

### 5.5. Metryki sukcesu

**Techniczne**:

- [ ] 100% endpointów API chronione autentykacją
- [ ] 0 miejsc z `DEFAULT_USER_ID` w produkcyjnym kodzie
- [ ] Wszystkie chronione trasy przekierowują do `/login` bez sesji
- [ ] Wszystkie formularze mają walidację client-side i server-side
- [ ] 100% pokrycia scenariuszy testowych (manualnych)

**Użytkowe** (zgodne z PRD 6.1):

- [ ] US-001: Użytkownik może się zarejestrować
- [ ] US-002: Użytkownik może się zalogować
- [ ] US-003: Użytkownik może zresetować hasło
- [ ] US-004: Użytkownik może się wylogować
- [ ] Niezarejestrowany uczestnik może zobaczyć wynik przez link

**Bezpieczeństwo**:

- [ ] Brak wrażliwych danych w localStorage (tylko Supabase session)
- [ ] Wszystkie hasła są hashowane (przez Supabase)
- [ ] Access tokeny dla niezarejestrowanych są nieprzewidywalne (UUID v4)
- [ ] Rate limiting aktywny dla wszystkich operacji auth

---

### 5.6. Dokumentacja dla developerów

**Przykład użycia w nowym komponencie**:

**Astro page** (SSR):

```typescript
---
import { requireAuth } from '@/lib/utils/auth.utils';

// Ochroń trasę
const { session } = Astro.locals;
if (!session) {
  return Astro.redirect('/login?redirectTo=/my-page');
}

const userId = session.user.id;
// Użyj userId do pobrania danych...
---
```

**React component** (client-side):

```typescript
import { supabaseClient } from "@/db/supabase.client";

async function myApiCall() {
  // Pobierz session token
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  // Wywołaj API z tokenem w headerze
  const response = await fetch("/api/my-endpoint", {
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    },
  });

  // ...
}
```

**API endpoint**:

```typescript
import { requireApiAuth } from "@/lib/utils/api-auth.utils";

export const POST: APIRoute = async (context) => {
  // Weryfikuj autentykację
  const userIdOrResponse = requireApiAuth(context);
  if (typeof userIdOrResponse !== "string") {
    return userIdOrResponse; // Zwróć błąd 401
  }

  const userId = userIdOrResponse;
  // Kontynuuj z userId...
};
```

---

### 5.7. Kontakt i wsparcie

**Dla pytań dotyczących implementacji**:

- Sprawdź tę specyfikację
- Przejrzyj dokumentację Supabase Auth: https://supabase.com/docs/guides/auth
- Przejrzyj dokumentację Astro middleware: https://docs.astro.build/en/guides/middleware/

**Dla problemów z konfiguracją Supabase**:

- Supabase Dashboard: https://app.supabase.com
- Supabase Discord: https://discord.supabase.com

**Dla problemów z kodem**:

- Sprawdź czy wszystkie kroki z checklist są wykonane
- Sprawdź console.log w przeglądarce i serwerze
- Sprawdź Network tab w DevTools (czy tokeny są wysyłane)

---

**Koniec specyfikacji technicznej modułu autentykacji.**

Data utworzenia: 2025-10-13
Wersja: 1.0
