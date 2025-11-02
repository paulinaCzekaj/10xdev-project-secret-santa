# Plan implementacji systemu notyfikacji Secret Santa

## 1. Przegląd

System notyfikacji w aplikacji Secret Santa wymaga refaktoryzacji i standaryzacji. Obecny stan charakteryzuje się brakiem centralizacji komunikatów, duplikacją kodu oraz niespójnymi wzorcami użycia. Plan ten przedstawia kompleksowe podejście do stworzenia scentralizowanego, typowanego i łatwego w utrzymaniu systemu notyfikacji.

### Obecny stan

**Biblioteka**: Sonner 2.0.7 (już zainstalowana)
**Komponenty**: `Toaster` już skonfigurowany w layoutach
**Użycie**: 19 plików używa `toast` bezpośrednio z importu `sonner`

**Zidentyfikowane problemy:**
- ❌ Duplikacja komunikatów w wielu plikach
- ❌ Brak centralizacji i słownika komunikatów
- ❌ Brak typowania TypeScript dla notyfikacji
- ❌ Niespójne wzorce wywołań (czasem w hookach, czasem w komponentach)
- ❌ Brak helpera/service do zarządzania toastami
- ❌ Trudność w utrzymaniu i zmianie komunikatów

### Cel implementacji

Stworzyć **scentralizowany, typowany i łatwy w utrzymaniu system notyfikacji**, który:

1. **Centralizuje wszystkie komunikaty** w jednym miejscu (single source of truth)
2. **Zapewnia silne typowanie TypeScript** dla wszystkich notyfikacji
3. **Standaryzuje API** poprzez notification service/helper
4. **Ułatwia utrzymanie** - zmiana komunikatu w jednym miejscu
5. **Zwiększa spójność** - jednolite wzorce w całej aplikacji
6. **Wspiera i18n** - przygotowanie do przyszłej internationalizacji

### Zakres zmian

**Nowe pliki (5)**:
- `src/lib/notifications/types.ts` - typy TypeScript
- `src/lib/notifications/messages.ts` - słownik komunikatów
- `src/lib/notifications/notificationService.ts` - service/helper
- `src/lib/notifications/index.ts` - publiczne API
- `src/lib/notifications/README.md` - dokumentacja

**Pliki do refaktoryzacji (19)**:
- 6 plików auth (formularze + hooki)
- 8 plików group (komponenty + hooki)
- 3 pliki participant
- 2 pliki exclusion

**Pliki do aktualizacji**:
- `CLAUDE.md` - guidelines dla AI
- Testy jednostkowe (nowe)

## 2. Struktura systemu notyfikacji

### 2.1. Hierarchia plików

```
src/lib/notifications/
├── index.ts                    # Publiczne API (re-exporty)
├── types.ts                    # Definicje typów TypeScript
├── messages.ts                 # Słownik komunikatów (centralizacja)
├── notificationService.ts      # Service do zarządzania toastami
└── README.md                   # Dokumentacja użycia

src/__tests__/
└── notifications/
    ├── notificationService.test.ts
    └── messages.test.ts
```

### 2.2. Przepływ danych

```
Komponent/Hook
    ↓
notify.success('AUTH.LOGIN_SUCCESS')  ← Wywołanie z message key
    ↓
NotificationService
    ↓
messages[key] → { title, description, type }  ← Pobranie z słownika
    ↓
toast.success(title, { description })  ← Sonner API
    ↓
Toaster Component (w Layout)  ← Wyświetlenie
```

### 2.3. Wzorce użycia

**Przed (obecny stan):**
```typescript
import { toast } from "sonner";

// W wielu miejscach duplikowany ten sam komunikat
toast.success("Zalogowano pomyślnie!");
toast.error("Błąd logowania", { description: "Nieprawidłowy email lub hasło" });
```

**Po (nowy system):**
```typescript
import { notify } from "@/lib/notifications";

// Komunikat z centralnego słownika
notify.success('AUTH.LOGIN_SUCCESS');
notify.error('AUTH.LOGIN_FAILED');

// Lub z custom message
notify.success({ title: "Custom title", description: "Custom desc" });
```

## 3. Szczegółowa specyfikacja komponentów

### 3.1. Types (`src/lib/notifications/types.ts`)

**Cel**: Zapewnienie silnego typowania dla całego systemu notyfikacji.

**Zawartość**:

```typescript
/**
 * Typy notyfikacji wspierane przez system
 * Mapują się bezpośrednio na Sonner toast types
 */
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

/**
 * Struktura pojedynczej wiadomości notyfikacji
 */
export interface NotificationMessage {
  /** Tytuł notyfikacji (wymagany) */
  title: string;
  /** Opcjonalny dodatkowy opis */
  description?: string;
  /** Typ notyfikacji (domyślnie: 'info') */
  type?: NotificationType;
}

/**
 * Opcje dla Sonner toast
 * Re-eksport z sonner dla spójności typów
 */
export type NotificationOptions = {
  /** Czas wyświetlania w ms (domyślnie: 4000) */
  duration?: number;
  /** Czy można zamknąć klikając (domyślnie: true) */
  dismissible?: boolean;
  /** Pozycja toasta */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  /** Custom ID dla toasta */
  id?: string | number;
  /** Callback po zamknięciu */
  onDismiss?: (toast: any) => void;
  /** Callback po auto-dismiss */
  onAutoClose?: (toast: any) => void;
};

/**
 * Klucze kategorii komunikatów
 * Każda kategoria odpowiada sekcji w aplikacji
 */
export type MessageCategory =
  | 'AUTH'           // Autentykacja (login, register, password reset)
  | 'GROUP'          // Grupy (CRUD operations)
  | 'PARTICIPANT'    // Uczestnicy (add, edit, delete)
  | 'EXCLUSION'      // Wykluczenia (add, delete)
  | 'DRAW'           // Losowanie (validate, execute)
  | 'WISHLIST'       // Listy życzeń (save, load)
  | 'CLIPBOARD'      // Operacje schowka (copy link)
  | 'GENERAL';       // Ogólne komunikaty

/**
 * Typ klucza wiadomości - budowany dynamicznie z kategorii
 * Przykład: 'AUTH.LOGIN_SUCCESS', 'GROUP.DELETE_SUCCESS'
 */
export type MessageKey = string;

/**
 * Słownik wszystkich komunikatów
 * Klucz w formacie CATEGORY.ACTION_STATUS
 */
export type NotificationMessages = Record<MessageKey, NotificationMessage>;

/**
 * Input dla funkcji notify - może być klucz lub custom message
 */
export type NotificationInput = MessageKey | NotificationMessage;

/**
 * Interfejs Notification Service
 */
export interface INotificationService {
  /** Wyświetl notyfikację sukcesu */
  success(input: NotificationInput, options?: NotificationOptions): void;

  /** Wyświetl notyfikację błędu */
  error(input: NotificationInput, options?: NotificationOptions): void;

  /** Wyświetl notyfikację informacyjną */
  info(input: NotificationInput, options?: NotificationOptions): void;

  /** Wyświetl notyfikację ostrzeżenia */
  warning(input: NotificationInput, options?: NotificationOptions): void;

  /** Uniwersalna metoda wyświetlania */
  show(type: NotificationType, input: NotificationInput, options?: NotificationOptions): void;

  /** Zamknij konkretną notyfikację po ID */
  dismiss(toastId?: string | number): void;

  /** Pobierz wiadomość ze słownika (dla testów/debugowania) */
  getMessage(key: MessageKey): NotificationMessage | undefined;
}
```

**Decyzje projektowe**:
- `NotificationType` - mapuje się bezpośrednio na Sonner API
- `NotificationMessage` - standardowa struktura dla wszystkich komunikatów
- `MessageKey` - typ string, ale zalecane używanie stałych z messages
- `NotificationInput` - union type pozwala na klucz LUB custom message
- `INotificationService` - interfejs dla łatwego mockowania w testach

### 3.2. Messages (`src/lib/notifications/messages.ts`)

**Cel**: Centralizacja wszystkich komunikatów aplikacji w jednym miejscu.

**Struktura**: Komunikaty pogrupowane po kategoriach (AUTH, GROUP, PARTICIPANT, etc.)

**Zawartość**:

```typescript
import type { NotificationMessages, NotificationType } from './types';

/**
 * Helper do tworzenia wiadomości z domyślnym typem
 */
const createMessage = (
  title: string,
  description?: string,
  type: NotificationType = 'info'
) => ({
  title,
  description,
  type
});

/**
 * Centralny słownik wszystkich komunikatów notyfikacji
 *
 * Konwencja nazewnictwa kluczy: CATEGORY.ACTION_STATUS
 * - CATEGORY: sekcja aplikacji (AUTH, GROUP, etc.)
 * - ACTION: wykonywana akcja (LOGIN, CREATE, DELETE, etc.)
 * - STATUS: wynik akcji (SUCCESS, ERROR, WARNING, INFO)
 *
 * Przykłady:
 * - AUTH.LOGIN_SUCCESS
 * - GROUP.CREATE_ERROR
 * - PARTICIPANT.DELETE_SUCCESS
 *
 * @example
 * // Użycie w kodzie
 * import { notify } from '@/lib/notifications';
 * notify.success('AUTH.LOGIN_SUCCESS');
 */
export const NOTIFICATION_MESSAGES: NotificationMessages = {
  // ============================================================================
  // AUTHENTICATION (Autentykacja)
  // ============================================================================

  'AUTH.LOGIN_SUCCESS': createMessage(
    'Zalogowano pomyślnie!',
    undefined,
    'success'
  ),

  'AUTH.LOGIN_ERROR': createMessage(
    'Błąd logowania',
    'Nieprawidłowy email lub hasło',
    'error'
  ),

  'AUTH.REGISTER_SUCCESS': createMessage(
    'Konto utworzone pomyślnie!',
    'Możesz teraz korzystać z aplikacji',
    'success'
  ),

  'AUTH.REGISTER_ERROR': createMessage(
    'Błąd rejestracji',
    'Nie udało się utworzyć konta',
    'error'
  ),

  'AUTH.LOGOUT_SUCCESS': createMessage(
    'Wylogowano pomyślnie',
    undefined,
    'success'
  ),

  'AUTH.LOGOUT_ERROR': createMessage(
    'Błąd podczas wylogowania',
    'Spróbuj ponownie',
    'error'
  ),

  'AUTH.PASSWORD_RESET_EMAIL_SENT': createMessage(
    'Email wysłany!',
    'Sprawdź swoją skrzynkę pocztową',
    'success'
  ),

  'AUTH.PASSWORD_RESET_ERROR': createMessage(
    'Błąd',
    'Nie udało się wysłać emaila',
    'error'
  ),

  'AUTH.PASSWORD_CHANGED_SUCCESS': createMessage(
    'Hasło zmienione pomyślnie!',
    undefined,
    'success'
  ),

  'AUTH.PASSWORD_CHANGE_ERROR': createMessage(
    'Błąd',
    'Nie udało się zmienić hasła',
    'error'
  ),

  'AUTH.TERMS_INFO': createMessage(
    'Regulamin będzie dostępny wkrótce',
    undefined,
    'info'
  ),

  'AUTH.PRIVACY_INFO': createMessage(
    'Polityka prywatności będzie dostępna wkrótce',
    undefined,
    'info'
  ),

  // ============================================================================
  // GROUP (Grupy)
  // ============================================================================

  'GROUP.CREATE_SUCCESS': createMessage(
    'Loteria została utworzona pomyślnie!',
    'Możesz teraz dodać uczestników',
    'success'
  ),

  'GROUP.CREATE_ERROR': createMessage(
    'Nie udało się utworzyć loterii',
    'Spróbuj ponownie',
    'error'
  ),

  'GROUP.UPDATE_SUCCESS': createMessage(
    'Grupa została zaktualizowana',
    undefined,
    'success'
  ),

  'GROUP.UPDATE_ERROR': createMessage(
    'Nie udało się zaktualizować grupy',
    undefined,
    'error'
  ),

  'GROUP.DELETE_SUCCESS': createMessage(
    'Grupa została usunięta',
    undefined,
    'success'
  ),

  'GROUP.DELETE_ERROR': createMessage(
    'Nie udało się usunąć grupy',
    undefined,
    'error'
  ),

  'GROUP.DELETE_ERROR_GENERAL': createMessage(
    'Wystąpił błąd podczas usuwania grupy',
    undefined,
    'error'
  ),

  // ============================================================================
  // PARTICIPANT (Uczestnicy)
  // ============================================================================

  'PARTICIPANT.ADD_SUCCESS': createMessage(
    'Uczestnik dodany.',
    undefined,
    'success'
  ),

  'PARTICIPANT.ADD_SUCCESS_WITH_LINK': createMessage(
    'Uczestnik dodany. Link dostępu skopiowany do schowka.',
    undefined,
    'success'
  ),

  'PARTICIPANT.ADD_SUCCESS_LINK_COPY_FAILED': createMessage(
    'Uczestnik dodany. Nie udało się skopiować linku.',
    undefined,
    'success'
  ),

  'PARTICIPANT.ADD_ERROR': createMessage(
    'Nie udało się dodać uczestnika. Spróbuj ponownie.',
    undefined,
    'error'
  ),

  'PARTICIPANT.UPDATE_SUCCESS': createMessage(
    'Uczestnik został zaktualizowany',
    undefined,
    'success'
  ),

  'PARTICIPANT.UPDATE_ERROR': createMessage(
    'Nie udało się zaktualizować uczestnika',
    undefined,
    'error'
  ),

  'PARTICIPANT.UPDATE_ERROR_GENERAL': createMessage(
    'Wystąpił błąd podczas aktualizacji uczestnika',
    undefined,
    'error'
  ),

  'PARTICIPANT.DELETE_SUCCESS': createMessage(
    'Uczestnik został usunięty',
    undefined,
    'success'
  ),

  'PARTICIPANT.DELETE_ERROR': createMessage(
    'Nie udało się usunąć uczestnika',
    undefined,
    'error'
  ),

  // ============================================================================
  // EXCLUSION (Wykluczenia)
  // ============================================================================

  'EXCLUSION.ADD_SUCCESS': createMessage(
    'Wykluczenie zostało dodane',
    undefined,
    'success'
  ),

  'EXCLUSION.ADD_BIDIRECTIONAL_SUCCESS': createMessage(
    'Dwustronne wykluczenie zostało dodane',
    undefined,
    'success'
  ),

  'EXCLUSION.ADD_ERROR': createMessage(
    'Nie udało się dodać wykluczenia. Spróbuj ponownie.',
    undefined,
    'error'
  ),

  'EXCLUSION.ADD_ERROR_GENERAL': createMessage(
    'Nie udało się dodać wykluczenia. Spróbuj ponownie.',
    undefined,
    'error'
  ),

  'EXCLUSION.ADD_DUPLICATE': createMessage(
    'Ta reguła wykluczenia już istnieje',
    undefined,
    'error'
  ),

  'EXCLUSION.ADD_REVERSE_EXISTS': createMessage(
    'Odwrotna reguła wykluczenia już istnieje',
    undefined,
    'error'
  ),

  'EXCLUSION.ADD_PARTIAL_SUCCESS': createMessage(
    'Pierwsze wykluczenie dodane, ale nie udało się dodać odwrotnego wykluczenia',
    undefined,
    'warning'
  ),

  'EXCLUSION.DELETE_SUCCESS': createMessage(
    'Wykluczenie zostało usunięte',
    undefined,
    'success'
  ),

  'EXCLUSION.DELETE_ERROR': createMessage(
    'Nie udało się usunąć wykluczenia',
    undefined,
    'error'
  ),

  // ============================================================================
  // DRAW (Losowanie)
  // ============================================================================

  'DRAW.EXECUTE_SUCCESS': createMessage(
    'Losowanie zostało pomyślnie wykonane!',
    'Uczestnicy mogą teraz sprawdzić swoje wyniki',
    'success'
  ),

  'DRAW.EXECUTE_ERROR': createMessage(
    'Nie udało się wykonać losowania',
    undefined,
    'error'
  ),

  'DRAW.EXECUTE_ERROR_GENERAL': createMessage(
    'Wystąpił błąd podczas wykonania losowania',
    undefined,
    'error'
  ),

  // ============================================================================
  // CLIPBOARD (Schowek)
  // ============================================================================

  'CLIPBOARD.COPY_SUCCESS': createMessage(
    'Link skopiowany do schowka',
    undefined,
    'success'
  ),

  'CLIPBOARD.COPY_ERROR': createMessage(
    'Nie udało się skopiować linku. Spróbuj ponownie.',
    undefined,
    'error'
  ),

  'CLIPBOARD.COPY_LINK_ERROR': createMessage(
    'Nie udało się skopiować linku',
    undefined,
    'error'
  ),

  // ============================================================================
  // WISHLIST (Listy życzeń)
  // ============================================================================

  'WISHLIST.SAVE_SUCCESS': createMessage(
    'Lista życzeń została zapisana',
    undefined,
    'success'
  ),

  'WISHLIST.SAVE_ERROR': createMessage(
    'Nie udało się zapisać listy życzeń',
    undefined,
    'error'
  ),

  // ============================================================================
  // GENERAL (Ogólne)
  // ============================================================================

  'GENERAL.NETWORK_ERROR': createMessage(
    'Błąd połączenia',
    'Sprawdź połączenie z internetem',
    'error'
  ),

  'GENERAL.UNKNOWN_ERROR': createMessage(
    'Wystąpił nieznany błąd',
    'Spróbuj ponownie',
    'error'
  ),

  'GENERAL.LOADING': createMessage(
    'Ładowanie...',
    undefined,
    'info'
  ),

  'GENERAL.SUCCESS': createMessage(
    'Operacja zakończona pomyślnie',
    undefined,
    'success'
  ),
} as const;

/**
 * Type helper - ekstrakcja kluczy jako union type dla lepszej sugestii IDE
 */
export type MessageKey = keyof typeof NOTIFICATION_MESSAGES;

/**
 * Helper do sprawdzania czy klucz istnieje w słowniku
 */
export const isValidMessageKey = (key: string): key is MessageKey => {
  return key in NOTIFICATION_MESSAGES;
};

/**
 * Helper do pobierania wiadomości ze słownika
 */
export const getMessage = (key: MessageKey) => {
  return NOTIFICATION_MESSAGES[key];
};
```

**Konwencje nazewnictwa**:
- Format klucza: `CATEGORY.ACTION_STATUS`
- CATEGORY: AUTH, GROUP, PARTICIPANT, EXCLUSION, DRAW, WISHLIST, CLIPBOARD, GENERAL
- ACTION: LOGIN, CREATE, UPDATE, DELETE, ADD, EXECUTE, SAVE, COPY
- STATUS: SUCCESS, ERROR, WARNING, INFO

**Decyzje projektowe**:
- `as const` - zapewnia immutability i dokładne typy literałów
- Helper `createMessage` - DRY, łatwiejsze tworzenie wiadomości
- Komentarze JSDoc - dokumentacja dla każdej kategorii
- Type `MessageKey` - autouzupełnianie w IDE

### 3.3. Notification Service (`src/lib/notifications/notificationService.ts`)

**Cel**: Wrapper nad Sonner API zapewniający wygodne metody do wyświetlania notyfikacji.

**Zawartość**:

```typescript
import { toast } from 'sonner';
import type {
  INotificationService,
  NotificationInput,
  NotificationMessage,
  NotificationOptions,
  NotificationType
} from './types';
import { NOTIFICATION_MESSAGES, isValidMessageKey, type MessageKey } from './messages';

/**
 * Notification Service - główny punkt dostępu do systemu notyfikacji
 *
 * Wrapper nad biblioteką Sonner zapewniający:
 * - Scentralizowane zarządzanie komunikatami
 * - Typowanie TypeScript
 * - Spójne API
 * - Łatwą migrację w przyszłości
 *
 * @example
 * // Użycie z kluczem z słownika
 * notify.success('AUTH.LOGIN_SUCCESS');
 *
 * @example
 * // Użycie z custom message
 * notify.error({ title: 'Custom error', description: 'Details...' });
 *
 * @example
 * // Z dodatkowymi opcjami
 * notify.info('GENERAL.LOADING', { duration: 2000 });
 */
class NotificationService implements INotificationService {
  /**
   * Przetwarza input i zwraca NotificationMessage
   * @private
   */
  private resolveMessage(input: NotificationInput): NotificationMessage {
    // Jeśli input to string, traktuj jako klucz ze słownika
    if (typeof input === 'string') {
      if (isValidMessageKey(input)) {
        return NOTIFICATION_MESSAGES[input];
      }

      // Fallback: jeśli klucz nie istnieje, zwróć jako tytuł
      console.warn(`[NotificationService] Unknown message key: "${input}". Using as title.`);
      return { title: input, type: 'info' };
    }

    // Jeśli input to obiekt NotificationMessage, użyj go bezpośrednio
    return input;
  }

  /**
   * Wywołuje odpowiednią metodę Sonner toast
   * @private
   */
  private displayToast(
    type: NotificationType,
    message: NotificationMessage,
    options?: NotificationOptions
  ): void {
    const { title, description } = message;
    const toastOptions = { description, ...options };

    switch (type) {
      case 'success':
        toast.success(title, toastOptions);
        break;
      case 'error':
        toast.error(title, toastOptions);
        break;
      case 'warning':
        toast.warning(title, toastOptions);
        break;
      case 'info':
        toast.info(title, toastOptions);
        break;
      default:
        // Fallback na toast (domyślny)
        toast(title, toastOptions);
    }
  }

  /**
   * Wyświetl notyfikację sukcesu
   */
  success(input: NotificationInput, options?: NotificationOptions): void {
    const message = this.resolveMessage(input);
    this.displayToast('success', message, options);
  }

  /**
   * Wyświetl notyfikację błędu
   */
  error(input: NotificationInput, options?: NotificationOptions): void {
    const message = this.resolveMessage(input);
    this.displayToast('error', message, options);
  }

  /**
   * Wyświetl notyfikację informacyjną
   */
  info(input: NotificationInput, options?: NotificationOptions): void {
    const message = this.resolveMessage(input);
    this.displayToast('info', message, options);
  }

  /**
   * Wyświetl notyfikację ostrzeżenia
   */
  warning(input: NotificationInput, options?: NotificationOptions): void {
    const message = this.resolveMessage(input);
    this.displayToast('warning', message, options);
  }

  /**
   * Uniwersalna metoda wyświetlania notyfikacji
   */
  show(
    type: NotificationType,
    input: NotificationInput,
    options?: NotificationOptions
  ): void {
    const message = this.resolveMessage(input);
    this.displayToast(type, message, options);
  }

  /**
   * Zamknij konkretną notyfikację po ID
   * Jeśli nie podano ID, zamyka wszystkie notyfikacje
   */
  dismiss(toastId?: string | number): void {
    if (toastId !== undefined) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }

  /**
   * Pobierz wiadomość ze słownika (przydatne dla testów/debugowania)
   */
  getMessage(key: MessageKey): NotificationMessage | undefined {
    return isValidMessageKey(key) ? NOTIFICATION_MESSAGES[key] : undefined;
  }
}

/**
 * Singleton instance notification service
 * Eksportowany jako główny punkt dostępu
 */
export const notify = new NotificationService();

/**
 * Dla zaawansowanych przypadków - eksport klasy
 */
export { NotificationService };
```

**Decyzje projektowe**:
- **Singleton pattern** - jedna instancja `notify` dla całej aplikacji
- **Private methods** - `resolveMessage` i `displayToast` ukryte
- **Fallback handling** - jeśli klucz nie istnieje, używa go jako tytuł
- **Console warnings** - debug info dla developerów
- **Type safety** - wszystkie metody typowane
- **Flexibility** - wspiera zarówno klucze jak i custom messages

### 3.4. Public API (`src/lib/notifications/index.ts`)

**Cel**: Centralizacja eksportów dla wygodnego importu przez konsumentów.

**Zawartość**:

```typescript
/**
 * Public API for Notification System
 *
 * @example
 * import { notify } from '@/lib/notifications';
 * notify.success('AUTH.LOGIN_SUCCESS');
 *
 * @example
 * import { notify, NOTIFICATION_MESSAGES } from '@/lib/notifications';
 * const loginSuccess = NOTIFICATION_MESSAGES['AUTH.LOGIN_SUCCESS'];
 * notify.show('success', loginSuccess);
 */

// Główny service (najpopularniejszy export)
export { notify, NotificationService } from './notificationService';

// Słownik komunikatów
export { NOTIFICATION_MESSAGES, getMessage, isValidMessageKey } from './messages';
export type { MessageKey } from './messages';

// Typy
export type {
  NotificationType,
  NotificationMessage,
  NotificationOptions,
  NotificationInput,
  INotificationService,
  MessageCategory,
  NotificationMessages,
} from './types';
```

**Decyzje projektowe**:
- Re-exporty z pomodułów
- JSDoc przykłady użycia
- Type exports dla TypeScript consumers

### 3.5. Dokumentacja (`src/lib/notifications/README.md`)

**Cel**: Dokumentacja dla zespołu - jak używać systemu notyfikacji.

**Zawartość**:

```markdown
# System notyfikacji Secret Santa

Scentralizowany, typowany system zarządzania notyfikacjami oparty na bibliotece [Sonner](https://sonner.emilkowal.ski/).

## Szybki start

### Podstawowe użycie

```typescript
import { notify } from '@/lib/notifications';

// Notyfikacja sukcesu z kluczem ze słownika
notify.success('AUTH.LOGIN_SUCCESS');

// Notyfikacja błędu
notify.error('GROUP.DELETE_ERROR');

// Notyfikacja info
notify.info('GENERAL.LOADING');

// Notyfikacja ostrzeżenia
notify.warning('EXCLUSION.ADD_PARTIAL_SUCCESS');
```

### Custom messages

Jeśli potrzebujesz wyświetlić niestandardowy komunikat (np. z API):

```typescript
notify.error({
  title: 'Błąd API',
  description: apiError.message
});
```

### Dodatkowe opcje

```typescript
// Dłuższy czas wyświetlania
notify.success('AUTH.LOGIN_SUCCESS', { duration: 5000 });

// Własna pozycja
notify.info('GENERAL.LOADING', { position: 'top-center' });

// Z callbackiem
notify.success('GROUP.CREATE_SUCCESS', {
  onDismiss: () => console.log('Toast dismissed')
});
```

### Zamykanie notyfikacji

```typescript
// Zamknij konkretną notyfikację
const toastId = toast.loading('Processing...');
// ... po zakończeniu
notify.dismiss(toastId);

// Zamknij wszystkie notyfikacje
notify.dismiss();
```

## Dostępne klucze komunikatów

### AUTH (Autentykacja)

- `AUTH.LOGIN_SUCCESS` - Pomyślne logowanie
- `AUTH.LOGIN_ERROR` - Błąd logowania
- `AUTH.REGISTER_SUCCESS` - Pomyślna rejestracja
- `AUTH.REGISTER_ERROR` - Błąd rejestracji
- `AUTH.LOGOUT_SUCCESS` - Pomyślne wylogowanie
- `AUTH.LOGOUT_ERROR` - Błąd wylogowania
- `AUTH.PASSWORD_RESET_EMAIL_SENT` - Email resetujący wysłany
- `AUTH.PASSWORD_RESET_ERROR` - Błąd resetowania hasła
- `AUTH.PASSWORD_CHANGED_SUCCESS` - Hasło zmienione
- `AUTH.PASSWORD_CHANGE_ERROR` - Błąd zmiany hasła
- `AUTH.TERMS_INFO` - Info o regulaminie
- `AUTH.PRIVACY_INFO` - Info o polityce prywatności

### GROUP (Grupy)

- `GROUP.CREATE_SUCCESS` - Grupa utworzona
- `GROUP.CREATE_ERROR` - Błąd tworzenia grupy
- `GROUP.UPDATE_SUCCESS` - Grupa zaktualizowana
- `GROUP.UPDATE_ERROR` - Błąd aktualizacji grupy
- `GROUP.DELETE_SUCCESS` - Grupa usunięta
- `GROUP.DELETE_ERROR` - Błąd usuwania grupy
- `GROUP.DELETE_ERROR_GENERAL` - Ogólny błąd usuwania

### PARTICIPANT (Uczestnicy)

- `PARTICIPANT.ADD_SUCCESS` - Uczestnik dodany
- `PARTICIPANT.ADD_SUCCESS_WITH_LINK` - Uczestnik dodany + link skopiowany
- `PARTICIPANT.ADD_SUCCESS_LINK_COPY_FAILED` - Dodany, ale link nie skopiowany
- `PARTICIPANT.ADD_ERROR` - Błąd dodawania uczestnika
- `PARTICIPANT.UPDATE_SUCCESS` - Uczestnik zaktualizowany
- `PARTICIPANT.UPDATE_ERROR` - Błąd aktualizacji uczestnika
- `PARTICIPANT.UPDATE_ERROR_GENERAL` - Ogólny błąd aktualizacji
- `PARTICIPANT.DELETE_SUCCESS` - Uczestnik usunięty
- `PARTICIPANT.DELETE_ERROR` - Błąd usuwania uczestnika

### EXCLUSION (Wykluczenia)

- `EXCLUSION.ADD_SUCCESS` - Wykluczenie dodane
- `EXCLUSION.ADD_BIDIRECTIONAL_SUCCESS` - Dwustronne wykluczenie dodane
- `EXCLUSION.ADD_ERROR` - Błąd dodawania wykluczenia
- `EXCLUSION.ADD_ERROR_GENERAL` - Ogólny błąd dodawania
- `EXCLUSION.ADD_DUPLICATE` - Reguła już istnieje
- `EXCLUSION.ADD_REVERSE_EXISTS` - Odwrotna reguła już istnieje
- `EXCLUSION.ADD_PARTIAL_SUCCESS` - Częściowy sukces (jedno dodane)
- `EXCLUSION.DELETE_SUCCESS` - Wykluczenie usunięte
- `EXCLUSION.DELETE_ERROR` - Błąd usuwania wykluczenia

### DRAW (Losowanie)

- `DRAW.EXECUTE_SUCCESS` - Losowanie wykonane pomyślnie
- `DRAW.EXECUTE_ERROR` - Błąd wykonania losowania
- `DRAW.EXECUTE_ERROR_GENERAL` - Ogólny błąd losowania

### CLIPBOARD (Schowek)

- `CLIPBOARD.COPY_SUCCESS` - Link skopiowany
- `CLIPBOARD.COPY_ERROR` - Błąd kopiowania linku
- `CLIPBOARD.COPY_LINK_ERROR` - Nie udało się skopiować linku

### WISHLIST (Listy życzeń)

- `WISHLIST.SAVE_SUCCESS` - Lista zapisana
- `WISHLIST.SAVE_ERROR` - Błąd zapisu listy

### GENERAL (Ogólne)

- `GENERAL.NETWORK_ERROR` - Błąd połączenia
- `GENERAL.UNKNOWN_ERROR` - Nieznany błąd
- `GENERAL.LOADING` - Ładowanie
- `GENERAL.SUCCESS` - Operacja zakończona pomyślnie

## Dodawanie nowych komunikatów

1. Otwórz `src/lib/notifications/messages.ts`
2. Dodaj nowy klucz w odpowiedniej kategorii:

```typescript
'CATEGORY.ACTION_STATUS': createMessage(
  'Tytuł notyfikacji',
  'Opcjonalny opis',
  'success' // typ: success | error | info | warning
),
```

3. Typ `MessageKey` zaktualizuje się automatycznie
4. Użyj nowego klucza w kodzie:

```typescript
notify.success('CATEGORY.ACTION_STATUS');
```

## Testowanie

```typescript
import { notify } from '@/lib/notifications';
import { vi } from 'vitest';

// Mockowanie dla testów
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  }
}));

// Test
it('should display success notification', () => {
  notify.success('AUTH.LOGIN_SUCCESS');
  expect(toast.success).toHaveBeenCalledWith(
    'Zalogowano pomyślnie!',
    expect.any(Object)
  );
});
```

## Architektura

```
notify.success('AUTH.LOGIN_SUCCESS')
    ↓
NotificationService.success()
    ↓
resolveMessage() → NOTIFICATION_MESSAGES['AUTH.LOGIN_SUCCESS']
    ↓
displayToast() → toast.success(title, { description })
    ↓
Toaster (w Layout.astro)
    ↓
Wyświetlenie użytkownikowi
```

## Best Practices

### ✅ Dobre

```typescript
// Używaj kluczy ze słownika
notify.success('AUTH.LOGIN_SUCCESS');

// Używaj custom messages dla błędów API
notify.error({
  title: 'Błąd API',
  description: error.message
});

// Grupuj logikę notyfikacji
const handleDelete = async () => {
  try {
    await deleteGroup(id);
    notify.success('GROUP.DELETE_SUCCESS');
  } catch (error) {
    notify.error('GROUP.DELETE_ERROR');
  }
};
```

### ❌ Złe

```typescript
// NIE importuj bezpośrednio z sonner
import { toast } from 'sonner'; // ❌
toast.success('Sukces!'); // ❌

// NIE duplikuj komunikatów
notify.success({ title: 'Zalogowano pomyślnie!' }); // ❌ Użyj klucza!

// NIE używaj long descriptions
notify.success({
  title: 'Sukces',
  description: 'Bardzo długi opis który...' // ❌ Trzymaj się zwięzłości
});
```

## Migracja z poprzedniego systemu

### Przed

```typescript
import { toast } from 'sonner';
toast.success('Zalogowano pomyślnie!');
toast.error('Błąd logowania', { description: 'Nieprawidłowy email lub hasło' });
```

### Po

```typescript
import { notify } from '@/lib/notifications';
notify.success('AUTH.LOGIN_SUCCESS');
notify.error('AUTH.LOGIN_ERROR');
```

## Wsparcie dla i18n (przyszłość)

System jest przygotowany do łatwej integracji z biblioteką i18n:

```typescript
// Przyszła implementacja
const getMessage = (key: MessageKey, locale: string) => {
  return NOTIFICATION_MESSAGES[locale][key];
};
```
```

## 4. Plan refaktoryzacji istniejącego kodu

### 4.1. Pliki do refaktoryzacji (19)

#### AUTH (6 plików)

1. **`src/components/auth/LoginForm.tsx`**
   - Linie: 6, 48, 50, 52, 79, 84, 89
   - Zamiana: 7 wywołań `toast.*` → `notify.*`

2. **`src/components/auth/RegisterForm.tsx`**
   - Linie: 139, 147
   - Zamiana: 2 wywołania `toast.info` → `notify.info`

3. **`src/components/auth/ForgotPasswordForm.tsx`**
   - Zamiana: wywołania toast → notify

4. **`src/components/auth/LogoutButton.tsx`**
   - Linie: 25, 29
   - Zamiana: 2 wywołania toast → notify

5. **`src/hooks/useRegister.ts`**
   - Linie: 36, 41, 46
   - Zamiana: 3 wywołania toast → notify

6. **`src/hooks/useForgotPassword.ts`**
   - Linie: 56, 62, 69
   - Zamiana: 3 wywołania toast → notify

#### GROUP (8 plików)

7. **`src/components/group/GroupEditModal.tsx`**
   - Linie: 91, 95
   - Zamiana: 2 wywołania toast → notify

8. **`src/components/group/DeleteGroupModal.tsx`**
   - Linie: 29, 32, 35
   - Zamiana: 3 wywołania toast → notify

9. **`src/components/group/DrawConfirmationModal.tsx`**
   - Linie: 42, 46, 50
   - Zamiana: 3 wywołania toast → notify

10. **`src/components/forms/CreateGroupForm.tsx`**
    - Linie: 35, 44
    - Zamiana: 2 wywołania toast → notify

11. **`src/hooks/useGroupData.ts`**
    - Linia: 42
    - Zamiana: 1 wywołanie toast → notify

12. **`src/hooks/useGroupViewHandlers.ts`**
    - Linie: 93, 104, 107, 134
    - Zamiana: 4 wywołania toast → notify

13. **`src/components/group/ParticipantsList.tsx`**
    - Linie: 35, 38
    - Zamiana: 2 wywołania toast → notify

14. **`src/components/group/ParticipantCard.tsx`**
    - Linie: 48, 51
    - Zamiana: 2 wywołania toast → notify

#### PARTICIPANT (3 pliki)

15. **`src/components/group/AddParticipantForm.tsx`**
    - Linie: 54, 56, 60, 66, 69
    - Zamiana: 5 wywołań toast → notify

16. **`src/components/group/EditParticipantModal.tsx`**
    - Linie: 75, 79, 83
    - Zamiana: 3 wywołania toast → notify

#### EXCLUSION (2 pliki)

17. **`src/components/group/AddExclusionForm.tsx`**
    - Linie: 73, 79, 103, 109, 111, 114
    - Zamiana: 6 wywołań toast → notify

#### RESET PASSWORD (1 plik)

18. **`src/hooks/useResetPassword.ts`**
    - Linie: 43, 48
    - Zamiana: 2 wywołania toast → notify

#### UI (1 plik - bez zmian)

19. **`src/components/ui/sonner.tsx`**
    - Bez zmian - eksportuje komponent Toaster

### 4.2. Wzorce refaktoryzacji

#### Wzorzec 1: Prosty sukces/błąd

**Przed:**
```typescript
import { toast } from "sonner";

toast.success("Zalogowano pomyślnie!");
```

**Po:**
```typescript
import { notify } from "@/lib/notifications";

notify.success('AUTH.LOGIN_SUCCESS');
```

#### Wzorzec 2: Błąd z opisem

**Przed:**
```typescript
toast.error("Błąd logowania", {
  description: "Nieprawidłowy email lub hasło"
});
```

**Po:**
```typescript
notify.error('AUTH.LOGIN_ERROR');
```

#### Wzorzec 3: Custom błąd z API

**Przed:**
```typescript
const errorMessage = result.error?.message || "Wystąpił błąd";
toast.error("Błąd", { description: errorMessage });
```

**Po:**
```typescript
// Jeśli message jest z API
notify.error({
  title: 'Błąd',
  description: result.error?.message || 'Wystąpił błąd'
});

// LUB jeśli mamy klucz w słowniku
notify.error('GROUP.DELETE_ERROR');
```

#### Wzorzec 4: Warunkowa notyfikacja

**Przed:**
```typescript
if (participant.access_token) {
  try {
    await navigator.clipboard.writeText(link);
    toast.success("Uczestnik dodany. Link dostępu skopiowany do schowka.");
  } catch {
    toast.success("Uczestnik dodany. Nie udało się skopiować linku.");
  }
} else {
  toast.success("Uczestnik dodany.");
}
```

**Po:**
```typescript
if (participant.access_token) {
  try {
    await navigator.clipboard.writeText(link);
    notify.success('PARTICIPANT.ADD_SUCCESS_WITH_LINK');
  } catch {
    notify.success('PARTICIPANT.ADD_SUCCESS_LINK_COPY_FAILED');
  }
} else {
  notify.success('PARTICIPANT.ADD_SUCCESS');
}
```

#### Wzorzec 5: Info/Warning

**Przed:**
```typescript
toast.info("Regulamin będzie dostępny wkrótce");
toast.warning("Pierwsze wykluczenie dodane, ale nie udało się dodać odwrotnego");
```

**Po:**
```typescript
notify.info('AUTH.TERMS_INFO');
notify.warning('EXCLUSION.ADD_PARTIAL_SUCCESS');
```

### 4.3. Checkl lista refaktoryzacji

Dla każdego pliku:

- [ ] Zamień import: `import { toast } from "sonner"` → `import { notify } from "@/lib/notifications"`
- [ ] Znajdź wszystkie wywołania `toast.success()` → zamień na `notify.success()` z kluczem
- [ ] Znajdź wszystkie wywołania `toast.error()` → zamień na `notify.error()` z kluczem
- [ ] Znajdź wszystkie wywołania `toast.info()` → zamień na `notify.info()` z kluczem
- [ ] Znajdź wszystkie wywołania `toast.warning()` → zamień na `notify.warning()` z kluczem
- [ ] Sprawdź czy wszystkie komunikaty mają odpowiedniki w słowniku
- [ ] Jeśli nie, dodaj nowe klucze do `messages.ts`
- [ ] Uruchom testy - sprawdź czy nic się nie zepsuło
- [ ] Sprawdź ręcznie działanie notyfikacji w przeglądarce

### 4.4. Kolejność refaktoryzacji (zalecana)

1. **Faza 1: Utworzenie systemu** (1-2h)
   - Utworzenie plików: types.ts, messages.ts, notificationService.ts, index.ts
   - Utworzenie README.md
   - Utworzenie testów

2. **Faza 2: Refaktoryzacja AUTH** (1h)
   - 6 plików auth
   - Najprostsze - dobrze do przetestowania systemu

3. **Faza 3: Refaktoryzacja GROUP** (1-2h)
   - 8 plików group
   - Więcej różnorodnych przypadków

4. **Faza 4: Refaktoryzacja PARTICIPANT i EXCLUSION** (1h)
   - 5 plików
   - Bardziej złożone scenariusze

5. **Faza 5: Testy i dokumentacja** (1h)
   - Testy E2E z nowym systemem
   - Aktualizacja dokumentacji
   - Code review

**Całkowity czas: 5-7 godzin**

## 5. Testy

### 5.1. Testy jednostkowe

**Plik**: `src/__tests__/notifications/notificationService.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notify } from '@/lib/notifications';
import { toast } from 'sonner';

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  }
}));

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success()', () => {
    it('should display success notification with message key', () => {
      notify.success('AUTH.LOGIN_SUCCESS');

      expect(toast.success).toHaveBeenCalledWith(
        'Zalogowano pomyślnie!',
        expect.objectContaining({ description: undefined })
      );
    });

    it('should display success notification with custom message', () => {
      notify.success({ title: 'Custom', description: 'Desc' });

      expect(toast.success).toHaveBeenCalledWith(
        'Custom',
        expect.objectContaining({ description: 'Desc' })
      );
    });

    it('should pass options to toast', () => {
      notify.success('AUTH.LOGIN_SUCCESS', { duration: 5000 });

      expect(toast.success).toHaveBeenCalledWith(
        'Zalogowano pomyślnie!',
        expect.objectContaining({ duration: 5000 })
      );
    });
  });

  describe('error()', () => {
    it('should display error notification with message key', () => {
      notify.error('AUTH.LOGIN_ERROR');

      expect(toast.error).toHaveBeenCalledWith(
        'Błąd logowania',
        expect.objectContaining({
          description: 'Nieprawidłowy email lub hasło'
        })
      );
    });

    it('should display error notification with custom message', () => {
      notify.error({ title: 'API Error', description: 'Details' });

      expect(toast.error).toHaveBeenCalledWith(
        'API Error',
        expect.objectContaining({ description: 'Details' })
      );
    });
  });

  describe('info()', () => {
    it('should display info notification', () => {
      notify.info('AUTH.TERMS_INFO');

      expect(toast.info).toHaveBeenCalled();
    });
  });

  describe('warning()', () => {
    it('should display warning notification', () => {
      notify.warning('EXCLUSION.ADD_PARTIAL_SUCCESS');

      expect(toast.warning).toHaveBeenCalled();
    });
  });

  describe('show()', () => {
    it('should display notification with specified type', () => {
      notify.show('success', 'AUTH.LOGIN_SUCCESS');

      expect(toast.success).toHaveBeenCalled();
    });
  });

  describe('dismiss()', () => {
    it('should dismiss specific toast by ID', () => {
      notify.dismiss('toast-id');

      expect(toast.dismiss).toHaveBeenCalledWith('toast-id');
    });

    it('should dismiss all toasts when no ID provided', () => {
      notify.dismiss();

      expect(toast.dismiss).toHaveBeenCalledWith();
    });
  });

  describe('getMessage()', () => {
    it('should return message for valid key', () => {
      const message = notify.getMessage('AUTH.LOGIN_SUCCESS');

      expect(message).toEqual({
        title: 'Zalogowano pomyślnie!',
        description: undefined,
        type: 'success'
      });
    });

    it('should return undefined for invalid key', () => {
      const message = notify.getMessage('INVALID.KEY' as any);

      expect(message).toBeUndefined();
    });
  });

  describe('Unknown message key handling', () => {
    it('should use unknown key as title with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      notify.success('UNKNOWN.KEY');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown message key')
      );
      expect(toast.success).toHaveBeenCalledWith(
        'UNKNOWN.KEY',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });
});
```

**Plik**: `src/__tests__/notifications/messages.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  NOTIFICATION_MESSAGES,
  isValidMessageKey,
  getMessage
} from '@/lib/notifications';

describe('Notification Messages', () => {
  describe('NOTIFICATION_MESSAGES', () => {
    it('should contain AUTH messages', () => {
      expect(NOTIFICATION_MESSAGES['AUTH.LOGIN_SUCCESS']).toBeDefined();
      expect(NOTIFICATION_MESSAGES['AUTH.LOGIN_ERROR']).toBeDefined();
    });

    it('should contain GROUP messages', () => {
      expect(NOTIFICATION_MESSAGES['GROUP.CREATE_SUCCESS']).toBeDefined();
      expect(NOTIFICATION_MESSAGES['GROUP.DELETE_ERROR']).toBeDefined();
    });

    it('should have consistent structure', () => {
      Object.values(NOTIFICATION_MESSAGES).forEach(message => {
        expect(message).toHaveProperty('title');
        expect(message).toHaveProperty('type');
        expect(typeof message.title).toBe('string');
        expect(['success', 'error', 'info', 'warning']).toContain(message.type);
      });
    });
  });

  describe('isValidMessageKey()', () => {
    it('should return true for valid keys', () => {
      expect(isValidMessageKey('AUTH.LOGIN_SUCCESS')).toBe(true);
      expect(isValidMessageKey('GROUP.CREATE_SUCCESS')).toBe(true);
    });

    it('should return false for invalid keys', () => {
      expect(isValidMessageKey('INVALID.KEY')).toBe(false);
      expect(isValidMessageKey('AUTH.NONEXISTENT')).toBe(false);
    });
  });

  describe('getMessage()', () => {
    it('should return message for valid key', () => {
      const message = getMessage('AUTH.LOGIN_SUCCESS');

      expect(message).toEqual({
        title: 'Zalogowano pomyślnie!',
        description: undefined,
        type: 'success'
      });
    });

    it('should return correct message with description', () => {
      const message = getMessage('AUTH.LOGIN_ERROR');

      expect(message.description).toBe('Nieprawidłowy email lub hasło');
    });
  });
});
```

### 5.2. Testy integracyjne

**Przykład**: Test formularza logowania z nowym systemem

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from '@/components/auth/LoginForm';
import { notify } from '@/lib/notifications';

vi.mock('@/lib/notifications', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('LoginForm with notification system', () => {
  it('should show success notification on successful login', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/hasło/i), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /zaloguj/i }));

    await waitFor(() => {
      expect(notify.success).toHaveBeenCalledWith('AUTH.LOGIN_SUCCESS');
    });
  });

  it('should show error notification on failed login', async () => {
    // Mock failed API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: { message: 'Nieprawidłowy email lub hasło' }
      })
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'wrong@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/hasło/i), {
      target: { value: 'wrongpass' }
    });
    fireEvent.click(screen.getByRole('button', { name: /zaloguj/i }));

    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith('AUTH.LOGIN_ERROR');
    });
  });
});
```

### 5.3. Testy E2E

**Przykład**: Playwright test z notyfikacjami

```typescript
import { test, expect } from '@playwright/test';

test.describe('Notification System E2E', () => {
  test('should display success notification on login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Czekaj na pojawienie się toasta
    await expect(page.locator('.toaster')).toBeVisible();
    await expect(page.locator('.toaster')).toContainText('Zalogowano pomyślnie!');
  });

  test('should display error notification on failed login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    await expect(page.locator('.toaster')).toBeVisible();
    await expect(page.locator('.toaster')).toContainText('Błąd logowania');
  });

  test('should auto-dismiss notification after duration', async ({ page }) => {
    await page.goto('/login');

    // Trigger notification
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Toast should appear
    await expect(page.locator('.toaster')).toBeVisible();

    // Wait for auto-dismiss (default 4s)
    await page.waitForTimeout(5000);

    // Toast should be gone
    await expect(page.locator('.toaster')).not.toBeVisible();
  });
});
```

## 6. Metryki sukcesu

### 6.1. Metryki techniczne

**Przed refaktoryzacją:**
- ❌ 19 plików z duplikacją komunikatów
- ❌ Brak centralizacji
- ❌ Brak typowania dla notyfikacji
- ❌ Trudność w utrzymaniu

**Po refaktoryzacji:**
- ✅ 1 źródło prawdy (messages.ts)
- ✅ 100% typowanie TypeScript
- ✅ 19 plików zrefaktoryzowanych
- ✅ Łatwe dodawanie nowych komunikatów

### 6.2. Metryki jakości kodu

- **DRY (Don't Repeat Yourself)**: ✅ Komunikaty w jednym miejscu
- **SOLID**: ✅ Single Responsibility (jeden service do notyfikacji)
- **Type Safety**: ✅ Silne typowanie we wszystkich warstwach
- **Testability**: ✅ Łatwe mockowanie i testowanie
- **Documentation**: ✅ README i JSDoc

### 6.3. Developer Experience (DX)

- ✅ **Autouzupełnianie**: IDE suggeruje klucze komunikatów
- ✅ **Type safety**: Błędy kompilacji przy nieprawidłowych kluczach
- ✅ **Consistency**: Jednolite API w całej aplikacji
- ✅ **Ease of use**: `notify.success('KEY')` zamiast długiego wywołania
- ✅ **Maintainability**: Zmiana komunikatu w jednym miejscu

### 6.4. User Experience (UX)

- ✅ **Consistency**: Spójne komunikaty w całej aplikacji
- ✅ **Clarity**: Jasne i zwięzłe komunikaty
- ✅ **Feedback**: Natychmiastowa informacja zwrotna dla użytkownika
- ✅ **Polish localization**: Wszystkie komunikaty po polsku

### 6.5. Kryteria akceptacji

**System można uznać za gotowy gdy:**

1. ✅ Wszystkie 5 plików systemu notyfikacji są utworzone
2. ✅ Wszystkie 19 plików są zrefaktoryzowane
3. ✅ Import `toast` z sonner nie występuje nigdzie poza `notificationService.ts` i `sonner.tsx`
4. ✅ Wszystkie testy jednostkowe przechodzą
5. ✅ Aplikacja działa bez błędów TypeScript
6. ✅ Notyfikacje działają poprawnie w przeglądarce
7. ✅ README.md jest kompletny i aktualny
8. ✅ Dokumentacja dla zespołu jest dostępna

## 7. Best practices i guidelines

### 7.1. Konwencje nazewnictwa

**Klucze komunikatów:**
```
CATEGORY.ACTION_STATUS

Gdzie:
- CATEGORY: AUTH | GROUP | PARTICIPANT | EXCLUSION | DRAW | WISHLIST | CLIPBOARD | GENERAL
- ACTION: LOGIN | CREATE | UPDATE | DELETE | ADD | EXECUTE | SAVE | COPY | itp.
- STATUS: SUCCESS | ERROR | WARNING | INFO
```

**Przykłady:**
- `AUTH.LOGIN_SUCCESS` ✅
- `GROUP.CREATE_ERROR` ✅
- `PARTICIPANT.DELETE_SUCCESS` ✅
- `loginSuccess` ❌ (brak kategorii i statusu)
- `auth_login` ❌ (snake_case zamiast PascalCase)

### 7.2. Kiedy używać klucza vs custom message

**Używaj klucza ze słownika:**
- ✅ Komunikat jest stały i powtarzalny
- ✅ Komunikat występuje w wielu miejscach
- ✅ Komunikat jest częścią standardowego przepływu

**Używaj custom message:**
- ✅ Komunikat pochodzi z API (błędy dynamiczne)
- ✅ Komunikat jest unikalny dla konkretnego przypadku
- ✅ Komunikat zawiera dane dynamiczne (np. liczby, nazwy)

**Przykłady:**

```typescript
// DOBRZE - stały komunikat
notify.success('AUTH.LOGIN_SUCCESS');

// DOBRZE - błąd z API
notify.error({
  title: 'Błąd API',
  description: apiError.message
});

// DOBRZE - komunikat z dynamicznymi danymi
notify.success({
  title: 'Grupa utworzona',
  description: `Grupa "${groupName}" została pomyślnie utworzona`
});

// ŹLE - duplikowanie komunikatu który już jest w słowniku
notify.success({ title: 'Zalogowano pomyślnie!' }); // ❌
// Zamiast tego:
notify.success('AUTH.LOGIN_SUCCESS'); // ✅
```

### 7.3. Obsługa błędów

**Pattern**: Try-catch z fallback notification

```typescript
const handleAction = async () => {
  try {
    const result = await apiCall();

    if (result.success) {
      notify.success('ACTION.SUCCESS');
    } else {
      // Błąd z API - użyj custom message
      notify.error({
        title: 'Błąd',
        description: result.error || 'Nieznany błąd'
      });
    }
  } catch (error) {
    // Błąd sieci - użyj klucza
    notify.error('GENERAL.NETWORK_ERROR');
  }
};
```

### 7.4. Długość komunikatów

**Title:**
- Maksymalnie 50 znaków
- Zwięzły i na temat
- Bez kropki na końcu (chyba że zdanie składowe)

**Description:**
- Maksymalnie 150 znaków
- Opcjonalny - dodaj tylko gdy potrzebne
- Zawiera dodatkowe szczegóły

**Przykłady:**

```typescript
// DOBRZE
{
  title: 'Zalogowano pomyślnie',
  description: undefined
}

// DOBRZE
{
  title: 'Błąd logowania',
  description: 'Nieprawidłowy email lub hasło'
}

// ŹLE - title za długi
{
  title: 'Operacja zakończyła się sukcesem i możesz teraz kontynuować',
  description: '...'
}

// ŹLE - description za długi
{
  title: 'Błąd',
  description: 'Wystąpił bardzo szczegółowy błąd podczas przetwarzania żądania, który spowodował...'
}
```

### 7.5. Testowanie

**Każda zmiana w systemie notyfikacji powinna:**
1. ✅ Przejść testy jednostkowe
2. ✅ Przejść testy integracyjne (jeśli dotyczą)
3. ✅ Być przetestowana ręcznie w przeglądarce
4. ✅ Nie powodować błędów TypeScript

**Pattern testowania:**

```typescript
// Mock notify w testach
vi.mock('@/lib/notifications', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }
}));

// Sprawdzanie wywołań
expect(notify.success).toHaveBeenCalledWith('AUTH.LOGIN_SUCCESS');
expect(notify.success).toHaveBeenCalledTimes(1);
```

## 8. FAQ i rozwiązywanie problemów

### Q: Czy mogę nadal używać bezpośrednio `toast` z sonner?

**A:** NIE. Cały kod powinien używać `notify` z `@/lib/notifications`. Jedyny wyjątek to `notificationService.ts` (implementacja) i `sonner.tsx` (komponent Toaster).

### Q: Co jeśli potrzebuję wyświetlić komunikat który nie jest w słowniku?

**A:** Użyj custom message:
```typescript
notify.success({
  title: 'Custom title',
  description: 'Custom description'
});
```

Jeśli komunikat będzie używany częściej, dodaj go do słownika.

### Q: Jak dodać nowy komunikat do słownika?

**A:**
1. Otwórz `src/lib/notifications/messages.ts`
2. Dodaj nowy klucz w odpowiedniej kategorii:
```typescript
'CATEGORY.ACTION_STATUS': createMessage(
  'Tytuł',
  'Opcjonalny opis',
  'success'
),
```
3. Zapisz plik - TypeScript automatycznie zaktualizuje typy
4. Użyj w kodzie: `notify.success('CATEGORY.ACTION_STATUS')`

### Q: Jak zmienić istniejący komunikat?

**A:**
1. Znajdź klucz w `messages.ts`
2. Zmień title i/lub description
3. Zapisz - zmiany są globalne, wszędzie gdzie używany jest ten klucz

### Q: Jak wyświetlić notyfikację z dłuższym czasem?

**A:** Użyj options:
```typescript
notify.success('AUTH.LOGIN_SUCCESS', { duration: 10000 });
```

### Q: Czy mogę wyświetlić notyfikację bez auto-dismiss?

**A:** Tak:
```typescript
notify.error('CRITICAL_ERROR', { duration: Infinity });
```

### Q: Jak zamknąć notyfikację programatically?

**A:**
```typescript
// Zapisz ID
const toastId = toast.loading('Processing...');

// Zamknij konkretną
notify.dismiss(toastId);

// Lub zamknij wszystkie
notify.dismiss();
```

### Q: Czy system wspiera i18n?

**A:** Aktualnie nie, ale jest przygotowany. W przyszłości można dodać:
```typescript
// Przyszła implementacja
const MESSAGES_PL = { /* ... */ };
const MESSAGES_EN = { /* ... */ };

const getMessage = (key: MessageKey, locale: 'pl' | 'en' = 'pl') => {
  const messages = locale === 'pl' ? MESSAGES_PL : MESSAGES_EN;
  return messages[key];
};
```

## 9. Checklist implementacji

### Faza 1: Utworzenie systemu ⏱️ 1-2h

- [ ] Utworzenie `src/lib/notifications/types.ts`
- [ ] Utworzenie `src/lib/notifications/messages.ts`
- [ ] Utworzenie `src/lib/notifications/notificationService.ts`
- [ ] Utworzenie `src/lib/notifications/index.ts`
- [ ] Utworzenie `src/lib/notifications/README.md`
- [ ] Utworzenie testów `src/__tests__/notifications/`
- [ ] Uruchomienie testów - wszystkie przechodzą

### Faza 2: Refaktoryzacja AUTH ⏱️ 1h

- [ ] `src/components/auth/LoginForm.tsx`
- [ ] `src/components/auth/RegisterForm.tsx`
- [ ] `src/components/auth/ForgotPasswordForm.tsx`
- [ ] `src/components/auth/LogoutButton.tsx`
- [ ] `src/hooks/useRegister.ts`
- [ ] `src/hooks/useForgotPassword.ts`
- [ ] Testy - auth działa poprawnie

### Faza 3: Refaktoryzacja GROUP ⏱️ 1-2h

- [ ] `src/components/group/GroupEditModal.tsx`
- [ ] `src/components/group/DeleteGroupModal.tsx`
- [ ] `src/components/group/DrawConfirmationModal.tsx`
- [ ] `src/components/forms/CreateGroupForm.tsx`
- [ ] `src/hooks/useGroupData.ts`
- [ ] `src/hooks/useGroupViewHandlers.ts`
- [ ] `src/components/group/ParticipantsList.tsx`
- [ ] `src/components/group/ParticipantCard.tsx`
- [ ] Testy - groups działają poprawnie

### Faza 4: Refaktoryzacja PARTICIPANT i EXCLUSION ⏱️ 1h

- [ ] `src/components/group/AddParticipantForm.tsx`
- [ ] `src/components/group/EditParticipantModal.tsx`
- [ ] `src/components/group/AddExclusionForm.tsx`
- [ ] `src/hooks/useResetPassword.ts`
- [ ] Testy - participants i exclusions działają

### Faza 5: Finalizacja ⏱️ 1h

- [ ] Usunięcie wszystkich importów `import { toast } from "sonner"` (poza service i sonner.tsx)
- [ ] Aktualizacja `CLAUDE.md` z guidelines
- [ ] Code review całego systemu
- [ ] Testy E2E - wszystkie scenariusze działają
- [ ] Sprawdzenie TypeScript - brak błędów
- [ ] Dokumentacja finalna

### Całkowity czas: 5-7 godzin

---

## Podsumowanie

System notyfikacji Secret Santa to kompleksowe rozwiązanie zapewniające:

✅ **Centralizację** - jedno źródło prawdy dla wszystkich komunikatów
✅ **Typowanie** - silne TypeScript types w całym systemie
✅ **Spójność** - jednolite API i wzorce użycia
✅ **Łatwość utrzymania** - zmiana komunikatu w jednym miejscu
✅ **Developer Experience** - autouzupełnianie, type safety, proste API
✅ **User Experience** - spójne, jasne komunikaty
✅ **Testowalność** - łatwe mockowanie i testowanie
✅ **Skalowalność** - przygotowany na i18n i rozszerzenia

System jest gotowy do wdrożenia i znacząco poprawi jakość kodu oraz doświadczenie deweloperów.
