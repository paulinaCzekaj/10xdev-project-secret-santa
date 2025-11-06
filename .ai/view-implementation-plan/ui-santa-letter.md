# Plan implementacji: AI-generowanie listu do Mikołaja (Wersja 1.1)

## 1. Przegląd

Funkcjonalność AI-generowania listu do Mikołaja rozszerza istniejący widok Strony Wyniku o inteligentnego asystenta, który pomaga użytkownikom tworzyć spersonalizowane listy życzeń w ciepłym, świątecznym tonie. Wykorzystuje model AI (openai/gpt-4o-mini via OpenRouter) do generowania narracyjnych listów zawierających emoji świąteczne i konkretne pomysły na prezenty na podstawie preferencji użytkownika. Funkcjonalność jest dostępna zarówno dla zarejestrowanych, jak i niezarejestrowanych uczestników z limitami generowań (3 dla niezarejestrowanych, 5 dla zalogowanych per-grupa).

## 2. Routing widoku

Funkcjonalność jest integralną częścią istniejącego widoku Strony Wyniku:
- **Dla zalogowanych:** `/groups/:id/result`
- **Dla niezarejestrowanych:** `/results/:token`

Nie wymaga tworzenia nowych ścieżek routingu.

## 3. Struktura komponentów

```
ResultPage
├── ResultHeader
├── GiftReveal
├── WishlistSection
│   ├── MyWishlistEditor (rozszerzony)
│   │   ├── AIGenerateButton (NOWY)
│   │   ├── WishlistTextarea
│   │   └── SaveIndicator
│   └── AssignedPersonWishlist
├── AIPromptModal (NOWY)
└── AIPreviewModal (NOWY)

Hooks:
- useAIGenerationStatus (NOWY)
- useAIGeneration (NOWY)
- useWishlistEditor (istniejący, rozszerzony)
```

## 4. Szczegóły komponentów

### 4.1. AIGenerateButton (NOWY)

**Opis komponentu:**
Przycisk wywołujący proces AI-generowania listu do Mikołaja. Wyświetla ikonę sparkles oraz licznik pozostałych generowań. Obsługuje stan disabled po wyczerpaniu limitów lub gdy data zakończenia wydarzenia minęła.

**Główne elementy:**
- `<Button>` z Shadcn/ui (variant="outline")
- Ikona Sparkles z lucide-react
- Badge z licznikiem pozostałych generowań
- Tooltip z informacją o limitach (przy hover)

**Obsługiwane interakcje:**
- `onClick`: Otwiera AIPromptModal i rozpoczyna proces generowania
- `onMouseEnter/onMouseLeave`: Wyświetla/ukrywa tooltip z informacją o limitach

**Obsługiwana walidacja:**
- `can_generate === false`: Przycisk disabled
- `remaining_generations === 0`: Przycisk disabled z komunikatem "Wykorzystałeś wszystkie generowania AI"
- `isExpired`: Przycisk disabled gdy data zakończenia wydarzenia minęła
- `isGenerating`: Przycisk disabled podczas trwającego procesu generowania

**Typy:**
- `AIGenerateButtonProps` (propsy)
- `AIGenerationStatusResponse` (dane z API status)

**Propsy:**
```typescript
interface AIGenerateButtonProps {
  participantId: number;
  token?: string; // dla niezarejestrowanych
  onGenerateSuccess: (content: string) => void;
  disabled?: boolean;
  className?: string;
}
```

---

### 4.2. AIPromptModal (NOWY)

**Opis komponentu:**
Modal dialogowy z formularzem do wpisania preferencji/zainteresowań użytkownika. Zawiera walidację długości promptu (min 10, max 1000 znaków) oraz licznik znaków. Wyświetla loading state podczas generowania.

**Główne elementy:**
- `<Dialog>` z Shadcn/ui
- `<DialogHeader>` z tytułem "Wygeneruj list do Mikołaja z pomocą AI"
- `<Textarea>` dla promptu użytkownika
- Licznik znaków: `{prompt.length} / 1000`
- `<Button>` "Generuj" (primary)
- `<Button>` "Anuluj" (ghost)
- Loading spinner (podczas generowania)

**Obsługiwane interakcje:**
- `onChange` w textarea: Aktualizacja stanu promptu + walidacja w czasie rzeczywistym
- `onSubmit`: Wywołanie API generate-ai, zamknięcie modalu, otwarcie AIPreviewModal
- `onClose`: Zamknięcie modalu bez akcji

**Obsługiwana walidacja:**
- Minimalna długość: 10 znaków (submit disabled)
- Maksymalna długość: 1000 znaków (submit disabled)
- Nie może być pusty lub zawierać tylko whitespace
- Walidacja w czasie rzeczywistym z wizualną informacją zwrotną (kolor licznika)

**Typy:**
- `AIPromptModalProps` (propsy)
- `GenerateAIRequest` (request body)
- `GenerateAIResponse` (response z API)

**Propsy:**
```typescript
interface AIPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
  isLoading: boolean;
  error: AIGenerationError | null;
}
```

---

### 4.3. AIPreviewModal (NOWY)

**Opis komponentu:**
Modal podglądu wygenerowanego listu do Mikołaja. Wyświetla sformatowaną treść z emoji świątecznymi oraz trzy opcje akcji: "Akceptuj", "Odrzuć", "Generuj ponownie". Informuje użytkownika, że każda akcja zmniejsza licznik dostępnych generowań.

**Główne elementy:**
- `<Dialog>` z Shadcn/ui (size="lg")
- `<DialogHeader>` z tytułem "Twój list do Mikołaja"
- Sekcja preview z wygenerowaną treścią (formatted text, preserve line breaks)
- Alert informacyjny o zmniejszeniu licznika
- Badge z pozostałymi generowaniami
- Trzy przyciski akcji w footer:
  - "Akceptuj" (primary)
  - "Odrzuć" (outline)
  - "Generuj ponownie" (ghost) z ikoną RefreshCw

**Obsługiwane interakcje:**
- `onAccept`: Wstawienie treści do textarea, zamknięcie modalu, aktualizacja licznika, refetch status
- `onReject`: Zamknięcie modalu, aktualizacja licznika (backend), refetch status
- `onRegenerate`: Ponowne wywołanie API z tym samym promptem, loading state, nowy podgląd

**Obsługiwana walidacja:**
- `isRegenerating`: Disabled wszystkie przyciski podczas regeneracji
- `remainingGenerations === 1`: Alert o ostatnim generowaniu
- Maksymalna długość treści: 1000 znaków (weryfikacja z API)

**Typy:**
- `AIPreviewModalProps` (propsy)
- `GenerateAIResponse` (dane wygenerowanej treści)

**Propsy:**
```typescript
interface AIPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedContent: string;
  onAccept: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  remainingGenerations: number;
  currentPrompt: string; // dla regeneracji
}
```

---

### 4.4. WishlistEditor (rozszerzenie istniejącego)

**Opis komponentu:**
Rozszerzenie istniejącego komponentu edytora listy życzeń o integrację z AIGenerateButton oraz obsługę wstawiania wygenerowanej treści AI.

**Główne elementy (nowe):**
- AIGenerateButton (dodany nad textarea)
- Informacja o funkcji AI (opcjonalny tooltip lub hint text)

**Obsługiwane interakcje (nowe):**
- `onAIContentAccepted`: Wstawienie wygenerowanej treści do textarea
- Zachowanie istniejącej funkcjonalności autosave

**Obsługiwana walidacja (bez zmian):**
- Maksymalna długość: 10000 znaków
- Edycja możliwa tylko do daty zakończenia wydarzenia

**Typy:**
- Istniejące typy WishlistEditorProps (bez zmian)
- Integracja z AIGenerateButton przez callback

**Propsy (rozszerzenie):**
```typescript
interface WishlistEditorProps {
  // ... istniejące propsy
  participantId: number; // NOWY - dla AI generation
  token?: string; // NOWY - dla niezarejestrowanych
  canEdit: boolean;
}
```

---

## 5. Typy

### 5.1. API Request/Response Types

```typescript
/**
 * Request body dla POST /api/participants/:participantId/wishlist/generate-ai
 */
export interface GenerateAIRequest {
  prompt: string; // min 10, max 1000 znaków
}

/**
 * Response dla POST /api/participants/:participantId/wishlist/generate-ai
 */
export interface GenerateAIResponse {
  generated_content: string; // max 1000 znaków
  remaining_generations: number; // liczba pozostałych generowań
  can_generate_more: boolean; // czy można jeszcze generować
}

/**
 * Response dla GET /api/participants/:participantId/wishlist/ai-status
 */
export interface AIGenerationStatusResponse {
  ai_generation_count: number; // liczba wykorzystanych generowań
  remaining_generations: number; // liczba pozostałych generowań
  max_generations: number; // maksymalna liczba (3 lub 5)
  can_generate: boolean; // czy można generować (quota + end_date)
  is_registered: boolean; // czy użytkownik zarejestrowany
  last_generated_at: string | null; // timestamp ostatniego generowania (ISO 8601)
}
```

### 5.2. Error Types

```typescript
/**
 * Typy błędów AI generation API
 */
export interface AIGenerationError extends ApiError {
  code:
    | 'END_DATE_PASSED' // 400 - data zakończenia minęła
    | 'INVALID_PROMPT' // 400 - prompt nieprawidłowy (długość)
    | 'AI_GENERATION_LIMIT_REACHED' // 429 - wyczerpano limit
    | 'AI_API_ERROR' // 500 - błąd OpenRouter API
    | 'GATEWAY_TIMEOUT' // 504 - timeout >15s
    | 'UNAUTHORIZED' // 401 - brak autoryzacji
    | 'FORBIDDEN' // 403 - brak uprawnień
    | 'NOT_FOUND'; // 404 - uczestnik nie istnieje
  message: string;
  details?: Record<string, unknown>;
}
```

### 5.3. Component Props Types

```typescript
/**
 * Props dla AIGenerateButton
 */
export interface AIGenerateButtonProps {
  participantId: number;
  token?: string; // dla niezarejestrowanych
  onGenerateSuccess: (content: string) => void; // callback po akceptacji
  disabled?: boolean;
  className?: string;
}

/**
 * Props dla AIPromptModal
 */
export interface AIPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
  isLoading: boolean;
  error: AIGenerationError | null;
}

/**
 * Props dla AIPreviewModal
 */
export interface AIPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedContent: string;
  onAccept: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  remainingGenerations: number;
  currentPrompt: string;
}
```

### 5.4. Hook Return Types

```typescript
/**
 * Return type dla useAIGenerationStatus hook
 */
export interface UseAIGenerationStatusReturn {
  status: AIGenerationStatusResponse | null;
  isLoading: boolean;
  error: AIGenerationError | null;
  refetch: () => Promise<void>;
}

/**
 * Return type dla useAIGeneration hook
 */
export interface UseAIGenerationReturn {
  isGenerating: boolean;
  isRegenerating: boolean;
  error: AIGenerationError | null;
  generatedContent: string | null;
  currentPrompt: string | null;
  generateLetter: (prompt: string) => Promise<void>;
  regenerateLetter: () => Promise<void>;
  acceptLetter: () => void;
  rejectLetter: () => void;
  reset: () => void;
}
```

---

## 6. Zarządzanie stanem

### 6.1. Stan globalny (przez custom hooks)

**useAIGenerationStatus**
- **Cel:** Pobieranie i zarządzanie statusem AI generation (limity, liczniki)
- **Stan wewnętrzny:**
  - `status: AIGenerationStatusResponse | null`
  - `isLoading: boolean`
  - `error: AIGenerationError | null`
- **Funkcje:**
  - `refetch()`: Odświeżenie statusu z API
- **Logika:**
  - Fetch przy montowaniu komponentu
  - Automatyczne odświeżanie po każdym generowaniu
  - Caching z invalidacją
- **Używany w:** AIGenerateButton, WishlistEditor

**useAIGeneration**
- **Cel:** Zarządzanie procesem generowania listu AI
- **Stan wewnętrzny:**
  - `isGenerating: boolean` (loading state dla pierwszego generowania)
  - `isRegenerating: boolean` (loading state dla regeneracji)
  - `error: AIGenerationError | null`
  - `generatedContent: string | null` (wygenerowana treść)
  - `currentPrompt: string | null` (aktualny prompt dla regeneracji)
- **Funkcje:**
  - `generateLetter(prompt: string)`: Wywołanie API generate-ai
  - `regenerateLetter()`: Ponowne generowanie z tym samym promptem
  - `acceptLetter()`: Akceptacja wygenerowanej treści
  - `rejectLetter()`: Odrzucenie wygenerowanej treści
  - `reset()`: Reset stanu
- **Logika:**
  - POST do `/api/participants/:participantId/wishlist/generate-ai`
  - Error handling dla wszystkich kodów błędów (400, 401, 403, 404, 429, 500, 504)
  - Retry logic dla timeout (max 2 próby)
  - Wywołanie refetch statusu po każdej akcji (accept/reject/regenerate)
- **Używany w:** AIPromptModal, AIPreviewModal

### 6.2. Stan lokalny komponentów

**AIPromptModal:**
- `prompt: string` (treść promptu)
- `charCount: number` (liczba znaków)
- `validationError: string | null` (błąd walidacji)
- `isValid: boolean` (czy prompt spełnia warunki)

**AIPreviewModal:**
- `showAlert: boolean` (czy pokazać alert o ostatnim generowaniu)

**AIGenerateButton:**
- `showTooltip: boolean` (czy pokazać tooltip przy hover)

### 6.3. Stan persystowany

**Backend (Supabase):**
- Tabela `wishes`:
  - `ai_generation_count_per_group: number` (licznik użyć per-participant-per-grupa)
  - `ai_last_generated_at: timestamp` (timestamp ostatniego generowania)

**Brak dodatkowego stanu w localStorage** (wszystko w backend)

---

## 7. Integracja API

### 7.1. GET /api/participants/:participantId/wishlist/ai-status

**Cel:** Pobranie aktualnego statusu AI generation dla uczestnika

**Request:**
- **Method:** GET
- **URL:** `/api/participants/:participantId/wishlist/ai-status`
- **Headers:**
  - `Authorization: Bearer {access_token}` (dla zalogowanych)
  - LUB query param: `?token={participant_token}` (dla niezarejestrowanych)
- **Params:**
  - `participantId: number` (z URL)

**Response (200):**
```typescript
{
  ai_generation_count: number,        // np. 2
  remaining_generations: number,      // np. 3
  max_generations: number,            // np. 5 (lub 3)
  can_generate: boolean,              // np. true
  is_registered: boolean,             // np. true
  last_generated_at: string | null    // np. "2025-11-04T14:30:00Z"
}
```

**Error Responses:**
- 401: Brak autoryzacji
- 403: Brak uprawnień
- 404: Uczestnik nie znaleziony

**Kiedy wywoływane:**
- Przy montowaniu komponentu AIGenerateButton
- Po każdym wygenerowaniu (accept/reject/regenerate)
- Po zamknięciu modali (opcjonalnie)

**Hook:** `useAIGenerationStatus`

---

### 7.2. POST /api/participants/:participantId/wishlist/generate-ai

**Cel:** Wygenerowanie spersonalizowanego listu do Mikołaja

**Request:**
- **Method:** POST
- **URL:** `/api/participants/:participantId/wishlist/generate-ai`
- **Headers:**
  - `Authorization: Bearer {access_token}` (dla zalogowanych)
  - LUB query param: `?token={participant_token}` (dla niezarejestrowanych)
  - `Content-Type: application/json`
- **Params:**
  - `participantId: number` (z URL)
- **Body:**
```typescript
{
  prompt: string  // min 10, max 1000 znaków
}
```

**Response (200):**
```typescript
{
  generated_content: string,        // max 1000 znaków
  remaining_generations: number,    // np. 4 (zmniejszone o 1)
  can_generate_more: boolean        // np. true
}
```

**Error Responses:**
- 400:
  - `END_DATE_PASSED`: "Data zakończenia wydarzenia minęła"
  - `INVALID_PROMPT`: "Prompt musi mieć od 10 do 1000 znaków"
- 401: `UNAUTHORIZED`: "Wymagana autoryzacja"
- 403: `FORBIDDEN`: "Brak uprawnień do generowania dla tego uczestnika"
- 404: `NOT_FOUND`: "Uczestnik nie znaleziony"
- 429: `AI_GENERATION_LIMIT_REACHED`: "Wykorzystałeś wszystkie dostępne generowania AI"
- 500: `AI_API_ERROR`: "Wystąpił błąd podczas generowania. Spróbuj ponownie później."
- 504: `GATEWAY_TIMEOUT`: "Generowanie trwa zbyt długo. Spróbuj ponownie."

**Kiedy wywoływane:**
- Po kliknięciu "Generuj" w AIPromptModal
- Po kliknięciu "Generuj ponownie" w AIPreviewModal

**Hook:** `useAIGeneration`

**Retry logic:**
- Timeout: max 15 sekund
- Retry: max 2 próby dla 5xx errors i timeout
- Exponential backoff: 1s, 2s

---

## 8. Interakcje użytkownika

### 8.1. Scenariusz podstawowy: Generowanie i akceptacja

1. **Użytkownik klika przycisk "Wygeneruj list do Mikołaja z pomocą AI"**
   - Warunek: `can_generate === true`, `!isExpired`, `!isGenerating`
   - Akcja: Otwarcie AIPromptModal
   - UI feedback: Modal slide-in animation

2. **Użytkownik wpisuje preferencje w pole prompt**
   - Akcja: OnChange w textarea
   - Walidacja w czasie rzeczywistym:
     - `prompt.length < 10`: "Minimum 10 znaków" (submit disabled)
     - `prompt.length > 1000`: "Maksymalnie 1000 znaków" (submit disabled)
     - Licznik znaków zmienia kolor: czerwony (<10), żółty (900-1000), zielony (10-900)
   - UI feedback: Real-time validation messages

3. **Użytkownik klika "Generuj"**
   - Warunek: `isValid === true`, `!isLoading`
   - Akcja: Wywołanie `generateLetter(prompt)`
   - UI feedback:
     - Loading spinner w przycisku
     - Disabled wszystkie elementy interaktywne
     - Komunikat: "Generuję list... To może potrwać do 15 sekund"

4. **API zwraca wygenerowaną treść**
   - Akcja: Zamknięcie AIPromptModal, otwarcie AIPreviewModal
   - UI feedback: Smooth transition między modalami

5. **Użytkownik przegląda wygenerowany list**
   - Wyświetlanie:
     - Wygenerowana treść (formatted, preserve line breaks, emoji)
     - Alert: "To generowanie zmniejszy Twój licznik o 1"
     - Badge: "Pozostałe generowania: X"
   - Opcje: "Akceptuj", "Odrzuć", "Generuj ponownie"

6. **Użytkownik klika "Akceptuj"**
   - Akcja: `acceptLetter()`
   - Backend: Licznik zmniejszony (już zmniejszony w kroku 3)
   - UI feedback:
     - Zamknięcie AIPreviewModal
     - Wstawienie treści do textarea w WishlistEditor
     - Toast success: "List został dodany do Twojej listy życzeń"
     - Refetch AI status (aktualizacja licznika w przycisku)
   - Użytkownik może teraz edytować wygenerowaną treść jak normalny tekst

### 8.2. Scenariusz alternatywny: Odrzucenie

1-5. **Identyczne jak w scenariuszu podstawowym**

6. **Użytkownik klika "Odrzuć"**
   - Akcja: `rejectLetter()`
   - Backend: Licznik już zmniejszony (nie zostanie przywrócony)
   - UI feedback:
     - Zamknięcie AIPreviewModal
     - Toast info: "List został odrzucony. Wykorzystałeś 1 generowanie."
     - Refetch AI status
   - Textarea pozostaje niezmienione

### 8.3. Scenariusz alternatywny: Regeneracja

1-5. **Identyczne jak w scenariuszu podstawowym**

6. **Użytkownik klika "Generuj ponownie"**
   - Akcja: `regenerateLetter()`
   - Backend:
     - Nowe wywołanie API z tym samym promptem
     - Kolejne zmniejszenie licznika
   - UI feedback:
     - Loading spinner w przycisku "Generuj ponownie"
     - Disabled wszystkie przyciski
     - Komunikat: "Regeneruję list..."

7. **API zwraca nową wersję**
   - Akcja: Aktualizacja treści w AIPreviewModal
   - UI feedback:
     - Nowa treść zastępuje poprzednią
     - Badge zaktualizowany: "Pozostałe generowania: X-1"
     - Alert jeśli `remainingGenerations === 1`: "To Twoje ostatnie generowanie!"

8. **Użytkownik akceptuje lub odrzuca nową wersję**
   - Dalej jak w scenariuszu podstawowym lub alternatywnym (odrzucenie)

### 8.4. Scenariusz brzegowy: Wyczerpany limit

1. **Użytkownik klika przycisk AI gdy `remaining_generations === 0`**
   - Warunek: `can_generate === false`
   - UI feedback:
     - Przycisk disabled
     - Tooltip: "Wykorzystałeś wszystkie dostępne generowania AI (3/5)"
     - Badge na przycisku: "0 pozostałych"
   - Akcja: Brak (przycisk nieaktywny)

### 8.5. Scenariusz błędu: Timeout

1-3. **Identyczne jak w scenariuszu podstawowym**

4. **API zwraca 504 Gateway Timeout**
   - Akcja: Error handling w hook
   - UI feedback:
     - Zamknięcie loading state
     - Toast error: "Generowanie trwa zbyt długo. Spróbuj ponownie."
     - Pozostanie w AIPromptModal (możliwość ponownej próby)
   - **WAŻNE:** Licznik został zmniejszony (nie zostanie przywrócony)

### 8.6. Scenariusz błędu: Rate limit

1-3. **Identyczne jak w scenariuszu podstawowym**

4. **API zwraca 429 AI_GENERATION_LIMIT_REACHED**
   - Akcja: Error handling w hook
   - UI feedback:
     - Zamknięcie loading state i modalu
     - Toast error: "Wykorzystałeś wszystkie dostępne generowania AI"
     - Refetch AI status
     - Przycisk AI disabled

---

## 9. Warunki i walidacja

### 9.1. Warunki dostępności funkcji AI

**Komponent:** AIGenerateButton

**Warunki sprawdzane:**

1. **can_generate === true** (z API status)
   - Sprawdza: Czy użytkownik ma pozostałe generowania
   - Źródło: `GET /api/participants/:participantId/wishlist/ai-status`
   - Efekt jeśli false: Przycisk disabled, tooltip "Wykorzystałeś wszystkie generowania"

2. **!isExpired** (data zakończenia nie minęła)
   - Sprawdza: `new Date() <= new Date(group.end_date)`
   - Źródło: Kontekst ResultPage (dane grupy)
   - Efekt jeśli true: Przycisk disabled, tooltip "Wydarzenie się zakończyło"

3. **!isGenerating** (nie trwa proces generowania)
   - Sprawdza: Stan z hook useAIGeneration
   - Efekt jeśli true: Przycisk disabled, loading indicator

**Implementacja:**
```typescript
const isDisabled =
  !aiStatus?.can_generate ||
  isExpired ||
  isGenerating ||
  disabled;
```

---

### 9.2. Walidacja promptu użytkownika

**Komponent:** AIPromptModal

**Warunki walidacji:**

1. **Minimalna długość: 10 znaków**
   - Sprawdza: `prompt.trim().length >= 10`
   - Komunikat: "Prompt musi mieć co najmniej 10 znaków"
   - Efekt: Submit button disabled
   - Wizualizacja: Licznik znaków czerwony

2. **Maksymalna długość: 1000 znaków**
   - Sprawdza: `prompt.length <= 1000`
   - Komunikat: "Maksymalna długość to 1000 znaków"
   - Efekt: Submit button disabled, textarea blokuje dalsze wpisywanie
   - Wizualizacja: Licznik znaków czerwony

3. **Nie może być pusty lub tylko whitespace**
   - Sprawdza: `prompt.trim().length > 0`
   - Komunikat: "Prompt nie może być pusty"
   - Efekt: Submit button disabled

**Walidacja w czasie rzeczywistym:**
- onChange w textarea
- Debounce: 300ms (opcjonalnie)
- Kolory licznika:
  - Czerwony: < 10 lub > 1000
  - Żółty: 900-1000 (warning przed limitem)
  - Zielony: 10-900 (OK)

**Implementacja:**
```typescript
const isValid =
  prompt.trim().length >= 10 &&
  prompt.length <= 1000;

const charCountColor =
  prompt.length < 10 || prompt.length > 1000
    ? 'text-destructive'
    : prompt.length > 900
      ? 'text-yellow-600'
      : 'text-muted-foreground';
```

---

### 9.3. Walidacja wygenerowanej treści

**Komponent:** AIPreviewModal, useAIGeneration hook

**Warunki sprawdzane:**

1. **Maksymalna długość: 1000 znaków** (z API)
   - Sprawdza: `generated_content.length <= 1000`
   - Źródło: Backend (OpenRouter max_tokens=1000)
   - Efekt jeśli przekroczony: Nie powinno się zdarzyć (API obcina)
   - Fallback: Wyświetlenie komunikatu błędu

2. **Zgodność z limitem pola wishlist: 10000 znaków**
   - Sprawdza: `generated_content.length <= 10000`
   - Źródło: Walidacja textarea w WishlistEditor
   - Efekt: Zawsze spełniony (1000 < 10000)

3. **Treść nie jest pusta**
   - Sprawdza: `generated_content.trim().length > 0`
   - Efekt jeśli pusty: Wyświetlenie błędu, opcja regeneracji

**Sanityzacja:**
- XSS protection: Escapowanie HTML (renderowanie jako plain text)
- Preserve line breaks: `white-space: pre-wrap`
- Emoji: Renderowane natywnie (UTF-8)

---

### 9.4. Warunki limitów generowania

**Komponent:** useAIGenerationStatus hook, AIGenerateButton

**Warunki sprawdzane:**

1. **Pozostałe generowania > 0**
   - Sprawdza: `remaining_generations > 0`
   - Źródło: API status
   - Efekt jeśli 0: Przycisk disabled, can_generate === false

2. **Nie przekroczono max generowań per-grupa**
   - Sprawdza: `ai_generation_count < max_generations`
   - max_generations:
     - 3 dla niezarejestrowanych (`is_registered === false`)
     - 5 dla zalogowanych (`is_registered === true`)
   - Źródło: Backend (tabela wishes.ai_generation_count_per_group)
   - Efekt jeśli przekroczony: 429 error z API, przycisk disabled

3. **Alert o ostatnim generowaniu**
   - Sprawdza: `remaining_generations === 1`
   - Efekt: Wyświetlenie Alert w AIPreviewModal
   - Komunikat: "⚠️ To Twoje ostatnie generowanie! Upewnij się, że treść Ci odpowiada."

**Implementacja w UI:**
```typescript
// Badge w AIGenerateButton
<Badge variant={remaining > 0 ? 'default' : 'destructive'}>
  {remaining > 0
    ? `${remaining} pozostałych`
    : 'Wykorzystane'}
</Badge>

// Alert w AIPreviewModal
{remainingGenerations === 1 && (
  <Alert variant="warning">
    To Twoje ostatnie generowanie!
  </Alert>
)}
```

---

## 10. Obsługa błędów

### 10.1. Błędy API - Mapowanie na UI

**Hook:** useAIGeneration

**Strategia:**
- Każdy błąd API mapowany na user-friendly komunikat
- Wyświetlanie przez Toast (Shadcn/ui)
- Logowanie szczegółów do console (dev mode)
- Zachowanie error state w hook (dla retry)

**Tabela mapowania błędów:**

| Kod HTTP | Error Code | Komunikat użytkownika | Akcja UI |
|----------|-----------|----------------------|----------|
| 400 | END_DATE_PASSED | "Data zakończenia wydarzenia minęła. Nie możesz już generować listy życzeń." | Toast error, zamknięcie modalu, disable przycisku |
| 400 | INVALID_PROMPT | "Prompt musi mieć od 10 do 1000 znaków." | Toast error, pozostanie w AIPromptModal |
| 401 | UNAUTHORIZED | "Wymagana autoryzacja. Zaloguj się ponownie." | Toast error, redirect do /login (opcjonalnie) |
| 403 | FORBIDDEN | "Nie masz uprawnień do generowania listy dla tego uczestnika." | Toast error, zamknięcie modalu |
| 404 | NOT_FOUND | "Nie znaleziono uczestnika. Odśwież stronę." | Toast error, zamknięcie modalu |
| 429 | AI_GENERATION_LIMIT_REACHED | "Wykorzystałeś wszystkie dostępne generowania AI." | Toast error, zamknięcie modalu, disable przycisku, refetch status |
| 500 | AI_API_ERROR | "Wystąpił błąd podczas generowania. Spróbuj ponownie później." | Toast error, pozostanie w AIPromptModal (umożliwienie retry) |
| 504 | GATEWAY_TIMEOUT | "Generowanie trwa zbyt długo. Spróbuj ponownie." | Toast error, pozostanie w AIPromptModal (umożliwienie retry) |
| - | NETWORK_ERROR | "Błąd połączenia. Sprawdź swoje połączenie internetowe." | Toast error, pozostanie w AIPromptModal (umożliwienie retry) |

**Implementacja w hook:**
```typescript
try {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json();
    const errorCode = errorData.error.code;

    // Mapowanie na user-friendly message
    const message = ERROR_MESSAGES[errorCode] || 'Wystąpił nieoczekiwany błąd';

    throw new AIGenerationError(errorCode, message);
  }

  // Success path
  const data: GenerateAIResponse = await response.json();
  setGeneratedContent(data.generated_content);

} catch (error) {
  setError(error);
  toast.error(error.message);

  // Logowanie szczegółów (dev mode)
  if (import.meta.env.DEV) {
    console.error('[useAIGeneration] Error:', error);
  }
}
```

---

### 10.2. Retry Logic dla Timeout i 5xx

**Warunki retry:**
- 504 Gateway Timeout
- 500, 502, 503 (Server errors)
- Network errors (fetch failed)

**Parametry:**
- Max retries: 2
- Exponential backoff: 1s, 2s
- Timeout: 15 sekund per request

**Implementacja:**
```typescript
async function generateWithRetry(
  prompt: string,
  retries = 2
): Promise<GenerateAIResponse> {

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, 15000);

      if (response.ok) {
        return await response.json();
      }

      // Retry dla 5xx i 504
      if (attempt < retries && [500, 502, 503, 504].includes(response.status)) {
        const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s
        await sleep(backoff);
        continue;
      }

      // Nie retry dla innych błędów
      throw new AIGenerationError(response.status, ...);

    } catch (error) {
      // Retry dla network errors
      if (attempt < retries && error.name === 'TypeError') {
        const backoff = Math.pow(2, attempt) * 1000;
        await sleep(backoff);
        continue;
      }

      throw error;
    }
  }

  throw new AIGenerationError('MAX_RETRIES_EXCEEDED', ...);
}
```

---

### 10.3. Błędy walidacji po stronie klienta

**Scenariusze:**

1. **Prompt za krótki (<10 znaków)**
   - Gdzie: AIPromptModal
   - Kiedy: onChange w textarea
   - UI: Komunikat pod textarea, submit disabled
   - Nie wysyła request do API

2. **Prompt za długi (>1000 znaków)**
   - Gdzie: AIPromptModal
   - Kiedy: onChange w textarea
   - UI: Komunikat pod textarea, submit disabled, textarea maxLength
   - Nie wysyła request do API

3. **Brak połączenia internetowego**
   - Gdzie: useAIGeneration hook
   - Kiedy: Fetch failed (TypeError)
   - UI: Toast error "Sprawdź swoje połączenie internetowe"
   - Retry logic (2 próby)

---

### 10.4. Graceful Degradation

**Scenariusz:** OpenRouter API niedostępne przez dłuższy czas

**Strategia:**
- Wyświetlenie komunikatu: "Funkcja AI jest tymczasowo niedostępna. Możesz nadal edytować listę ręcznie."
- Przycisk AI disabled z tooltipem
- Pełna funkcjonalność manualnej edycji działa normalnie
- Opcja: Banner informacyjny na górze strony (Alert component)

**Implementacja:**
```typescript
// W ResultPage - monitoring dostępności AI
const [aiAvailable, setAiAvailable] = useState(true);

useEffect(() => {
  // Jeśli wiele 500/504 errors pod rząd -> setAiAvailable(false)
  if (consecutiveErrors >= 3) {
    setAiAvailable(false);
  }
}, [consecutiveErrors]);

// UI
{!aiAvailable && (
  <Alert variant="warning">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Funkcja AI tymczasowo niedostępna</AlertTitle>
    <AlertDescription>
      Możesz nadal edytować swoją listę życzeń ręcznie.
    </AlertDescription>
  </Alert>
)}
```

---

## 11. Kroki implementacji

### Krok 1: Przygotowanie typów TypeScript
**Czas: 30 minut**

1.1. Otwórz plik `src/types.ts`

1.2. Dodaj typy API (na końcu pliku, przed sekcją HELPER TYPES):

```typescript
// ============================================================================
// AI GENERATION DTOs (Wersja 1.1)
// ============================================================================

/**
 * Request body dla POST /api/participants/:participantId/wishlist/generate-ai
 */
export interface GenerateAIRequest {
  prompt: string;
}

/**
 * Response dla POST /api/participants/:participantId/wishlist/generate-ai
 */
export interface GenerateAIResponse {
  generated_content: string;
  remaining_generations: number;
  can_generate_more: boolean;
}

/**
 * Response dla GET /api/participants/:participantId/wishlist/ai-status
 */
export interface AIGenerationStatusResponse {
  ai_generation_count: number;
  remaining_generations: number;
  max_generations: number;
  can_generate: boolean;
  is_registered: boolean;
  last_generated_at: string | null;
}

/**
 * Typy błędów AI generation API
 */
export interface AIGenerationError extends ApiError {
  code:
    | 'END_DATE_PASSED'
    | 'INVALID_PROMPT'
    | 'AI_GENERATION_LIMIT_REACHED'
    | 'AI_API_ERROR'
    | 'GATEWAY_TIMEOUT'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND';
}

/**
 * Props dla AIGenerateButton
 */
export interface AIGenerateButtonProps {
  participantId: number;
  token?: string;
  onGenerateSuccess: (content: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Props dla AIPromptModal
 */
export interface AIPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
  isLoading: boolean;
  error: AIGenerationError | null;
}

/**
 * Props dla AIPreviewModal
 */
export interface AIPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedContent: string;
  onAccept: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  remainingGenerations: number;
  currentPrompt: string;
}

/**
 * Return type dla useAIGenerationStatus hook
 */
export interface UseAIGenerationStatusReturn {
  status: AIGenerationStatusResponse | null;
  isLoading: boolean;
  error: AIGenerationError | null;
  refetch: () => Promise<void>;
}

/**
 * Return type dla useAIGeneration hook
 */
export interface UseAIGenerationReturn {
  isGenerating: boolean;
  isRegenerating: boolean;
  error: AIGenerationError | null;
  generatedContent: string | null;
  currentPrompt: string | null;
  generateLetter: (prompt: string) => Promise<void>;
  regenerateLetter: () => Promise<void>;
  acceptLetter: () => void;
  rejectLetter: () => void;
  reset: () => void;
}
```

1.3. Zapisz plik i sprawdź, czy TypeScript kompiluje się bez błędów:
```bash
npm run type-check
```

---

### Krok 2: Utworzenie useAIGenerationStatus hook
**Czas: 1 godzina**

2.1. Utwórz plik `src/lib/hooks/useAIGenerationStatus.ts`

2.2. Implementacja hooka:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type {
  AIGenerationStatusResponse,
  AIGenerationError,
  UseAIGenerationStatusReturn,
} from '@/types';

/**
 * Hook do pobierania i zarządzania statusem AI generation
 *
 * @param participantId - ID uczestnika
 * @param token - Token dostępu (dla niezarejestrowanych)
 * @param enabled - Czy hook jest aktywny (default: true)
 * @returns Status AI generation, loading state, error, funkcja refetch
 */
export function useAIGenerationStatus(
  participantId: number,
  token?: string,
  enabled = true
): UseAIGenerationStatusReturn {
  const [status, setStatus] = useState<AIGenerationStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AIGenerationError | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = new URL(
        `/api/participants/${participantId}/wishlist/ai-status`,
        window.location.origin
      );

      if (token) {
        url.searchParams.append('token', token);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? {} : { Authorization: `Bearer ${localStorage.getItem('access_token')}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Failed to fetch AI status');
      }

      const data: AIGenerationStatusResponse = await response.json();
      setStatus(data);
    } catch (err) {
      const error: AIGenerationError = {
        code: 'AI_API_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
      setError(error);
      console.error('[useAIGenerationStatus] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [participantId, token, enabled]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
  };
}
```

2.3. Dodaj testy (opcjonalnie):
- Utwórz `src/lib/hooks/__tests__/useAIGenerationStatus.test.ts`
- Testy jednostkowe z Vitest + Mock Service Worker

---

### Krok 3: Utworzenie useAIGeneration hook
**Czas: 2 godziny**

3.1. Utwórz plik `src/lib/hooks/useAIGeneration.ts`

3.2. Implementacja hooka (pełna wersja z retry logic):

```typescript
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type {
  GenerateAIRequest,
  GenerateAIResponse,
  AIGenerationError,
  UseAIGenerationReturn,
} from '@/types';

// Mapowanie kodów błędów na user-friendly komunikaty
const ERROR_MESSAGES: Record<string, string> = {
  END_DATE_PASSED: 'Data zakończenia wydarzenia minęła. Nie możesz już generować listy życzeń.',
  INVALID_PROMPT: 'Prompt musi mieć od 10 do 1000 znaków.',
  UNAUTHORIZED: 'Wymagana autoryzacja. Zaloguj się ponownie.',
  FORBIDDEN: 'Nie masz uprawnień do generowania listy dla tego uczestnika.',
  NOT_FOUND: 'Nie znaleziono uczestnika. Odśwież stronę.',
  AI_GENERATION_LIMIT_REACHED: 'Wykorzystałeś wszystkie dostępne generowania AI.',
  AI_API_ERROR: 'Wystąpił błąd podczas generowania. Spróbuj ponownie później.',
  GATEWAY_TIMEOUT: 'Generowanie trwa zbyt długo. Spróbuj ponownie.',
  NETWORK_ERROR: 'Błąd połączenia. Sprawdź swoje połączenie internetowe.',
};

// Timeout dla pojedynczego requesta (15 sekund)
const REQUEST_TIMEOUT = 15000;

// Helper: fetch z timeoutem
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('GATEWAY_TIMEOUT');
    }
    throw error;
  }
}

// Helper: sleep dla retry backoff
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Hook do zarządzania procesem AI-generowania listu do Mikołaja
 *
 * @param participantId - ID uczestnika
 * @param token - Token dostępu (dla niezarejestrowanych)
 * @param onStatusChange - Callback wywoływany po zmianach (dla refetch status)
 * @returns Stan generowania, funkcje akcji
 */
export function useAIGeneration(
  participantId: number,
  token?: string,
  onStatusChange?: () => void
): UseAIGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<AIGenerationError | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);

  /**
   * Wywołanie API z retry logic
   */
  const callGenerateAPI = useCallback(
    async (prompt: string, retries = 2): Promise<GenerateAIResponse> => {
      const url = new URL(
        `/api/participants/${participantId}/wishlist/generate-ai`,
        window.location.origin
      );

      if (token) {
        url.searchParams.append('token', token);
      }

      const requestBody: GenerateAIRequest = { prompt };

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await fetchWithTimeout(
            url.toString(),
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? {} : { Authorization: `Bearer ${localStorage.getItem('access_token')}` }),
              },
              body: JSON.stringify(requestBody),
            },
            REQUEST_TIMEOUT
          );

          if (response.ok) {
            return await response.json();
          }

          // Retry dla 5xx i 504
          if (attempt < retries && [500, 502, 503, 504].includes(response.status)) {
            const backoff = Math.pow(2, attempt) * 1000;
            await sleep(backoff);
            continue;
          }

          // Błąd nie nadający się do retry
          const errorData = await response.json();
          const errorCode = errorData.error.code || 'AI_API_ERROR';
          const errorMessage = ERROR_MESSAGES[errorCode] || errorData.error.message;

          throw {
            code: errorCode,
            message: errorMessage,
          } as AIGenerationError;
        } catch (err) {
          // Retry dla network errors
          if (attempt < retries && err instanceof TypeError) {
            const backoff = Math.pow(2, attempt) * 1000;
            await sleep(backoff);
            continue;
          }

          // Błąd timeout
          if (err.message === 'GATEWAY_TIMEOUT') {
            throw {
              code: 'GATEWAY_TIMEOUT',
              message: ERROR_MESSAGES.GATEWAY_TIMEOUT,
            } as AIGenerationError;
          }

          // Inne błędy
          throw err;
        }
      }

      // Max retries exceeded
      throw {
        code: 'AI_API_ERROR',
        message: 'Przekroczono maksymalną liczbę prób. Spróbuj ponownie później.',
      } as AIGenerationError;
    },
    [participantId, token]
  );

  /**
   * Generowanie nowego listu
   */
  const generateLetter = useCallback(
    async (prompt: string) => {
      setIsGenerating(true);
      setError(null);
      setCurrentPrompt(prompt);

      try {
        const response = await callGenerateAPI(prompt);
        setGeneratedContent(response.generated_content);
        toast.success('List został wygenerowany!');
      } catch (err) {
        const error = err as AIGenerationError;
        setError(error);
        toast.error(error.message);
        console.error('[useAIGeneration] generateLetter error:', err);
      } finally {
        setIsGenerating(false);
      }
    },
    [callGenerateAPI]
  );

  /**
   * Regeneracja z tym samym promptem
   */
  const regenerateLetter = useCallback(async () => {
    if (!currentPrompt) {
      toast.error('Brak zapisanego promptu do regeneracji');
      return;
    }

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await callGenerateAPI(currentPrompt);
      setGeneratedContent(response.generated_content);
      toast.success('List został zregenerowany!');
    } catch (err) {
      const error = err as AIGenerationError;
      setError(error);
      toast.error(error.message);
      console.error('[useAIGeneration] regenerateLetter error:', err);
    } finally {
      setIsRegenerating(false);
    }
  }, [currentPrompt, callGenerateAPI]);

  /**
   * Akceptacja wygenerowanego listu
   */
  const acceptLetter = useCallback(() => {
    if (!generatedContent) return;

    // Callback dla parent component (wstawienie do textarea)
    // Reset stanu
    setGeneratedContent(null);
    setCurrentPrompt(null);
    setError(null);

    // Refetch AI status
    onStatusChange?.();

    toast.success('List został dodany do Twojej listy życzeń');
  }, [generatedContent, onStatusChange]);

  /**
   * Odrzucenie wygenerowanego listu
   */
  const rejectLetter = useCallback(() => {
    setGeneratedContent(null);
    setCurrentPrompt(null);
    setError(null);

    // Refetch AI status (licznik został zmniejszony)
    onStatusChange?.();

    toast.info('List został odrzucony. Wykorzystałeś 1 generowanie.');
  }, [onStatusChange]);

  /**
   * Reset stanu (np. przy unmount)
   */
  const reset = useCallback(() => {
    setIsGenerating(false);
    setIsRegenerating(false);
    setError(null);
    setGeneratedContent(null);
    setCurrentPrompt(null);
  }, []);

  return {
    isGenerating,
    isRegenerating,
    error,
    generatedContent,
    currentPrompt,
    generateLetter,
    regenerateLetter,
    acceptLetter,
    rejectLetter,
    reset,
  };
}
```

3.3. Export hooków z barrel file:
- Edytuj `src/lib/hooks/index.ts`
- Dodaj: `export { useAIGenerationStatus } from './useAIGenerationStatus';`
- Dodaj: `export { useAIGeneration } from './useAIGeneration';`

---

### Krok 4: Implementacja AIGenerateButton
**Czas: 1.5 godziny**

4.1. Utwórz plik `src/components/result/AIGenerateButton.tsx`

4.2. Implementacja komponentu:

```typescript
import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAIGenerationStatus } from '@/lib/hooks';
import type { AIGenerateButtonProps } from '@/types';

/**
 * Przycisk wywołujący proces AI-generowania listu do Mikołaja
 * Wyświetla licznik pozostałych generowań oraz obsługuje stan disabled
 */
export function AIGenerateButton({
  participantId,
  token,
  onGenerateSuccess,
  disabled = false,
  className,
}: AIGenerateButtonProps) {
  const { status, isLoading, refetch } = useAIGenerationStatus(participantId, token);

  const [isPromptModalOpen, setIsPromptModalOpen] = React.useState(false);

  // Warunki dostępności
  const canGenerate = status?.can_generate ?? false;
  const remainingGenerations = status?.remaining_generations ?? 0;
  const isRegistered = status?.is_registered ?? false;
  const maxGenerations = status?.max_generations ?? (isRegistered ? 5 : 3);

  const isDisabled = !canGenerate || isLoading || disabled;

  // Tooltip message
  const getTooltipMessage = () => {
    if (!status) return 'Ładowanie...';
    if (remainingGenerations === 0) {
      return `Wykorzystałeś wszystkie dostępne generowania AI (${maxGenerations})`;
    }
    return `Pozostało ${remainingGenerations} z ${maxGenerations} generowań`;
  };

  const handleClick = () => {
    if (isDisabled) return;
    setIsPromptModalOpen(true);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="default"
              onClick={handleClick}
              disabled={isDisabled}
              className={className}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Wygeneruj list do Mikołaja z pomocą AI
              <Badge
                variant={remainingGenerations > 0 ? 'default' : 'destructive'}
                className="ml-2"
              >
                {isLoading ? '...' : `${remainingGenerations} pozostałych`}
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipMessage()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* AIPromptModal - implementowany w następnym kroku */}
      {/* AIPreviewModal - implementowany w następnym kroku */}
    </>
  );
}
```

4.3. Dodaj export do `src/components/result/index.ts`

---

### Krok 5: Implementacja AIPromptModal
**Czas: 2 godziny**

5.1. Utwórz plik `src/components/result/AIPromptModal.tsx`

5.2. Implementacja komponentu (pełna wersja):

```typescript
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { AIPromptModalProps } from '@/types';

const MIN_PROMPT_LENGTH = 10;
const MAX_PROMPT_LENGTH = 1000;

/**
 * Modal z formularzem do wpisania preferencji/zainteresowań użytkownika
 * Zawiera walidację długości promptu oraz licznik znaków
 */
export function AIPromptModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  error,
}: AIPromptModalProps) {
  const [prompt, setPrompt] = useState('');
  const [charCount, setCharCount] = useState(0);

  // Reset przy zamknięciu
  useEffect(() => {
    if (!isOpen) {
      setPrompt('');
      setCharCount(0);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_PROMPT_LENGTH) {
      setPrompt(value);
      setCharCount(value.length);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    await onSubmit(prompt);
  };

  // Walidacja
  const trimmedLength = prompt.trim().length;
  const isValid = trimmedLength >= MIN_PROMPT_LENGTH && charCount <= MAX_PROMPT_LENGTH;

  // Kolor licznika
  const getCharCountColor = () => {
    if (charCount < MIN_PROMPT_LENGTH || charCount > MAX_PROMPT_LENGTH) {
      return 'text-destructive';
    }
    if (charCount > 900) {
      return 'text-yellow-600';
    }
    return 'text-muted-foreground';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Wygeneruj list do Mikołaja z pomocą AI</DialogTitle>
            <DialogDescription>
              Opisz swoje zainteresowania i preferencje, a AI stworzy dla Ciebie
              spersonalizowany list do świętego Mikołaja w ciepłym, świątecznym tonie.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">
                Twoje zainteresowania i preferencje
              </Label>
              <Textarea
                id="prompt"
                placeholder="Np. Lubię książki fantasy, dobrą kawę i ciepłe szaliki..."
                value={prompt}
                onChange={handleChange}
                rows={6}
                maxLength={MAX_PROMPT_LENGTH}
                disabled={isLoading}
                className="resize-none"
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {trimmedLength < MIN_PROMPT_LENGTH && (
                    <span className="text-destructive">
                      Minimum {MIN_PROMPT_LENGTH} znaków
                    </span>
                  )}
                </p>
                <p className={`text-sm ${getCharCountColor()}`}>
                  {charCount} / {MAX_PROMPT_LENGTH}
                </p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generuję list...
                </>
              ) : (
                'Generuj'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

5.3. Dodaj export do `src/components/result/index.ts`

---

### Krok 6: Implementacja AIPreviewModal
**Czas: 2 godziny**

6.1. Utwórz plik `src/components/result/AIPreviewModal.tsx`

6.2. Implementacja komponentu:

```typescript
import React from 'react';
import { RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AIPreviewModalProps } from '@/types';

/**
 * Modal podglądu wygenerowanego listu do Mikołaja
 * Wyświetla sformatowaną treść oraz opcje: Akceptuj, Odrzuć, Generuj ponownie
 */
export function AIPreviewModal({
  isOpen,
  onClose,
  generatedContent,
  onAccept,
  onReject,
  onRegenerate,
  isRegenerating,
  remainingGenerations,
  currentPrompt,
}: AIPreviewModalProps) {
  const handleAccept = () => {
    onAccept();
    onClose();
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  const isLastGeneration = remainingGenerations === 1;
  const buttonsDisabled = isRegenerating;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Twój list do Mikołaja</DialogTitle>
            <Badge variant={remainingGenerations > 0 ? 'default' : 'destructive'}>
              Pozostało: {remainingGenerations}
            </Badge>
          </div>
          <DialogDescription>
            Sprawdź wygenerowany list i zdecyduj, czy chcesz go zaakceptować.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alert o ostatnim generowaniu */}
          {isLastGeneration && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ⚠️ To Twoje ostatnie generowanie! Upewnij się, że treść Ci odpowiada.
              </AlertDescription>
            </Alert>
          )}

          {/* Alert o zmniejszeniu licznika */}
          <Alert>
            <AlertDescription>
              Każda akcja (akceptacja, odrzucenie lub regeneracja) zmniejszy licznik
              dostępnych generowań o 1.
            </AlertDescription>
          </Alert>

          {/* Podgląd wygenerowanej treści */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {generatedContent}
            </pre>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={buttonsDisabled}
          >
            Odrzuć
          </Button>

          <div className="flex gap-2 flex-1 justify-end">
            <Button
              variant="ghost"
              onClick={onRegenerate}
              disabled={buttonsDisabled || remainingGenerations === 0}
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Regeneruję...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generuj ponownie
                </>
              )}
            </Button>

            <Button
              onClick={handleAccept}
              disabled={buttonsDisabled}
            >
              Akceptuj
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

6.3. Dodaj export do `src/components/result/index.ts`

---

### Krok 7: Integracja z WishlistEditor
**Czas: 1 godzina**

7.1. Zlokalizuj istniejący komponent WishlistEditor (prawdopodobnie `src/components/result/WishlistEditor.tsx`)

7.2. Rozszerz props interface:

```typescript
interface WishlistEditorProps {
  // ... istniejące propsy
  participantId: number; // NOWY
  token?: string; // NOWY
  canEdit: boolean;
}
```

7.3. Dodaj integrację z AI w komponencie:

```typescript
import { AIGenerateButton, AIPromptModal, AIPreviewModal } from '@/components/result';
import { useAIGeneration, useAIGenerationStatus } from '@/lib/hooks';

export function WishlistEditor({
  participantId,
  token,
  canEdit,
  // ... inne propsy
}: WishlistEditorProps) {
  // Istniejący stan
  const [content, setContent] = useState(initialContent);

  // Nowe hooki AI
  const { status, refetch: refetchStatus } = useAIGenerationStatus(participantId, token);
  const {
    isGenerating,
    isRegenerating,
    error: aiError,
    generatedContent,
    currentPrompt,
    generateLetter,
    regenerateLetter,
    acceptLetter,
    rejectLetter,
  } = useAIGeneration(participantId, token, refetchStatus);

  // Stany modali
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Handler generowania
  const handlePromptSubmit = async (prompt: string) => {
    await generateLetter(prompt);
    setIsPromptModalOpen(false);
    setIsPreviewModalOpen(true);
  };

  // Handler akceptacji
  const handleAccept = () => {
    if (!generatedContent) return;

    // Wstawienie treści do textarea
    setContent(generatedContent);

    // Wywołanie acceptLetter (refetch status, toast)
    acceptLetter();

    setIsPreviewModalOpen(false);
  };

  // Handler odrzucenia
  const handleReject = () => {
    rejectLetter();
    setIsPreviewModalOpen(false);
  };

  // Handler regeneracji
  const handleRegenerate = async () => {
    await regenerateLetter();
    // Preview modal pozostaje otwarty z nową treścią
  };

  return (
    <div className="space-y-4">
      {/* AI Generate Button */}
      {canEdit && (
        <AIGenerateButton
          participantId={participantId}
          token={token}
          onGenerateSuccess={() => setIsPromptModalOpen(true)}
          disabled={!canEdit}
        />
      )}

      {/* Istniejący textarea */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={!canEdit}
        // ... inne propsy
      />

      {/* Modals */}
      <AIPromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onSubmit={handlePromptSubmit}
        isLoading={isGenerating}
        error={aiError}
      />

      <AIPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        generatedContent={generatedContent || ''}
        onAccept={handleAccept}
        onReject={handleReject}
        onRegenerate={handleRegenerate}
        isRegenerating={isRegenerating}
        remainingGenerations={status?.remaining_generations ?? 0}
        currentPrompt={currentPrompt || ''}
      />
    </div>
  );
}
```

---

### Krok 8: Aktualizacja ResultPage
**Czas: 30 minut**

8.1. Zlokalizuj plik strony wyniku (prawdopodobnie `src/pages/groups/[id]/result.astro` lub `src/pages/results/[token].astro`)

8.2. Upewnij się, że participantId i token są przekazywane do WishlistEditor:

```astro
---
// ... existing imports and logic
import { WishlistEditor } from '@/components/result';

// Pobranie danych uczestnika i grupy
const { participantId, token } = Astro.params;
---

<Layout>
  <!-- ... existing content -->

  <WishlistEditor
    participantId={Number(participantId)}
    token={token}
    canEdit={!isExpired}
    {/* ... other props */}
  />
</Layout>
```

---

### Krok 9: Stylowanie i animacje
**Czas: 1 godzina**

9.1. Dodaj animacje dla modali (jeśli jeszcze nie ma w Shadcn/ui)

9.2. Stylowanie licznika znaków (gradient colors):

```typescript
// W AIPromptModal
const getCharCountColor = () => {
  if (charCount < MIN_PROMPT_LENGTH || charCount > MAX_PROMPT_LENGTH) {
    return 'text-destructive';
  }
  if (charCount > 900) {
    return 'text-yellow-600 font-medium';
  }
  return 'text-muted-foreground';
};
```

9.3. Animacja sparkles icon:

```tsx
<Sparkles className="mr-2 h-4 w-4 animate-pulse" />
```

9.4. Loading states z spinnerami (już zaimplementowane w komponentach)

---

### Krok 10: Testy
**Czas: 3-4 godziny**

10.1. **Testy jednostkowe hooków (Vitest)**

Utwórz `src/lib/hooks/__tests__/useAIGeneration.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAIGeneration } from '../useAIGeneration';

// Mock fetch
global.fetch = vi.fn();

describe('useAIGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate letter successfully', async () => {
    const mockResponse = {
      generated_content: 'Test letter content',
      remaining_generations: 4,
      can_generate_more: true,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useAIGeneration(1, undefined, vi.fn())
    );

    await result.current.generateLetter('test prompt');

    await waitFor(() => {
      expect(result.current.generatedContent).toBe('Test letter content');
      expect(result.current.isGenerating).toBe(false);
    });
  });

  it('should handle timeout error', async () => {
    // Test timeout scenario
    // ...
  });

  // Więcej testów...
});
```

10.2. **Testy komponentów (React Testing Library)**

Utwórz `src/components/result/__tests__/AIPromptModal.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AIPromptModal } from '../AIPromptModal';

describe('AIPromptModal', () => {
  it('should validate prompt length', async () => {
    const onSubmit = vi.fn();

    render(
      <AIPromptModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
        error={null}
      />
    );

    const textarea = screen.getByPlaceholderText(/Np. Lubię książki/);
    const submitButton = screen.getByText('Generuj');

    // Prompt za krótki
    fireEvent.change(textarea, { target: { value: 'test' } });
    expect(submitButton).toBeDisabled();

    // Prompt OK
    fireEvent.change(textarea, { target: { value: 'test prompt with more than 10 chars' } });
    expect(submitButton).toBeEnabled();
  });

  // Więcej testów...
});
```

10.3. **Testy E2E (Playwright)**

Utwórz `tests/ai-generation.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('AI Generation Flow', () => {
  test('should complete full AI generation flow', async ({ page }) => {
    // Login/navigate to result page
    await page.goto('/groups/1/result');

    // Click AI button
    await page.click('button:has-text("Wygeneruj list")');

    // Fill prompt
    await page.fill('textarea', 'Lubię książki fantasy i dobrą kawę');

    // Submit
    await page.click('button:has-text("Generuj")');

    // Wait for preview modal
    await expect(page.locator('text=Twój list do Mikołaja')).toBeVisible();

    // Accept
    await page.click('button:has-text("Akceptuj")');

    // Verify content inserted in textarea
    const textarea = page.locator('textarea');
    const content = await textarea.inputValue();
    expect(content).toContain('Mikołaju');
  });

  // Więcej testów E2E...
});
```

---

### Krok 11: Dokumentacja i cleanup
**Czas: 1 godzina**

11.1. Dodaj JSDoc komentarze do wszystkich eksportowanych funkcji i komponentów

11.2. Utwórz README dla funkcjonalności (opcjonalnie):
- `docs/AI_GENERATION_FEATURE.md`
- Opis flow użytkownika
- Opis architektury (hooki, komponenty, API)
- Troubleshooting

11.3. Code review i cleanup:
- Usuń console.logi z kodu produkcyjnego (zostaw tylko z warunkiem `import.meta.env.DEV`)
- Sprawdź poprawność typów TypeScript
- Formatowanie: `npm run format`
- Linting: `npm run lint`

---

### Krok 12: Deployment i monitoring
**Czas: 1 godzina**

12.1. Weryfikacja zmiennych środowiskowych na production:
- `OPENROUTER_API_KEY`
- `AI_MODEL=openai/gpt-4o-mini`
- `AI_MAX_TOKENS=1000`
- `AI_TEMPERATURE=0.7`

12.2. Deployment na Cloudflare Pages:
```bash
npm run build
# Deploy przez Cloudflare Pages dashboard lub CLI
```

12.3. Monitoring:
- Sprawdzenie logów API (czy requests do OpenRouter działają)
- Monitoring kosztów API (OpenRouter dashboard)
- Sprawdzenie błędów w Sentry/Cloudflare Analytics (opcjonalnie)

---

### Krok 13: Testing na produkcji
**Czas: 30 minut**

13.1. Smoke testing:
- [ ] Zaloguj się jako użytkownik zarejestrowany
- [ ] Przejdź do strony wyniku
- [ ] Kliknij przycisk AI
- [ ] Wpisz prompt i wygeneruj list
- [ ] Sprawdź podgląd
- [ ] Zaakceptuj list
- [ ] Sprawdź, czy treść została wstawiona
- [ ] Sprawdź, czy licznik się zmniejszył

13.2. Edge cases:
- [ ] Wyczerpanie limitów (3/5 generowań)
- [ ] Timeout (symulacja powolnego API)
- [ ] Rate limiting (szybkie wielokrotne kliknięcia)
- [ ] Długie prompti (>1000 znaków)
- [ ] Krótkie prompti (<10 znaków)

13.3. Cross-browser testing:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (mobile)
- [ ] Edge

---

## Podsumowanie kroków implementacji

| Krok | Zadanie | Szacowany czas |
|------|---------|----------------|
| 1 | Przygotowanie typów TypeScript | 30 min |
| 2 | Hook useAIGenerationStatus | 1h |
| 3 | Hook useAIGeneration | 2h |
| 4 | AIGenerateButton | 1.5h |
| 5 | AIPromptModal | 2h |
| 6 | AIPreviewModal | 2h |
| 7 | Integracja z WishlistEditor | 1h |
| 8 | Aktualizacja ResultPage | 30 min |
| 9 | Stylowanie i animacje | 1h |
| 10 | Testy (unit, component, E2E) | 3-4h |
| 11 | Dokumentacja i cleanup | 1h |
| 12 | Deployment i monitoring | 1h |
| 13 | Testing na produkcji | 30 min |
| **RAZEM** | | **~16-17 godzin** |

---

## Checklisty końcowe

### Checklist funkcjonalności (US-015)

- [ ] Przycisk "Wygeneruj list do Mikołaja z pomocą AI" z ikoną sparkles
- [ ] Licznik pozostałych generowań widoczny przy przycisku (3/5)
- [ ] Modal z polem tekstowym na prompt (preferencje/zainteresowania)
- [ ] Loading state z animacją podczas generowania
- [ ] Request do OpenRouter API (openai/gpt-4o-mini)
- [ ] Modal podglądu z wygenerowanym listem (emoji, ciepły ton, formatowanie)
- [ ] Trzy opcje w podglądzie: "Akceptuj", "Odrzuć", "Generuj ponownie"
- [ ] Akceptacja -> wstawienie treści + zmniejszenie licznika
- [ ] Odrzucenie -> zamknięcie + zmniejszenie licznika
- [ ] Regeneracja -> ponowne generowanie + zmniejszenie licznika
- [ ] Edycja wygenerowanej treści po zaakceptowaniu
- [ ] Przycisk nieaktywny po wyczerpaniu limitów z komunikatem
- [ ] Zapis licznika w DB per-participant-per-grupa
- [ ] Wygenerowany list max 1000 znaków, zgodny z limitem pola (10000)

### Checklist techniczny

- [ ] Wszystkie typy TypeScript dodane do `src/types.ts`
- [ ] Hook useAIGenerationStatus zaimplementowany i przetestowany
- [ ] Hook useAIGeneration zaimplementowany z retry logic
- [ ] AIGenerateButton komponent z tooltip i badge
- [ ] AIPromptModal z walidacją i licznikiem znaków
- [ ] AIPreviewModal z trzema opcjami akcji
- [ ] Integracja z WishlistEditor
- [ ] Obsługa błędów API (400, 401, 403, 404, 429, 500, 504)
- [ ] Toast notifications dla wszystkich akcji
- [ ] Responsywność (mobile, tablet, desktop)
- [ ] Testy jednostkowe hooków (Vitest)
- [ ] Testy komponentów (RTL)
- [ ] Testy E2E (Playwright)
- [ ] Dokumentacja JSDoc
- [ ] Zmienne środowiskowe ustawione na production
- [ ] Deployment na Cloudflare Pages
- [ ] Monitoring kosztów API
- [ ] Smoke testing na produkcji

---

**Koniec planu implementacji**
