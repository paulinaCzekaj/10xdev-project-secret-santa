# System notyfikacji Secret Santa

Scentralizowany, typowany system zarządzania notyfikacjami oparty na bibliotece [Sonner](https://sonner.emilkowal.ski/).

## Szybki start

### Podstawowe użycie

```typescript
import { notify } from "@/lib/notifications";

// Notyfikacja sukcesu z kluczem ze słownika
notify.success("AUTH.LOGIN_SUCCESS");

// Notyfikacja błędu
notify.error("GROUP.DELETE_ERROR");

// Notyfikacja info
notify.info("GENERAL.LOADING");

// Notyfikacja ostrzeżenia
notify.warning("EXCLUSION.ADD_PARTIAL_SUCCESS");
```

### Custom messages

Jeśli potrzebujesz wyświetlić niestandardowy komunikat (np. z API):

```typescript
notify.error({
  title: "Błąd API",
  description: apiError.message,
});
```

### Dodatkowe opcje

```typescript
// Dłuższy czas wyświetlania
notify.success("AUTH.LOGIN_SUCCESS", { duration: 5000 });

// Własna pozycja
notify.info("GENERAL.LOADING", { position: "top-center" });

// Z callbackiem
notify.success("GROUP.CREATE_SUCCESS", {
  onDismiss: () => console.log("Toast dismissed"),
});
```

### Zamykanie notyfikacji

```typescript
// Zamknij konkretną notyfikację
const toastId = toast.loading("Processing...");
// ... po zakończeniu
notify.dismiss(toastId);

// Lub zamknij wszystkie notyfikacje
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
notify.success("CATEGORY.ACTION_STATUS");
```

## Testowanie

```typescript
import { notify } from "@/lib/notifications";
import { vi } from "vitest";

// Mockowanie dla testów
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Test
it("should display success notification", () => {
  notify.success("AUTH.LOGIN_SUCCESS");
  expect(toast.success).toHaveBeenCalledWith("Zalogowano pomyślnie!", expect.any(Object));
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
Toaster Component (w Layout.astro)
    ↓
Wyświetlenie użytkownikowi
```

## Best Practices

### ✅ Dobre

```typescript
// Używaj kluczy ze słownika
notify.success("AUTH.LOGIN_SUCCESS");

// Używaj custom messages dla błędów API
notify.error({
  title: "Błąd API",
  description: error.message,
});

// Grupuj logikę notyfikacji
const handleDelete = async () => {
  try {
    await deleteGroup(id);
    notify.success("GROUP.DELETE_SUCCESS");
  } catch (error) {
    notify.error("GROUP.DELETE_ERROR");
  }
};
```

### ❌ Złe

```typescript
// NIE importuj bezpośrednio z sonner
import { toast } from "sonner"; // ❌
toast.success("Sukces!"); // ❌

// NIE duplikuj komunikatów
notify.success({ title: "Zalogowano pomyślnie!" }); // ❌ Użyj klucza!

// NIE używaj long descriptions
notify.success({
  title: "Sukces",
  description: "Bardzo długi opis który...", // ❌ Trzymaj się zwięzłości
});
```

## Migracja z poprzedniego systemu

### Przed

```typescript
import { toast } from "sonner";
toast.success("Zalogowano pomyślnie!");
toast.error("Błąd logowania", { description: "Nieprawidłowy email lub hasło" });
```

### Po

```typescript
import { notify } from "@/lib/notifications";
notify.success("AUTH.LOGIN_SUCCESS");
notify.error("AUTH.LOGIN_ERROR");
```

## Wsparcie dla i18n (przyszłość)

System jest przygotowany do łatwej integracji z biblioteką i18n:

```typescript
// Przyszła implementacja
const getMessage = (key: MessageKey, locale: string) => {
  return NOTIFICATION_MESSAGES[locale][key];
};
```
