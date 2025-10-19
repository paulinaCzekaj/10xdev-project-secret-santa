# Plan implementacji widoku Wyniku Losowania Secret Santa

## 1. Przegląd

Widok wyniku losowania Secret Santa to kluczowy element aplikacji, który umożliwia uczestnikom sprawdzenie, kogo wylosowali oraz zarządzanie swoimi listami życzeń. Widok musi wspierać zarówno zalogowanych użytkowników, jak i niezarejestrowanych uczestników (dostęp przez token).

**Główne cele widoku:**

- Prezentacja wyniku losowania w atrakcyjny, interaktywny sposób (animowany prezent)
- Umożliwienie edycji własnej listy życzeń z funkcją autosave
- Wyświetlenie listy życzeń wylosowanej osoby
- Zapewnienie bezpiecznego dostępu zarówno dla zalogowanych jak i niezalogowanych uczestników
- Zablokowanie edycji list życzeń po dacie zakończenia wydarzenia

**Kluczowe funkcjonalności:**

- Interaktywne odkrywanie wyniku (animacja, konfetti) przy pierwszym wyświetleniu
- Automatyczne linkowanie URL-i w listach życzeń
- Autosave podczas edycji listy życzeń (debounce 2s)
- Breadcrumb dla zalogowanych użytkowników
- Responsywność (mobile + desktop)
- Obsługa błędów i stanów ładowania

## 2. Routing widoku

Widok jest dostępny na dwóch ścieżkach:

### 2.1. Ścieżka dla zalogowanych użytkowników

- **URL:** `/groups/:groupId/result`
- **Plik:** `src/pages/groups/[groupId]/result.astro`
- **Autoryzacja:** Wymaga zalogowania (Bearer token w cookie)
- **API Endpoint:** `GET /api/groups/:groupId/result`
- **Przekierowanie:** Jeśli użytkownik nie jest zalogowany → `/login?returnUrl=/groups/:groupId/result`

### 2.2. Ścieżka dla niezarejestrowanych uczestników

- **URL:** `/results/:token`
- **Plik:** `src/pages/results/[token].astro`
- **Autoryzacja:** Token w URL (weryfikacja po stronie API)
- **API Endpoint:** `GET /api/results/:token`
- **Brak przekierowania:** Dostęp bezpośredni przez unikalny link

### 2.3. Wspólna logika

Obie strony Astro będą renderować ten sam komponent React `ResultView`, przekazując odpowiednie propsy:

- `groupId` lub `token` jako identyfikator
- `isAuthenticated` - flaga określająca tryb dostępu
- `accessToken` - dla niezalogowanych (z URL)

## 3. Struktura komponentów

```
ResultView (główny kontener)
├── ResultHeader
│   ├── Breadcrumb (tylko dla zalogowanych)
│   │   └── Home > Pulpit > Grupy > [Nazwa grupy] > Wynik
│   ├── GroupTitle (nazwa grupy)
│   └── GroupInfo
│       ├── BudgetDisplay (formatowany budżet z walutą)
│       └── EndDateDisplay (formatowana data zakończenia)
│
├── ResultReveal (sekcja odkrywania wyniku)
│   ├── GiftBox (animowany prezent)
│   │   ├── GiftIcon (SVG prezentu)
│   │   └── RevealButton ("Kliknij, aby odkryć!")
│   ├── Confetti (animacja konfetti po odkryciu)
│   └── AssignedPersonCard (wyświetlana po odkryciu)
│       ├── Avatar (inicjały wylosowanej osoby)
│       ├── PersonName (imię wylosowanej osoby)
│       └── Label ("Kupujesz prezent dla:")
│
└── WishlistSection (sekcja list życzeń)
    ├── MyWishlist (moja lista życzeń)
    │   ├── SectionTitle ("Moja lista życzeń")
    │   ├── WishlistEditor (edytor z autosave)
    │   │   ├── Textarea (pole tekstowe)
    │   │   ├── SaveIndicator (status: "Zapisywanie...", "Zapisano", błąd)
    │   │   └── CharacterCount (licznik znaków: X/10000)
    │   └── EditLockMessage (komunikat o zablokowaniu, jeśli po dacie)
    │
    └── TheirWishlist (lista życzeń wylosowanej osoby)
        ├── SectionTitle ("[Imię] życzy sobie:")
        ├── WishlistDisplay (wyświetlanie z auto-linkowanymi URL)
        │   └── LinkedContent (treść z klikalnymi linkami)
        └── EmptyWishlistMessage (gdy brak listy)
            └── "Ta osoba nie dodała jeszcze swojej listy życzeń"
```

## 4. Szczegóły komponentów

### 4.1. ResultView

**Opis:** Główny komponent kontenera widoku wyniku. Odpowiada za pobieranie danych z API, zarządzanie stanem odkrycia wyniku oraz koordynację wszystkich podkomponentów.

**Główne elementy:**

- Container div z responsywnym layoutem
- Warunkowe renderowanie komponentów (loading, error, success states)
- Integracja z custom hooks (useResultData, useRevealState)

**Obsługiwane zdarzenia:**

- Montowanie komponentu → pobieranie danych z API
- Zmiana danych → aktualizacja ViewModelu
- Błąd API → wyświetlenie komunikatu o błędzie

**Warunki walidacji:**

- Sprawdzenie czy losowanie zostało przeprowadzone (is_drawn)
- Sprawdzenie dostępu użytkownika (autoryzacja przez API)
- Walidacja tokenu (dla niezalogowanych)

**Typy:**

- `ResultViewModel` - model widoku z przetworzonymi danymi
- `DrawResultResponseDTO` - DTO z API
- Props: `{ groupId?: number; token?: string; isAuthenticated: boolean }`

**Propsy:**

```typescript
interface ResultViewProps {
  groupId?: number; // dla zalogowanych
  token?: string; // dla niezalogowanych
  isAuthenticated: boolean; // flaga trybu dostępu
}
```

### 4.2. ResultHeader

**Opis:** Nagłówek widoku zawierający breadcrumb (dla zalogowanych), nazwę grupy oraz podstawowe informacje (budżet, data zakończenia).

**Główne elementy:**

- `Breadcrumb` - ścieżka nawigacji (warunkowa, tylko dla zalogowanych)
- `h1` - nazwa grupy (główny tytuł)
- Sekcja z informacjami:
  - Ikona + formatowany budżet (np. "150 PLN")
  - Ikona + formatowana data zakończenia (np. "do 25 grudnia 2025")

**Obsługiwane zdarzenia:**

- Kliknięcie w breadcrumb → nawigacja do odpowiedniej strony

**Warunki walidacji:**

- Breadcrumb wyświetlany tylko gdy `isAuthenticated === true`

**Typy:**

- `ResultGroupInfo` z formatowanymi polami

**Propsy:**

```typescript
interface ResultHeaderProps {
  group: {
    id: number;
    name: string;
    formattedBudget: string; // "150 PLN"
    formattedEndDate: string; // "25 grudnia 2025"
  };
  isAuthenticated: boolean;
}
```

### 4.3. ResultReveal

**Opis:** Interaktywny komponent odkrywania wyniku. Wyświetla animowany prezent, który po kliknięciu ujawnia wylosowaną osobę z efektem konfetti. Stan odkrycia przechowywany w localStorage.

**Główne elementy:**

- `GiftBox` - animowany kontener z ikoną prezentu
- `RevealButton` - przycisk "Kliknij, aby odkryć!" (widoczny tylko przed odkryciem)
- `Confetti` - komponent z animacją konfetti (biblioteka react-confetti lub canvas-confetti)
- `AssignedPersonCard` - karta z wylosowaną osobą (widoczna po odkryciu)

**Obsługiwane zdarzenia:**

- Kliknięcie w prezent/przycisk → odkrycie wyniku
  - Odtworzenie animacji (fade, scale, rotate)
  - Uruchomienie konfetti
  - Zapisanie stanu w localStorage
  - Aktualizacja stanu `isRevealed`
- Montowanie komponentu → sprawdzenie localStorage czy już odkryto

**Warunki walidacji:**

- Sprawdzenie localStorage przed renderowaniem animacji
- Klucz localStorage: `result_revealed_${groupId}_${participantId}`
- Wartość: `{ revealed: true, timestamp: Date.now() }`

**Typy:**

- `ResultRevealState` - stan odkrycia
- `ResultAssignedParticipant` - dane wylosowanej osoby

**Propsy:**

```typescript
interface ResultRevealProps {
  assignedPerson: {
    id: number;
    name: string;
    initials: string; // wyliczone inicjały dla avatara
  };
  participantId: number;
  groupId: number;
}
```

### 4.4. AssignedPersonCard

**Opis:** Karta wyświetlająca informacje o wylosowanej osobie. Zawiera avatar z inicjałami, imię oraz etykietę wyjaśniającą.

**Główne elementy:**

- `Avatar` (Shadcn) - z inicjałami wylosowanej osoby
- `Label` - "Kupujesz prezent dla:"
- `PersonName` - imię wylosowanej osoby (większa czcionka, pogrubienie)
- Container z responsywnym layoutem (flex column na mobile, row na desktop)

**Obsługiwane zdarzenia:**

- Brak interakcji (komponent statyczny)

**Warunki walidacji:**

- Brak (dane już zwalidowane na wyższym poziomie)

**Typy:**

- `ResultAssignedParticipant`

**Propsy:**

```typescript
interface AssignedPersonCardProps {
  person: {
    id: number;
    name: string;
    initials: string;
  };
}
```

### 4.5. WishlistSection

**Opis:** Główna sekcja zawierająca dwie listy życzeń - własną (edytowalną) i wylosowanej osoby (tylko do odczytu). Odpowiada za layout i organizację podkomponentów.

**Główne elementy:**

- Container grid/flex z responsywnym układem
- `MyWishlist` - sekcja własnej listy (z edytorem)
- `TheirWishlist` - sekcja listy wylosowanej osoby (readonly)

**Obsługiwane zdarzenia:**

- Przekazywanie callbacków do komponentów dzieci

**Warunki walidacji:**

- Sprawdzenie `can_edit` dla własnej listy (czy można edytować)
- Sprawdzenie czy wylosowana osoba ma listę życzeń

**Typy:**

- `ResultMyWishlist`
- `ResultAssignedParticipant` (z wishlist)

**Propsy:**

```typescript
interface WishlistSectionProps {
  myWishlist: {
    content?: string;
    canEdit: boolean;
  };
  theirWishlist: {
    content?: string;
    contentHtml?: string;
  };
  assignedPersonName: string;
  participantId: number;
  groupEndDate: string;
  accessToken?: string; // dla niezalogowanych
}
```

### 4.6. WishlistEditor

**Opis:** Edytor listy życzeń z funkcją autosave. Wyświetla pole tekstowe, status zapisywania oraz licznik znaków. Blokuje edycję po dacie zakończenia wydarzenia.

**Główne elementy:**

- `Textarea` (Shadcn) - pole tekstowe (10000 znaków max)
- `SaveIndicator` - status zapisywania:
  - "Zapisywanie..." (spinner)
  - "Zapisano" (checkmark, zielony)
  - "Błąd zapisu" (error icon, czerwony)
- `CharacterCount` - "X/10000 znaków"
- `EditLockMessage` - komunikat gdy edycja zablokowana (po dacie zakończenia)

**Obsługiwane zdarzenia:**

- Zmiana tekstu (`onChange`) → aktualizacja stanu lokalnego
- Debounce (2s) → wywołanie API PUT /api/participants/:id/wishlist
- Blur → natychmiastowy zapis (jeśli są niezapisane zmiany)

**Warunki walidacji:**

- Maksymalna długość: 10000 znaków (walidacja po stronie klienta + API)
- Minimalna długość: 1 znak (jeśli pole nie puste)
- Blokada edycji jeśli `canEdit === false` (po dacie zakończenia)
- Blokada edycji podczas zapisywania (`isSaving === true`)

**Typy:**

- `CreateOrUpdateWishlistCommand` - command do API
- `WishlistEditorState` - stan edytora

**Propsy:**

```typescript
interface WishlistEditorProps {
  initialContent: string;
  participantId: number;
  canEdit: boolean;
  endDate: string;
  accessToken?: string; // dla niezalogowanych
}
```

### 4.7. WishlistDisplay

**Opis:** Komponent wyświetlający listę życzeń tylko do odczytu z automatycznie linkowanymi URL-ami. Pokazuje pusty stan gdy lista nie istnieje.

**Główne elementy:**

- Container div z formatowaną treścią
- `LinkedContent` - HTML z klikalnymi linkami (dangerouslySetInnerHTML lub komponent parse)
- `EmptyState` - komunikat gdy brak listy ("Ta osoba nie dodała jeszcze swojej listy życzeń")

**Obsługiwane zdarzenia:**

- Brak (komponent readonly)
- Kliknięcie w link → otwarcie w nowej karcie (target="\_blank", rel="noopener noreferrer")

**Warunki walidacji:**

- Sprawdzenie czy `content` nie jest null/undefined/pusty string

**Typy:**

- String z treścią listy

**Propsy:**

```typescript
interface WishlistDisplayProps {
  content?: string;
  contentHtml?: string; // z API (już z auto-linkowanymi URL-ami)
  personName: string;
}
```

## 5. Typy

### 5.1. Istniejące typy (z types.ts)

Już zdefiniowane w projekcie:

```typescript
// Result DTOs (odpowiedzi z API)
interface ResultGroupInfo {
  id: number;
  name: string;
  budget: number;
  end_date: string;
}

interface ResultParticipantInfo {
  id: number;
  name: string;
}

interface ResultAssignedParticipant {
  id: number;
  name: string;
  wishlist?: string;
}

interface ResultMyWishlist {
  content?: string;
  can_edit: boolean;
}

interface DrawResultResponseDTO {
  group: ResultGroupInfo;
  participant: ResultParticipantInfo;
  assigned_to: ResultAssignedParticipant;
  my_wishlist: ResultMyWishlist;
}

// Wishlist DTOs
interface CreateOrUpdateWishlistCommand {
  wishlist: string;
}

interface WishlistWithHtmlDTO extends WishlistDTO {
  wishlist_html: string;
  can_edit: boolean;
}
```

### 5.2. Nowe typy ViewModel (do dodania w types.ts)

```typescript
/**
 * ViewModel dla widoku wyniku losowania
 * Rozszerza DTO o formatowane i obliczone pola dla frontendu
 */
export interface ResultViewModel {
  // Dane z API
  group: ResultGroupInfo;
  participant: ResultParticipantInfo;
  assigned_to: ResultAssignedParticipant;
  my_wishlist: ResultMyWishlist;

  // Formatowane wartości dla wyświetlania
  formattedBudget: string; // "150 PLN"
  formattedEndDate: string; // "25 grudnia 2025"
  formattedShortEndDate: string; // "25.12.2025"

  // Obliczone wartości
  isExpired: boolean; // czy data zakończenia minęła
  daysUntilEnd: number; // ile dni do końca (-1 jeśli przeszła)

  // Dane wylosowanej osoby (rozszerzone)
  assignedPersonInitials: string; // "JK" - inicjały dla avatara
  assignedPersonWishlistHtml?: string; // HTML z auto-linkowanymi URL-ami

  // Flagi dostępu i kontekstu
  isAuthenticated: boolean; // czy użytkownik zalogowany
  accessToken?: string; // token dla niezalogowanych
}

/**
 * Stan edytora listy życzeń
 * Używany w useWishlistEditor hook
 */
export interface WishlistEditorState {
  content: string; // aktualna treść
  originalContent: string; // oryginalna treść (z API)
  isSaving: boolean; // czy trwa zapisywanie
  hasChanges: boolean; // czy są niezapisane zmiany
  lastSaved: Date | null; // kiedy ostatnio zapisano
  saveError: string | null; // komunikat błędu zapisu
  characterCount: number; // liczba znaków
  canEdit: boolean; // czy można edytować
}

/**
 * Stan odkrycia wyniku (localStorage)
 * Przechowywany w localStorage z kluczem:
 * result_revealed_${groupId}_${participantId}
 */
export interface ResultRevealState {
  groupId: number;
  participantId: number;
  revealed: boolean; // czy wynik odkryty
  revealedAt: number; // timestamp odkrycia (Date.now())
}

/**
 * Stan konfetti (dla animacji)
 */
export interface ConfettiState {
  isActive: boolean; // czy animacja aktywna
  numberOfPieces: number; // liczba elementów konfetti (200-400)
  recycle: boolean; // czy recyklować (false = jedno odtworzenie)
}
```

### 5.3. Typy dla Custom Hooks

```typescript
/**
 * Zwracany typ z useResultData hook
 */
export interface UseResultDataReturn {
  result: ResultViewModel | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

/**
 * Zwracany typ z useRevealState hook
 */
export interface UseRevealStateReturn {
  isRevealed: boolean;
  reveal: () => void;
  reset: () => void;
}

/**
 * Zwracany typ z useWishlistEditor hook
 */
export interface UseWishlistEditorReturn {
  state: WishlistEditorState;
  content: string;
  setContent: (content: string) => void;
  isSaving: boolean;
  saveError: string | null;
  lastSaved: Date | null;
  canEdit: boolean;
  characterCount: number;
  hasChanges: boolean;
  save: () => Promise<void>;
}

/**
 * Zwracany typ z useWishlistLinking hook
 */
export interface UseWishlistLinkingReturn {
  convertToHtml: (text: string) => string;
  extractUrls: (text: string) => string[];
}
```

## 6. Zarządzanie stanem

### 6.1. Stan globalny (ResultView)

```typescript
// W komponencie ResultView
const [result, setResult] = useState<DrawResultResponseDTO | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<ApiError | null>(null);
const [isRevealed, setIsRevealed] = useState(false);
```

### 6.2. Custom Hook: useResultData

**Cel:** Pobieranie danych wyniku z API, zarządzanie stanem ładowania i błędów.

**Lokalizacja:** `src/hooks/useResultData.ts`

**Sygnatura:**

```typescript
function useResultData(groupId?: number, token?: string, isAuthenticated?: boolean): UseResultDataReturn;
```

**Logika:**

1. Określenie endpointu na podstawie parametrów:
   - Jeśli `groupId` i `isAuthenticated` → `/api/groups/${groupId}/result`
   - Jeśli `token` → `/api/results/${token}`
2. Fetch danych przy montowaniu komponentu
3. Obsługa stanów: loading, success, error
4. Transformacja DTO → ViewModel (formatowanie dat, budżetu, obliczanie pól)
5. Funkcja refetch dla ręcznego odświeżenia

**Przykład użycia:**

```typescript
const { result, isLoading, error, refetch } = useResultData(groupId, token, isAuthenticated);
```

### 6.3. Custom Hook: useRevealState

**Cel:** Zarządzanie stanem odkrycia wyniku w localStorage.

**Lokalizacja:** `src/hooks/useRevealState.ts`

**Sygnatura:**

```typescript
function useRevealState(groupId: number, participantId: number): UseRevealStateReturn;
```

**Logika:**

1. Generowanie klucza localStorage: `result_revealed_${groupId}_${participantId}`
2. Odczyt stanu z localStorage przy montowaniu
3. Funkcja `reveal()` - zapisuje stan odkrycia do localStorage i aktualizuje stan
4. Funkcja `reset()` - usuwa stan z localStorage (do testowania)

**Przykład użycia:**

```typescript
const { isRevealed, reveal, reset } = useRevealState(result.group.id, result.participant.id);

// W handleRevealClick
const handleRevealClick = () => {
  reveal(); // zapisuje do localStorage i ustawia isRevealed = true
};
```

### 6.4. Custom Hook: useWishlistEditor

**Cel:** Zarządzanie edycją listy życzeń z funkcją autosave.

**Lokalizacja:** `src/hooks/useWishlistEditor.ts`

**Sygnatura:**

```typescript
function useWishlistEditor(
  participantId: number,
  initialContent: string,
  canEdit: boolean,
  accessToken?: string
): UseWishlistEditorReturn;
```

**Logika:**

1. Stan lokalny: `content`, `isSaving`, `saveError`, `lastSaved`, `hasChanges`
2. Debounced save - użycie `useDebouncedCallback` (2 sekundy)
3. Wywołanie API PUT `/api/participants/:participantId/wishlist`
   - Dla zalogowanych: Bearer token w header
   - Dla niezalogowanych: `?token=${accessToken}` w query
4. Obsługa błędów zapisu
5. Funkcja `save()` - natychmiastowy zapis (np. przy blur)
6. Licznik znaków: `content.length`
7. Sprawdzenie zmian: `content !== originalContent`

**Przykład użycia:**

```typescript
const {
  content,
  setContent,
  isSaving,
  saveError,
  lastSaved,
  canEdit,
  characterCount,
  hasChanges
} = useWishlistEditor(
  participantId,
  initialWishlist,
  myWishlist.can_edit,
  accessToken
);

// W Textarea onChange
<Textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
  disabled={!canEdit || isSaving}
  maxLength={10000}
/>
```

### 6.5. Custom Hook: useWishlistLinking

**Cel:** Konwersja URL-i w tekście na klikalne linki HTML.

**Lokalizacja:** `src/hooks/useWishlistLinking.ts`

**Sygnatura:**

```typescript
function useWishlistLinking(): UseWishlistLinkingReturn;
```

**Logika:**

1. Funkcja `convertToHtml(text: string)` - konwertuje tekst na HTML z linkami
2. Regex do wykrywania URL-i: `/(https?:\/\/[^\s]+)/g`
3. Zastąpienie URL-i tagami `<a>` z atrybutami:
   - `href="..."`
   - `target="_blank"`
   - `rel="noopener noreferrer"`
   - `class="text-blue-600 hover:text-blue-800 underline"`
4. Funkcja `extractUrls(text: string)` - opcjonalna, zwraca tablicę URL-i

**Przykład użycia:**

```typescript
const { convertToHtml } = useWishlistLinking();

const theirWishlistHtml = convertToHtml(assignedTo.wishlist || "");

// Renderowanie
<div dangerouslySetInnerHTML={{ __html: theirWishlistHtml }} />
```

**Uwaga:** API może już zwracać `wishlist_html` z endpoint `/api/participants/:id/wishlist`, więc hook może być opcjonalny.

### 6.6. Synchronizacja stanu

- **localStorage:** Stan odkrycia wyniku (per użytkownik, per grupa)
- **API:** Lista życzeń (autosave z debounce)
- **Memory:** Stan ładowania, błędów, UI

**Diagram przepływu danych:**

```
API → useResultData → ResultViewModel → ResultView
                                           ├─→ ResultReveal (+ useRevealState ← → localStorage)
                                           └─→ WishlistSection
                                               ├─→ WishlistEditor (+ useWishlistEditor → API)
                                               └─→ WishlistDisplay (+ useWishlistLinking)
```

## 7. Integracja API

### 7.1. GET /api/groups/:groupId/result (dla zalogowanych)

**Kiedy wywołać:**

- Przy montowaniu komponentu `ResultView` (useEffect)
- Po refetch (np. po zapisie listy życzeń)

**Request:**

```typescript
// Headers
Authorization: Bearer {access_token} // z cookie Supabase

// Parametry URL
groupId: number
```

**Response (200 OK):**

```typescript
// Typ: DrawResultResponseDTO
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
    "wishlist": "I would love a book about cooking.\nhttps://example.com/wishlist"
  },
  "my_wishlist": {
    "content": "I like tech gadgets and board games.",
    "can_edit": true
  }
}
```

**Błędy:**

- **400** - Draw not completed: `{ error: { code: "DRAW_NOT_COMPLETED", message: "..." } }`
- **401** - Unauthorized: `{ error: { code: "UNAUTHORIZED", message: "..." } }`
- **403** - Forbidden: `{ error: { code: "FORBIDDEN", message: "..." } }`
- **404** - Group not found: `{ error: { code: "GROUP_NOT_FOUND", message: "..." } }`

**Obsługa w kodzie:**

```typescript
const fetchResult = async () => {
  try {
    const response = await fetch(`/api/groups/${groupId}/result`, {
      headers: {
        Authorization: `Bearer ${accessToken}`, // z Supabase session
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    const data: DrawResultResponseDTO = await response.json();
    return data;
  } catch (error) {
    // Obsługa błędu
  }
};
```

### 7.2. GET /api/results/:token (dla niezalogowanych)

**Kiedy wywołać:**

- Przy montowaniu komponentu `ResultView` (useEffect)
- Po refetch

**Request:**

```typescript
// Parametry URL
token: string; // z URL params
```

**Response (200 OK):**

```typescript
// Typ: DrawResultResponseDTO (identyczny jak powyżej)
{
  "group": { ... },
  "participant": { ... },
  "assigned_to": { ... },
  "my_wishlist": { ... }
}
```

**Błędy:**

- **400** - Draw not completed: `{ error: { code: "DRAW_NOT_COMPLETED", message: "..." } }`
- **404** - Invalid token: `{ error: { code: "INVALID_TOKEN", message: "..." } }`

**Obsługa w kodzie:**

```typescript
const fetchResult = async () => {
  try {
    const response = await fetch(`/api/results/${token}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    const data: DrawResultResponseDTO = await response.json();
    return data;
  } catch (error) {
    // Obsługa błędu
  }
};
```

### 7.3. PUT /api/participants/:participantId/wishlist

**Kiedy wywołać:**

- Po zmianie treści w edytorze (debounce 2s) - useWishlistEditor
- Przy blur z pola textarea (natychmiastowy zapis jeśli są zmiany)

**Request:**

```typescript
// Dla zalogowanych - Headers
Authorization: Bearer {access_token}

// Dla niezalogowanych - Query
?token={participant_token}

// Parametry URL
participantId: number

// Body (Typ: CreateOrUpdateWishlistCommand)
{
  "wishlist": "I would love:\n- A new book\n- Kitchen gadgets\nhttps://example.com/my-wishlist"
}
```

**Response (200 OK):**

```typescript
// Typ: WishlistDTO
{
  "id": 1,
  "participant_id": 1,
  "wishlist": "I would love:\n- A new book\n- Kitchen gadgets\nhttps://example.com/my-wishlist",
  "updated_at": "2025-10-14T10:00:00Z"
}
```

**Błędy:**

- **400** - End date passed: `{ error: { code: "END_DATE_PASSED", message: "..." } }`
- **401** - Unauthorized
- **403** - Forbidden (nie można edytować cudzej listy)
- **404** - Participant not found
- **422** - Missing wishlist field

**Obsługa w kodzie (w useWishlistEditor):**

```typescript
const save = async () => {
  setIsSaving(true);
  setSaveError(null);

  try {
    const url = `/api/participants/${participantId}/wishlist${accessToken ? `?token=${accessToken}` : ""}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(isAuthenticated && { Authorization: `Bearer ${authToken}` }),
      },
      body: JSON.stringify({ wishlist: content }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    setLastSaved(new Date());
    setOriginalContent(content); // aktualizacja "oryginału"
  } catch (error) {
    setSaveError(error.message);
  } finally {
    setIsSaving(false);
  }
};
```

### 7.4. GET /api/participants/:participantId/wishlist (opcjonalne)

**Kiedy wywołać:**

- Opcjonalnie, jeśli potrzebujemy odświeżyć listę życzeń
- Główne dane pobierane są już przez `/api/groups/:id/result` lub `/api/results/:token`

**Request:**

```typescript
// Dla zalogowanych - Headers
Authorization: Bearer {access_token}

// Dla niezalogowanych - Query
?token={participant_token}

// Parametry URL
participantId: number
```

**Response (200 OK):**

```typescript
// Typ: WishlistWithHtmlDTO
{
  "id": 1,
  "participant_id": 1,
  "wishlist": "I would love:\n- A new book\nhttps://example.com",
  "wishlist_html": "I would love:<br>- A new book<br><a href='https://example.com' target='_blank' rel='noopener noreferrer'>https://example.com</a>",
  "updated_at": "2025-10-14T10:00:00Z",
  "can_edit": true
}
```

**Błędy:**

- **401** - Unauthorized
- **403** - Forbidden
- **404** - Participant or wishlist not found

## 8. Interakcje użytkownika

### 8.1. Odkrycie wyniku losowania

**Trigger:** Kliknięcie w prezent/przycisk "Kliknij, aby odkryć!"

**Krok po kroku:**

1. Użytkownik klika na animowany prezent
2. Sprawdzenie stanu w localStorage (`isRevealed`)
   - Jeśli `true` → pomiń animację, pokaż wynik od razu
   - Jeśli `false` → odtwórz animację
3. Animacja odkrycia:
   - Fade out przycisku
   - Scale & rotate prezentu
   - Fade in wylosowanej osoby
   - Uruchomienie konfetti (2-3 sekundy)
4. Zapisanie stanu w localStorage:
   ```typescript
   const state: ResultRevealState = {
     groupId: result.group.id,
     participantId: result.participant.id,
     revealed: true,
     revealedAt: Date.now(),
   };
   localStorage.setItem(`result_revealed_${groupId}_${participantId}`, JSON.stringify(state));
   ```
5. Aktualizacja stanu komponentu: `setIsRevealed(true)`

**Warunki:**

- Losowanie musi być przeprowadzone (`is_drawn === true`)
- Dane muszą być załadowane (`isLoading === false`)

**Obsługa błędów:**

- Brak (animacja czysto frontendowa, brak wywołań API)

### 8.2. Edycja listy życzeń

**Trigger:** Wpisywanie tekstu w polu textarea własnej listy życzeń

**Krok po kroku:**

1. Użytkownik wpisuje tekst w textarea
2. Event `onChange` → aktualizacja stanu lokalnego `content`
3. Aktualizacja licznika znaków: `characterCount = content.length`
4. Sprawdzenie czy są zmiany: `hasChanges = content !== originalContent`
5. Wyświetlenie statusu: "Niezapisane zmiany"
6. Debounce (2s) → automatyczny zapis
7. Wywołanie API PUT `/api/participants/:id/wishlist`
8. Podczas zapisywania:
   - Status: "Zapisywanie..." (spinner)
   - Pole textarea disabled (opcjonalnie, lub tylko dimmed)
9. Po sukcesie:
   - Status: "Zapisano" (checkmark)
   - Aktualizacja `lastSaved = new Date()`
   - Ukrycie statusu po 3 sekundach
10. Po błędzie:
    - Status: "Błąd zapisu. Spróbuj ponownie" (error icon)
    - Przycisk "Spróbuj ponownie" → retry

**Warunki:**

- `canEdit === true` (nie minęła data zakończenia)
- `isSaving === false` (nie trwa obecnie zapis)
- Długość tekstu: 0-10000 znaków

**Obsługa błędów:**

- **400** - End date passed → blokada pola, komunikat "Czas na edycję minął"
- **401/403** - Unauthorized/Forbidden → przekierowanie do logowania
- **Network error** → komunikat "Problem z połączeniem. Sprawdź internet."

### 8.3. Blur z pola listy życzeń

**Trigger:** Użytkownik opuszcza pole textarea (blur event)

**Krok po kroku:**

1. Event `onBlur` → sprawdzenie czy są niezapisane zmiany (`hasChanges`)
2. Jeśli `hasChanges === true`:
   - Anulowanie debouncedSave (jeśli czeka w kolejce)
   - Natychmiastowe wywołanie `save()` (bez debounce)
3. Zapisywanie tak samo jak przy autosave (krok 8.2)

**Warunki:**

- Musi być przynajmniej 1 znak w polu (jeśli nie, opcjonalnie można usunąć listę)

**Obsługa błędów:**

- Jak w punkcie 8.2

### 8.4. Wklejenie linku do listy życzeń

**Trigger:** Użytkownik wkleja URL (Ctrl+V lub paste)

**Krok po kroku:**

1. Wklejenie tekstu z URL-em (np. "https://example.com")
2. Tekst pojawia się w textarea jako zwykły tekst
3. Zapisanie (autosave lub blur)
4. W sekcji wylosowanej osoby (`WishlistDisplay`):
   - URL automatycznie konwertowany na klikawy link
   - Użycie `useWishlistLinking` hook lub `wishlist_html` z API
5. Wyświetlenie linku z atrybutami:
   - `target="_blank"` (otwórz w nowej karcie)
   - `rel="noopener noreferrer"` (bezpieczeństwo)
   - CSS: kolor niebieski, underline, hover

**Warunki:**

- Brak (każdy tekst zaczynający się od http/https traktowany jako link)

**Obsługa błędów:**

- Brak (regex nie może "się zepsuć", w najgorszym przypadku nie wykryje linku)

### 8.5. Próba edycji po dacie zakończenia

**Trigger:** Użytkownik próbuje edytować pole textarea gdy `canEdit === false`

**Krok po kroku:**

1. Sprawdzenie `canEdit` przy renderowaniu komponentu
2. Jeśli `canEdit === false`:
   - Textarea readonly/disabled
   - Wyświetlenie komunikatu:
     ```
     ⚠️ Edycja listy życzeń została zablokowana.
     Czas na dodawanie życzeń minął (data zakończenia: 25 grudnia 2025).
     ```
3. Użytkownik nie może kliknąć ani wpisać tekstu

**Warunki:**

- `new Date() > new Date(group.end_date)`
- `my_wishlist.can_edit === false` (z API)

**Obsługa błędów:**

- Jeśli użytkownik próbuje wysłać request mimo blokady (np. DevTools):
  - API zwraca **400** - END_DATE_PASSED
  - Wyświetlenie toastu: "Nie można zapisać. Czas na edycję minął."

### 8.6. Kopiowanie linku do wyniku (dla niezalogowanych)

**Trigger:** Kliknięcie przycisku "Kopiuj link do wyniku" (opcjonalnie, jeśli dodamy)

**Krok po kroku:**

1. Użytkownik klika przycisk "Kopiuj link"
2. Wywołanie `navigator.clipboard.writeText(resultUrl)`
3. Wyświetlenie toastu: "Link skopiowany do schowka!"
4. URL: `${window.location.origin}/results/${token}`

**Warunki:**

- Dostępne tylko dla tokenu (nie dla zalogowanych na ścieżce `/groups/:id/result`)

**Obsługa błędów:**

- Jeśli clipboard API niedostępne:
  - Wyświetlenie modal z polem input readonly zawierającym link
  - Instrukcja: "Zaznacz i skopiuj link:"
  - Auto-select tekstu w polu

### 8.7. Nawigacja breadcrumb (dla zalogowanych)

**Trigger:** Kliknięcie w element breadcrumb

**Krok po kroku:**

1. Breadcrumb: Home > Pulpit > Grupy > [Nazwa grupy] > Wynik
2. Kliknięcie:
   - "Home" → `/` (strona główna)
   - "Pulpit" → `/dashboard`
   - "Grupy" → `/dashboard` (sekcja grup)
   - "[Nazwa grupy]" → `/groups/:id` (widok zarządzania grupą)

**Warunki:**

- Dostępne tylko dla zalogowanych użytkowników (`isAuthenticated === true`)

**Obsługa błędów:**

- Brak (standardowa nawigacja)

## 9. Warunki i walidacja

### 9.1. Warunki wyświetlania komponentów

#### ResultView

**Warunki:**

- Losowanie przeprowadzone: `is_drawn === true` (z API)
- Dostęp użytkownika:
  - Zalogowany: `groupId` i Bearer token w cookie
  - Niezalogowany: `token` w URL i ważny token (weryfikacja przez API)

**Walidacja:**

- Jeśli losowanie nie przeprowadzone (400 z API):

  ```typescript
  <ErrorState
    title="Losowanie nie zostało przeprowadzone"
    message="Losowanie dla tej grupy nie zostało jeszcze przeprowadzone. Skontaktuj się z organizatorem."
    action={<Button onClick={() => window.location.href = '/dashboard'}>Powrót do pulpitu</Button>}
  />
  ```

- Jeśli brak dostępu (401/403):

  ```typescript
  // Dla zalogowanych
  <ErrorState
    title="Brak dostępu"
    message="Nie masz uprawnień do zobaczenia tego wyniku."
    action={<Button onClick={() => window.location.href = '/dashboard'}>Powrót do pulpitu</Button>}
  />

  // Dla niezalogowanych (404 Invalid token)
  <ErrorState
    title="Link wygasł lub jest nieprawidłowy"
    message="Ten link jest nieprawidłowy lub wygasł. Skontaktuj się z organizatorem grupy po nowy link."
    action={<Button onClick={() => window.location.href = '/'}>Strona główna</Button>}
  />
  ```

#### ResultHeader - Breadcrumb

**Warunki:**

- Wyświetlany tylko gdy `isAuthenticated === true`

**Walidacja:**

```typescript
{isAuthenticated && (
  <Breadcrumb>
    <BreadcrumbItem href="/">Home</BreadcrumbItem>
    <BreadcrumbItem href="/dashboard">Pulpit</BreadcrumbItem>
    <BreadcrumbItem href="/dashboard">Grupy</BreadcrumbItem>
    <BreadcrumbItem href={`/groups/${groupId}`}>{groupName}</BreadcrumbItem>
    <BreadcrumbItem current>Wynik</BreadcrumbItem>
  </Breadcrumb>
)}
```

#### ResultReveal - Animacja

**Warunki:**

- Animacja pokazywana tylko przy pierwszym wyświetleniu
- Sprawdzenie localStorage: `result_revealed_${groupId}_${participantId}`

**Walidacja:**

```typescript
const [isRevealed, setIsRevealed] = useState(() => {
  const stored = localStorage.getItem(`result_revealed_${groupId}_${participantId}`);
  if (!stored) return false;
  try {
    const state: ResultRevealState = JSON.parse(stored);
    return state.revealed;
  } catch {
    return false;
  }
});

// W renderze
{isRevealed ? (
  <AssignedPersonCard person={assignedPerson} />
) : (
  <GiftBox onClick={handleReveal} />
)}
```

#### WishlistEditor - Edytowalność

**Warunki:**

- Pole edytowalne tylko gdy `canEdit === true`
- `canEdit` zależy od daty zakończenia: `new Date() <= new Date(group.end_date)`

**Walidacja:**

```typescript
// Z API
my_wishlist: {
  content: "...",
  can_edit: true // false jeśli end_date minęła
}

// W komponencie
<Textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
  disabled={!canEdit || isSaving}
  maxLength={10000}
  className={!canEdit ? 'opacity-50 cursor-not-allowed' : ''}
/>

{!canEdit && (
  <Alert variant="warning" className="mt-2">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      Edycja listy życzeń została zablokowana. Czas na dodawanie życzeń minął
      (data zakończenia: {formattedEndDate}).
    </AlertDescription>
  </Alert>
)}
```

### 9.2. Walidacja pól formularza

#### WishlistEditor - Pole textarea

**Warunki walidacji:**

1. **Długość:** min 0, max 10000 znaków
2. **Pusty string:** dozwolony (oznacza brak listy)
3. **Whitespace:** dozwolony (np. nowe linie)

**Walidacja:**

```typescript
// Frontend (w komponencie)
const MAX_LENGTH = 10000;

const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const newContent = e.target.value;

  // Walidacja długości
  if (newContent.length > MAX_LENGTH) {
    // Przetnij do max długości (opcjonalnie, albo zablokuj input)
    return;
  }

  setContent(newContent);
};

// Wyświetlenie licznika
<div className="text-sm text-gray-500 mt-1">
  <span className={characterCount > MAX_LENGTH * 0.9 ? 'text-orange-500' : ''}>
    {characterCount}
  </span>
  /{MAX_LENGTH} znaków
  {characterCount > MAX_LENGTH * 0.9 && (
    <span className="ml-2 text-orange-500">Zbliżasz się do limitu</span>
  )}
</div>
```

**API Validation (Zod schema w endpoint):**

```typescript
// W API endpoint
const CreateOrUpdateWishlistSchema = z.object({
  wishlist: z.string().min(1, "Wishlist content cannot be empty").max(10000, "Wishlist content is too long"),
});

// Obsługa błędu 422 na froncie
if (response.status === 422) {
  const error = await response.json();
  setSaveError(error.error.message); // "Wishlist content is too long"
}
```

### 9.3. Walidacja dostępu (Security)

#### Zalogowani użytkownicy

**Warunki:**

- Musi być zalogowany (Bearer token w cookie)
- Musi być uczestnikiem grupy (sprawdzane przez API)

**Walidacja:**

```typescript
// W Astro page
---
const { user } = Astro.locals;
if (!user) {
  return Astro.redirect(`/login?returnUrl=/groups/${groupId}/result`);
}
---
```

**API validation (w endpoint):**

- Guard 1: requireApiAuth - sprawdza Bearer token
- Guard 2: requireGroupAccess - sprawdza czy user jest uczestnikiem

#### Niezalogowani użytkownicy

**Warunki:**

- Token w URL musi być ważny
- Token musi należeć do istniejącego uczestnika
- Grupa musi mieć przeprowadzone losowanie

**Walidacja:**

```typescript
// API endpoint sprawdza token
const participant = await supabase.from("participants").select("*").eq("access_token", token).single();

if (!participant) {
  throw new Error("INVALID_TOKEN"); // → 404
}
```

**Frontend handling:**

```typescript
// Obsługa błędu invalid token
if (error?.code === 'INVALID_TOKEN') {
  return (
    <ErrorState
      title="Link wygasł lub jest nieprawidłowy"
      message="Skontaktuj się z organizatorem po nowy link dostępu."
    />
  );
}
```

### 9.4. Walidacja dat

#### Data zakończenia wydarzenia

**Warunki:**

- `can_edit` zależy od porównania: `now <= end_date`
- Formatowanie daty dla użytkownika (locale PL)

**Walidacja:**

```typescript
// Funkcja helper (w formatters.ts lub utils)
export function isDateExpired(endDate: string): boolean {
  return new Date() > new Date(endDate);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  // Output: "25 grudnia 2025"
}

export function calculateDaysUntilEnd(endDate: string): number {
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : -1;
}
```

**Użycie:**

```typescript
const isExpired = isDateExpired(group.end_date);
const canEdit = !isExpired && my_wishlist.can_edit;
const daysLeft = calculateDaysUntilEnd(group.end_date);

// Wyświetlenie
{daysLeft > 0 && (
  <Badge variant="secondary">
    Pozostało {daysLeft} {daysLeft === 1 ? 'dzień' : 'dni'} na edycję
  </Badge>
)}

{isExpired && (
  <Badge variant="destructive">
    Wydarzenie zakończone
  </Badge>
)}
```

## 10. Obsługa błędów

### 10.1. Scenariusze błędów z API

#### Błąd 400 - Draw Not Completed

**Scenariusz:** Losowanie nie zostało jeszcze przeprowadzone dla grupy

**Response:**

```json
{
  "error": {
    "code": "DRAW_NOT_COMPLETED",
    "message": "Draw has not been completed yet for this group"
  }
}
```

**Obsługa:**

```typescript
// W useResultData hook
if (error.code === 'DRAW_NOT_COMPLETED') {
  return (
    <div className="text-center py-12 px-4">
      <div className="mb-4">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Losowanie nie zostało przeprowadzone
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Losowanie dla tej grupy nie zostało jeszcze przeprowadzone.
        Skontaktuj się z organizatorem grupy.
      </p>
      <Button onClick={() => window.location.href = '/dashboard'}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót do pulpitu
      </Button>
    </div>
  );
}
```

#### Błąd 401 - Unauthorized

**Scenariusz:** Brak autoryzacji (brak tokenu lub token wygasł)

**Response:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Obsługa:**

```typescript
// W useResultData hook
if (error.code === 'UNAUTHORIZED') {
  // Dla zalogowanych - przekierowanie do logowania
  if (isAuthenticated) {
    window.location.href = `/login?returnUrl=${window.location.pathname}`;
    return null;
  }

  // Dla niezalogowanych - komunikat
  return (
    <div className="text-center py-12 px-4">
      <div className="mb-4">
        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Brak autoryzacji
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Nie masz uprawnień do zobaczenia tego wyniku.
        {isAuthenticated
          ? ' Zaloguj się, aby zobaczyć swój wynik.'
          : ' Twój link może być nieprawidłowy lub wygasły.'}
      </p>
      <Button onClick={() => window.location.href = isAuthenticated ? '/login' : '/'}>
        {isAuthenticated ? 'Zaloguj się' : 'Strona główna'}
      </Button>
    </div>
  );
}
```

#### Błąd 403 - Forbidden

**Scenariusz:** Użytkownik nie jest uczestnikiem grupy

**Response:**

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not a participant in this group"
  }
}
```

**Obsługa:**

```typescript
if (error.code === 'FORBIDDEN') {
  return (
    <div className="text-center py-12 px-4">
      <div className="mb-4">
        <Shield className="w-16 h-16 text-red-500 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Brak dostępu
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Nie jesteś uczestnikiem tej grupy i nie możesz zobaczyć wyniku losowania.
      </p>
      <Button onClick={() => window.location.href = '/dashboard'}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót do pulpitu
      </Button>
    </div>
  );
}
```

#### Błąd 404 - Not Found (Invalid Token)

**Scenariusz:** Token nieprawidłowy lub wygasły (dla niezalogowanych)

**Response:**

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired access token"
  }
}
```

**Obsługa:**

```typescript
if (error.code === 'INVALID_TOKEN') {
  return (
    <div className="text-center py-12 px-4">
      <div className="mb-4">
        <LinkIcon className="w-16 h-16 text-gray-400 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Link wygasł lub jest nieprawidłowy
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Ten link dostępu jest nieprawidłowy lub wygasł.
        Skontaktuj się z organizatorem grupy, aby otrzymać nowy link.
      </p>
      <Button onClick={() => window.location.href = '/'}>
        <Home className="mr-2 h-4 w-4" />
        Strona główna
      </Button>
    </div>
  );
}
```

#### Błąd 404 - Group Not Found

**Scenariusz:** Grupa nie istnieje

**Response:**

```json
{
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "Group not found"
  }
}
```

**Obsługa:**

```typescript
if (error.code === 'GROUP_NOT_FOUND') {
  return (
    <div className="text-center py-12 px-4">
      <div className="mb-4">
        <Search className="w-16 h-16 text-gray-400 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Nie znaleziono grupy
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Grupa o podanym ID nie istnieje lub została usunięta.
      </p>
      <Button onClick={() => window.location.href = '/dashboard'}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót do pulpitu
      </Button>
    </div>
  );
}
```

### 10.2. Błędy zapisywania listy życzeń

#### Błąd 400 - End Date Passed

**Scenariusz:** Próba edycji listy życzeń po dacie zakończenia

**Response:**

```json
{
  "error": {
    "code": "END_DATE_PASSED",
    "message": "Cannot update wishlist after group end date has passed"
  }
}
```

**Obsługa:**

```typescript
// W useWishlistEditor hook
catch (error) {
  if (error.code === 'END_DATE_PASSED') {
    setSaveError('Czas na edycję listy życzeń minął');
    setCanEdit(false); // blokada pola

    // Toast notification
    toast.error('Nie można zapisać', {
      description: 'Czas na dodawanie życzeń już minął.',
    });
  }
}

// W komponencie WishlistEditor
{saveError && (
  <Alert variant="destructive" className="mt-2">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{saveError}</AlertDescription>
  </Alert>
)}
```

#### Błąd 422 - Validation Error (Too Long)

**Scenariusz:** Tekst za długi (>10000 znaków)

**Response:**

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Wishlist content is too long",
    "details": { ... }
  }
}
```

**Obsługa:**

```typescript
catch (error) {
  if (error.code === 'INVALID_INPUT') {
    setSaveError('Lista życzeń jest za długa (max 10000 znaków)');

    toast.error('Błąd walidacji', {
      description: 'Lista życzeń nie może przekraczać 10000 znaków.',
    });
  }
}
```

### 10.3. Błędy sieciowe

#### Network Error

**Scenariusz:** Brak połączenia z internetem lub problem z serwerem

**Obsługa:**

```typescript
// W useResultData hook
catch (error) {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    setError({
      code: 'NETWORK_ERROR',
      message: 'Problem z połączeniem. Sprawdź swoje połączenie internetowe.',
    });
  }
}

// Komponent
if (error?.code === 'NETWORK_ERROR') {
  return (
    <div className="text-center py-12 px-4">
      <div className="mb-4">
        <WifiOff className="w-16 h-16 text-gray-400 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Problem z połączeniem
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Nie można połączyć się z serwerem. Sprawdź swoje połączenie internetowe i spróbuj ponownie.
      </p>
      <Button onClick={refetch}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Spróbuj ponownie
      </Button>
    </div>
  );
}
```

#### Timeout Error

**Scenariusz:** Request trwa zbyt długo

**Obsługa:**

```typescript
// W fetch z timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error("REQUEST_TIMEOUT");
    }
    throw error;
  }
};

// Obsługa
if (error.message === "REQUEST_TIMEOUT") {
  toast.error("Zbyt długie oczekiwanie", {
    description: "Serwer nie odpowiada. Spróbuj ponownie za chwilę.",
  });
}
```

### 10.4. Błędy localStorage

#### QuotaExceededError

**Scenariusz:** Brak miejsca w localStorage

**Obsługa:**

```typescript
// W useRevealState hook
try {
  localStorage.setItem(key, JSON.stringify(state));
} catch (error) {
  if (error.name === "QuotaExceededError") {
    console.warn("localStorage full, clearing old reveal states");
    // Wyczyść stare stany odkrycia
    clearOldRevealStates();
    // Spróbuj ponownie
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Jeśli nadal błąd, ignoruj (odkrycie będzie pokazywane za każdym razem)
    }
  }
}

function clearOldRevealStates() {
  const keys = Object.keys(localStorage);
  const revealKeys = keys.filter((k) => k.startsWith("result_revealed_"));
  revealKeys.forEach((key) => {
    try {
      const state = JSON.parse(localStorage.getItem(key) || "{}");
      // Usuń stany starsze niż 30 dni
      if (state.revealedAt && Date.now() - state.revealedAt > 30 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
      }
    } catch {}
  });
}
```

### 10.5. Błędy konfetti

#### Browser Not Supported

**Scenariusz:** Przeglądarka nie wspiera canvas lub animacji

**Obsługa:**

```typescript
// W ResultReveal component
const [confettiSupported, setConfettiSupported] = useState(true);

useEffect(() => {
  // Sprawdź wsparcie dla canvas
  const canvas = document.createElement('canvas');
  if (!canvas.getContext || !canvas.getContext('2d')) {
    setConfettiSupported(false);
  }

  // Sprawdź prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    setConfettiSupported(false);
  }
}, []);

// W renderze
{confettiSupported && isRevealed && (
  <Confetti
    recycle={false}
    numberOfPieces={300}
    gravity={0.3}
  />
)}
```

### 10.6. Uniwersalny ErrorBoundary

**Obsługa nieoczekiwanych błędów React:**

```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-12 px-4">
          <div className="mb-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Coś poszło nie tak
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.
          </p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Odśwież stronę
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Użycie
<ErrorBoundary>
  <ResultView {...props} />
</ErrorBoundary>
```

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

**Czas:** 30 minut

**Zadania:**

1. Stwórz pliki stron Astro:
   - `src/pages/groups/[groupId]/result.astro`
   - `src/pages/results/[token].astro`

2. Stwórz folder dla komponentów wyniku:
   - `src/components/result/` (nowy folder)

3. Stwórz pliki komponentów React (puste szkielety):
   - `src/components/result/ResultView.tsx`
   - `src/components/result/ResultHeader.tsx`
   - `src/components/result/ResultReveal.tsx`
   - `src/components/result/AssignedPersonCard.tsx`
   - `src/components/result/WishlistSection.tsx`
   - `src/components/result/WishlistEditor.tsx`
   - `src/components/result/WishlistDisplay.tsx`

4. Stwórz pliki custom hooks (puste szkielety):
   - `src/hooks/useResultData.ts`
   - `src/hooks/useRevealState.ts`
   - `src/hooks/useWishlistEditor.ts`
   - `src/hooks/useWishlistLinking.ts`

**Weryfikacja:**

- Wszystkie pliki utworzone i dostępne w IDE
- Brak błędów kompilacji TypeScript

---

### Krok 2: Rozszerzenie typów

**Czas:** 45 minut

**Zadania:**

1. Otwórz `src/types.ts`

2. Dodaj nowe typy ViewModel:

   ```typescript
   export interface ResultViewModel {
     group: ResultGroupInfo;
     participant: ResultParticipantInfo;
     assigned_to: ResultAssignedParticipant;
     my_wishlist: ResultMyWishlist;
     formattedBudget: string;
     formattedEndDate: string;
     formattedShortEndDate: string;
     isExpired: boolean;
     daysUntilEnd: number;
     assignedPersonInitials: string;
     assignedPersonWishlistHtml?: string;
     isAuthenticated: boolean;
     accessToken?: string;
   }

   export interface WishlistEditorState {
     content: string;
     originalContent: string;
     isSaving: boolean;
     hasChanges: boolean;
     lastSaved: Date | null;
     saveError: string | null;
     characterCount: number;
     canEdit: boolean;
   }

   export interface ResultRevealState {
     groupId: number;
     participantId: number;
     revealed: boolean;
     revealedAt: number;
   }

   export interface ConfettiState {
     isActive: boolean;
     numberOfPieces: number;
     recycle: boolean;
   }
   ```

3. Dodaj typy dla custom hooks:

   ```typescript
   export interface UseResultDataReturn {
     result: ResultViewModel | null;
     isLoading: boolean;
     error: ApiError | null;
     refetch: () => Promise<void>;
   }

   export interface UseRevealStateReturn {
     isRevealed: boolean;
     reveal: () => void;
     reset: () => void;
   }

   export interface UseWishlistEditorReturn {
     state: WishlistEditorState;
     content: string;
     setContent: (content: string) => void;
     isSaving: boolean;
     saveError: string | null;
     lastSaved: Date | null;
     canEdit: boolean;
     characterCount: number;
     hasChanges: boolean;
     save: () => Promise<void>;
   }

   export interface UseWishlistLinkingReturn {
     convertToHtml: (text: string) => string;
     extractUrls: (text: string) => string[];
   }
   ```

4. Dodaj funkcje helper do `src/lib/utils/formatters.ts`:
   ```typescript
   export function getInitials(name: string): string {
     return name
       .split(" ")
       .map((word) => word[0])
       .join("")
       .toUpperCase()
       .slice(0, 2);
   }
   ```

**Weryfikacja:**

- Brak błędów TypeScript
- Wszystkie typy zaimportowane poprawnie w plikach komponentów

---

### Krok 3: Implementacja custom hooks

**Czas:** 2 godziny

#### 3.1. useResultData

**Zadania:**

1. Zaimplementuj logikę pobierania danych:
   - Określenie endpointu (authenticated vs token-based)
   - Fetch danych z API
   - Obsługa stanów (loading, error, success)
   - Transformacja DTO → ViewModel
   - Funkcja refetch

2. Formatowanie danych:
   - Budżet: `formatCurrency(budget)` → "150 PLN"
   - Data: `formatDate(end_date)` → "25 grudnia 2025"
   - Inicjały: `getInitials(name)` → "JS"
   - Sprawdzenie wygaśnięcia: `isDateExpired(end_date)`
   - Dni do końca: `calculateDaysUntilEnd(end_date)`

**Weryfikacja:**

- Hook zwraca poprawne dane po załadowaniu
- Obsługa błędów działa poprawnie
- Refetch odświeża dane

#### 3.2. useRevealState

**Zadania:**

1. Implementacja logiki localStorage:
   - Generowanie klucza: `result_revealed_${groupId}_${participantId}`
   - Odczyt stanu przy montowaniu
   - Funkcja `reveal()` - zapis do localStorage
   - Funkcja `reset()` - czyszczenie (do debugowania)

2. Obsługa błędów:
   - QuotaExceededError (brak miejsca)
   - Nieprawidłowy JSON w localStorage

**Weryfikacja:**

- Stan odkrycia zapisywany w localStorage
- Po odświeżeniu strony stan się utrzymuje
- Reset działa poprawnie

#### 3.3. useWishlistEditor

**Zadania:**

1. Implementacja logiki edycji:
   - Stan lokalny treści
   - Debounced save (użycie `lodash.debounce` lub custom hook)
   - Funkcja `save()` - wywołanie API
   - Licznik znaków
   - Flaga `hasChanges`

2. Integracja z API:
   - PUT `/api/participants/:id/wishlist`
   - Obsługa autoryzacji (Bearer token lub query token)
   - Obsługa błędów (END_DATE_PASSED, VALIDATION, NETWORK)

3. Status zapisywania:
   - `isSaving` - podczas zapisu
   - `lastSaved` - timestamp ostatniego zapisu
   - `saveError` - komunikat błędu

**Weryfikacja:**

- Autosave działa po 2 sekundach od ostatniej zmiany
- Natychmiastowy zapis przy blur
- Status zapisywania wyświetlany poprawnie
- Błędy obsługiwane i wyświetlane użytkownikowi

#### 3.4. useWishlistLinking

**Zadania:**

1. Implementacja konwersji URL → HTML:
   - Regex: `/(https?:\/\/[^\s]+)/g`
   - Zamiana URL na tagi `<a>` z atrybutami
   - Funkcja `extractUrls()` - zwraca tablicę URL-i

2. Testowanie:
   - Tekst bez URL-i
   - Tekst z jednym URL
   - Tekst z wieloma URL-ami
   - URL-e na końcu/początku/środku tekstu

**Weryfikacja:**

- URL-e konwertowane na klikalne linki
- Linki otwierane w nowej karcie (target="\_blank")
- Tekst bez URL-i pozostaje niezmieniony

---

### Krok 4: Implementacja komponentów UI (warstwa prezentacji)

**Czas:** 3 godziny

#### 4.1. AssignedPersonCard

**Zadania:**

1. Implementacja UI:
   - Avatar z inicjałami (Shadcn Avatar)
   - Etykieta "Kupujesz prezent dla:"
   - Imię wylosowanej osoby (większa czcionka)

2. Styling:
   - Responsywny layout (flex column → row)
   - Kolorystyka (gradient tła, cienie)
   - Animacja fade-in

**Weryfikacja:**

- Komponent wyświetla się poprawnie
- Responsywność działa
- Animacja płynna

#### 4.2. WishlistDisplay

**Zadania:**

1. Implementacja UI:
   - Tytuł sekcji: "[Imię] życzy sobie:"
   - Wyświetlenie treści z auto-linkowanymi URL-ami
   - Pusty stan: "Ta osoba nie dodała jeszcze swojej listy życzeń"

2. Rendering HTML:
   - Użycie `dangerouslySetInnerHTML` lub biblioteki (DOMPurify)
   - Stylowanie linków (niebieski, underline, hover)

**Weryfikacja:**

- Treść wyświetla się poprawnie
- Linki działają (otwierają w nowej karcie)
- Pusty stan wyświetlany gdy brak listy

#### 4.3. WishlistEditor

**Zadania:**

1. Implementacja UI:
   - Textarea (Shadcn)
   - SaveIndicator (status: zapisywanie, zapisano, błąd)
   - CharacterCount: "X/10000 znaków"
   - EditLockMessage (gdy canEdit === false)

2. Integracja z hookiem:
   - useWishlistEditor
   - onChange → setContent
   - onBlur → save()

3. Walidacja:
   - Max 10000 znaków
   - Disabled gdy canEdit === false
   - Disabled podczas zapisywania

**Weryfikacja:**

- Edycja działa płynnie
- Autosave po 2s
- Status zapisywania wyświetlany
- Blokada po dacie zakończenia

#### 4.4. WishlistSection

**Zadania:**

1. Implementacja layoutu:
   - Grid 2 kolumny (desktop) / 1 kolumna (mobile)
   - MyWishlist (z edytorem)
   - TheirWishlist (tylko odczyt)

2. Responsywność:
   - Mobile: stack vertical
   - Desktop: dwie kolumny obok siebie

**Weryfikacja:**

- Layout responsywny
- Obie listy wyświetlają się poprawnie

#### 4.5. ResultReveal

**Zadania:**

1. Implementacja GiftBox:
   - SVG ikona prezentu (animowana)
   - Przycisk "Kliknij, aby odkryć!"
   - Animacja hover (scale, rotate)

2. Implementacja Confetti:
   - Użycie biblioteki `react-confetti` lub `canvas-confetti`
   - Trigger po kliknięciu
   - Automatyczne wyłączenie po 3 sekundach
   - Respect prefers-reduced-motion

3. Logika odkrycia:
   - Integracja z useRevealState
   - handleReveal() - animacja + confetti + zapis do localStorage
   - Warunkowe renderowanie (prezent vs wynik)

**Weryfikacja:**

- Animacja prezentu działa
- Konfetti wyświetla się po kliknięciu
- Stan zapisywany w localStorage
- Po odświeżeniu strony wynik wyświetlany od razu (bez animacji)

#### 4.6. ResultHeader

**Zadania:**

1. Implementacja Breadcrumb (tylko dla zalogowanych):
   - Shadcn Breadcrumb
   - Ścieżka: Home > Pulpit > Grupy > [Nazwa] > Wynik
   - Linki działają

2. Informacje o grupie:
   - Nazwa grupy (h1)
   - Budżet (z ikoną)
   - Data zakończenia (z ikoną)

**Weryfikacja:**

- Breadcrumb wyświetlany tylko dla zalogowanych
- Nawigacja działa poprawnie
- Informacje formatowane czytelnie

---

### Krok 5: Implementacja głównego kontenera ResultView

**Czas:** 2 godziny

**Zadania:**

1. Stwórz główną strukturę:

   ```typescript
   export default function ResultView({ groupId, token, isAuthenticated }: ResultViewProps) {
     // Hooks
     const { result, isLoading, error, refetch } = useResultData(groupId, token, isAuthenticated);
     const { isRevealed, reveal } = useRevealState(
       result?.group.id || 0,
       result?.participant.id || 0
     );

     // Loading state
     if (isLoading) return <LoadingState />;

     // Error state
     if (error) return <ErrorState error={error} />;

     // Success state
     return (
       <div className="container mx-auto px-4 py-8">
         <ResultHeader group={result.group} isAuthenticated={isAuthenticated} />
         <ResultReveal
           assignedPerson={result.assigned_to}
           isRevealed={isRevealed}
           onReveal={reveal}
         />
         <WishlistSection
           myWishlist={result.my_wishlist}
           theirWishlist={result.assigned_to}
           participantId={result.participant.id}
           groupEndDate={result.group.end_date}
           accessToken={result.accessToken}
         />
       </div>
     );
   }
   ```

2. Implementacja stanów:
   - LoadingState - skeleton UI
   - ErrorState - różne typy błędów (patrz sekcja 10)
   - SuccessState - pełny widok

3. Obsługa błędów:
   - DRAW_NOT_COMPLETED
   - UNAUTHORIZED
   - FORBIDDEN
   - INVALID_TOKEN
   - NETWORK_ERROR

**Weryfikacja:**

- Wszystkie stany wyświetlają się poprawnie
- Błędy obsługiwane zgodnie z planem (sekcja 10)
- Layout responsywny

---

### Krok 6: Implementacja stron Astro

**Czas:** 1 godzina

#### 6.1. `/groups/[groupId]/result.astro`

**Zadania:**

1. Implementacja strony:

   ```astro
   ---
   import Layout from "@/layouts/Layout.astro";
   import ResultView from "@/components/result/ResultView";

   const { groupId } = Astro.params;
   const { user } = Astro.locals;

   // Guard: wymaga zalogowania
   if (!user) {
     return Astro.redirect(`/login?returnUrl=/groups/${groupId}/result`);
   }

   const groupIdNumber = parseInt(groupId || "0", 10);
   ---

   <Layout title="Wynik losowania">
     <ResultView client:load groupId={groupIdNumber} isAuthenticated={true} />
   </Layout>
   ```

**Weryfikacja:**

- Strona dostępna pod `/groups/:groupId/result`
- Przekierowanie do logowania jeśli niezalogowany
- Komponent React renderowany poprawnie

#### 6.2. `/results/[token].astro`

**Zadania:**

1. Implementacja strony:

   ```astro
   ---
   import Layout from "@/layouts/Layout.astro";
   import ResultView from "@/components/result/ResultView";

   const { token } = Astro.params;
   ---

   <Layout title="Twój wynik Secret Santa">
     <ResultView client:load token={token} isAuthenticated={false} />
   </Layout>
   ```

**Weryfikacja:**

- Strona dostępna pod `/results/:token`
- Brak wymagania logowania
- Komponent React renderowany poprawnie

---

### Krok 7: Integracja i testy manualne - AKTUALNIE pomijamy testy

<!-- **Czas:** 2 godziny

**Zadania:**
1. **Testy scenariuszy pozytywnych:**
   - ✅ Zalogowany użytkownik otwiera wynik (`/groups/:id/result`)
   - ✅ Niezalogowany użytkownik otwiera wynik (`/results/:token`)
   - ✅ Odkrycie wyniku (animacja, konfetti, localStorage)
   - ✅ Edycja własnej listy życzeń (autosave)
   - ✅ Wyświetlenie listy wylosowanej osoby (z linkami)
   - ✅ Breadcrumb (dla zalogowanych)

2. **Testy scenariuszy negatywnych:**
   - ❌ Losowanie nie przeprowadzone (400)
   - ❌ Brak autoryzacji (401)
   - ❌ Brak dostępu (403)
   - ❌ Nieprawidłowy token (404)
   - ❌ Grupa nie istnieje (404)
   - ❌ Edycja po dacie zakończenia (blokada)
   - ❌ Zbyt długa lista życzeń (>10000 znaków)

3. **Testy responsywności:**
   - 📱 Mobile (320px - 480px)
   - 📱 Tablet (481px - 768px)
   - 💻 Desktop (769px+)

4. **Testy wydajnościowe:**
   - ⚡ Czas ładowania danych (<2s)
   - ⚡ Autosave nie blokuje UI
   - ⚡ Animacje płynne (60 FPS)

5. **Testy dostępności:**
   - ♿ Nawigacja klawiaturą
   - ♿ Screen reader friendly
   - ♿ Kontrast kolorów (WCAG AA)
   - ♿ Prefers-reduced-motion -->

<!-- **Weryfikacja:**
- Wszystkie scenariusze testowe przechodzą
- Brak błędów w konsoli
- Brak błędów TypeScript
- Brak błędów ESLint -->

---

### Krok 8: Optymalizacja i refaktoryzacja

**Czas:** 1 godzina

**Zadania:**

1. **Optymalizacja performance:**
   - Dodaj React.memo() do komponentów statycznych
   - Użyj useMemo() dla kosztownych obliczeń
   - Użyj useCallback() dla callbacków
   - Lazy loading konfetti (dynamic import)

2. **Optymalizacja kodu:**
   - Wydziel powtarzające się fragmenty do komponentów
   - Stwórz utility functions dla wspólnej logiki
   - Dodaj komentarze JSDoc do funkcji

3. **Optymalizacja bundle:**
   - Sprawdź rozmiar bundle (`npm run build`)
   - Użyj code splitting jeśli potrzeba
   - Optymalizuj importy (tree shaking)

**Weryfikacja:**

- Rozmiar bundle akceptowalny
- Performance Lighthouse >90
- Brak duplikacji kodu

---

### Krok 9: Dokumentacja

**Czas:** 30 minut

**Zadania:**

1. Dodaj README dla komponentów:
   - `src/components/result/README.md`
   - Opis każdego komponentu
   - Przykłady użycia
   - Lista propsów

2. Dodaj komentarze w kodzie:
   - JSDoc dla funkcji publicznych
   - Komentarze inline dla skomplikowanej logiki

3. Zaktualizuj dokumentację projektu:
   - Dodaj sekcję "Widok wyniku" w głównym README
   - Dodaj screenshot widoku

**Weryfikacja:**

- Dokumentacja pełna i aktualna
- Komentarze jasne i pomocne

---

### Krok 10: Code review i finalizacja

**Czas:** 1 godzina

**Zadania:**

1. **Self code review:**
   - Przejrzyj cały kod
   - Sprawdź naming conventions
   - Sprawdź spójność stylistyczną
   - Usuń console.log() i TODO-sy

2. **Ostateczne testy:**
   - Przejdź przez wszystkie scenariusze użytkownika
   - Sprawdź wszystkie stany błędów
   - Przetestuj na różnych przeglądarkach (Chrome, Firefox, Safari)

3. **Merge i deploy:**
   - Stwórz pull request
   - Code review przez zespół (jeśli dotyczy)
   - Merge do main branch
   - Deploy na środowisko produkcyjne

**Weryfikacja:**

- ✅ Wszystkie wymagania PRD spełnione
- ✅ Wszystkie User Stories zaimplementowane
- ✅ Testy przechodzą
- ✅ Kod zreviewowany i zaaprobowany
- ✅ Wdrożenie na produkcję

---

## Podsumowanie kroków

| Krok      | Zadanie                        | Czas               | Priorytet |
| --------- | ------------------------------ | ------------------ | --------- | ------ | --- |
| 1         | Przygotowanie struktury plików | 30 min             | Wysoki    |
| 2         | Rozszerzenie typów             | 45 min             | Wysoki    |
| 3         | Implementacja custom hooks     | 2h                 | Wysoki    |
| 4         | Implementacja komponentów UI   | 3h                 | Wysoki    |
| 5         | Implementacja ResultView       | 2h                 | Wysoki    |
| 6         | Implementacja stron Astro      | 1h                 | Wysoki    |
| <!--      | 7                              | Integracja i testy | 2h        | Wysoki | --> |
| 8         | Optymalizacja                  | 1h                 | Średni    |
| 9         | Dokumentacja                   | 30 min             | Średni    |
| 10        | Code review i finalizacja      | 1h                 | Wysoki    |
| **TOTAL** |                                | **~13.5h**         |           |

---

## Zależności między krokami

```
Krok 1 (struktura plików)
  ↓
Krok 2 (typy)
  ↓
Krok 3 (hooks) ← muszą być przed komponentami
  ↓
Krok 4 (komponenty UI) ← mogą być równolegle
  ↓
Krok 5 (ResultView) ← łączy wszystko
  ↓
Krok 6 (strony Astro)
  ↓
Krok 7 (testy)
  ↓
Kroki 8-10 (optymalizacja, docs, review) ← mogą być równolegle
```

---

## Checklist końcowy

Przed uznaniem implementacji za ukończoną, upewnij się że:

- [ ] Wszystkie komponenty renderują się bez błędów
- [ ] Wszystkie custom hooki działają poprawnie
- [ ] API calls wykonują się prawidłowo (authenticated + token-based)
- [ ] Obsługa błędów działa dla wszystkich scenariuszy
- [ ] Animacje są płynne i responsywne
- [ ] Konfetti działa (z respect dla prefers-reduced-motion)
- [ ] Autosave list życzeń działa (debounce 2s)
- [ ] Auto-linkowanie URL-i w listach życzeń działa
- [ ] localStorage przechowuje stan odkrycia
- [ ] Breadcrumb wyświetlany tylko dla zalogowanych
- [ ] Responsywność działa na wszystkich urządzeniach
- [ ] Dostępność (a11y) spełnia WCAG AA
- [ ] Testy manualne przechodzą
- [ ] Brak błędów TypeScript
- [ ] Brak błędów ESLint
- [ ] Dokumentacja kompletna
- [ ] Code zreviewowany
- [ ] Wdrożenie na produkcję

---

## Wsparcie i troubleshooting

### Problem: Konfetti nie działa

**Rozwiązanie:**

- Sprawdź czy przeglądarka wspiera canvas
- Sprawdź czy prefers-reduced-motion nie jest włączony
- Sprawdź konsolę czy nie ma błędów importu biblioteki

### Problem: Autosave nie działa

**Rozwiązanie:**

- Sprawdź czy debounce jest poprawnie zaimplementowany
- Sprawdź network tab czy requesty są wysyłane
- Sprawdź czy canEdit === true
- Sprawdź czy nie ma błędów w konsoli

### Problem: localStorage nie zapisuje

**Rozwiązanie:**

- Sprawdź czy localStorage jest dostępny (incognito mode)
- Sprawdź czy nie ma QuotaExceededError
- Sprawdź czy klucz jest poprawnie generowany

### Problem: Token-based access nie działa

**Rozwiązanie:**

- Sprawdź czy token jest przekazywany w query (?token=...)
- Sprawdź czy API endpoint akceptuje token
- Sprawdź czy token jest ważny (nie wygasł)

---

Powodzenia w implementacji! 🎅🎁
