# Komponenty widoku wyniku Secret Santa

Ten folder zawiera komponenty React odpowiedzialne za wyświetlanie wyników losowania Secret Santa.

## Struktura komponentów

- `ResultView.tsx` - Główny komponent kontenera
- `ResultHeader.tsx` - Nagłówek z breadcrumb i informacjami o grupie
- `ResultReveal.tsx` - Interaktywny komponent odkrywania wyniku
- `AssignedPersonCard.tsx` - Karta wylosowanej osoby
- `WishlistSection.tsx` - Sekcja z listami życzeń
- `WishlistEditor.tsx` - Edytor własnej listy życzeń
- `WishlistDisplay.tsx` - Wyświetlanie listy życzeń innej osoby

## Architektura

Komponenty są zorganizowane w warstwowej architekturze z separacją odpowiedzialności:

- **ResultView** - Główny kontener i zarządzanie stanem aplikacji
- **Prezentacja** - ResultHeader, ResultReveal, WishlistSection
- **Biznesowa logika** - Custom hooks (useResultData, useRevealState, useWishlistEditor, useWishlistLinking)
- **UI** - AssignedPersonCard, WishlistEditor, WishlistDisplay

## Szczegółowy opis komponentów

### ResultView
**Główny komponent kontenera widoku wyniku**

**Odpowiedzialności:**
- Koordynacja wszystkich podkomponentów
- Zarządzanie stanem ładowania i błędami
- Obsługa wszystkich scenariuszy błędów API
- Error boundaries dla niezawodności

**Props:**
```typescript
interface ResultViewProps {
  groupId?: number;        // Dla zalogowanych użytkowników
  token?: string;          // Dla niezarejestrowanych uczestników
  isAuthenticated?: boolean;
}
```

**Stany błędów obsługiwane:**
- `DRAW_NOT_COMPLETED` - Losowanie nie zostało przeprowadzone
- `UNAUTHORIZED` - Brak autoryzacji
- `FORBIDDEN` - Brak dostępu (nie uczestnik)
- `INVALID_TOKEN` - Nieprawidłowy token
- `GROUP_NOT_FOUND` - Grupa nie istnieje
- `NETWORK_ERROR` - Problem z połączeniem

### ResultHeader
**Nagłówek z breadcrumb i informacjami o grupie**

**Funkcjonalności:**
- Breadcrumb nawigacyjny (tylko dla zalogowanych)
- Nazwa grupy i status
- Informacje o budżecie i terminie wymiany
- Responsywny design

### ResultReveal
**Interaktywny komponent odkrywania wyniku losowania**

**Funkcjonalności:**
- Animowany prezent z efektem hover
- Przycisk "Kliknij, aby odkryć!"
- Animacja odkrycia z konfetti
- Stan odkrycia w localStorage
- Obsługa prefers-reduced-motion

### AssignedPersonCard
**Karta wyświetlająca informacje o wylosowanej osobie**

**Funkcjonalności:**
- Avatar z inicjałami
- Nazwa wylosowanej osoby
- Gradientowe tło
- Responsywny layout

### WishlistSection
**Kontener dla sekcji list życzeń**

**Funkcjonalności:**
- Responsywny grid (2 kolumny na desktop, 1 na mobile)
- Organizacja layout dla własnej listy i listy wylosowanej osoby

### WishlistEditor
**Edytor listy życzeń z funkcją autosave**

**Funkcjonalności:**
- Pole tekstowe z walidacją długości (10000 znaków)
- Debounced autosave (2 sekundy)
- Status zapisywania z wizualną informacją zwrotną
- Licznik znaków z ostrzeżeniami
- Blokada edycji po terminie zakończenia
- Obsługa błędów z przyciskami retry

### WishlistDisplay
**Wyświetlanie listy życzeń tylko do odczytu**

**Funkcjonalności:**
- Automatyczne linkowanie URL-i w tekście
- Obsługa pustego stanu
- Bezpieczne renderowanie HTML
- Tytuł z nazwą osoby

## Custom Hooks

### useResultData
**Hook do pobierania danych wyniku z API**

**Funkcjonalności:**
- Obsługa dwóch trybów dostępu (authenticated + token)
- Transformacja DTO → ViewModel
- Formatowanie dat, budżetu, inicjałów
- Kompleksowa obsługa błędów

### useRevealState
**Hook do zarządzania stanem odkrycia wyniku**

**Funkcjonalności:**
- localStorage persistence
- Walidacja danych
- Cleanup starych stanów (30 dni)

### useWishlistEditor
**Hook do edycji listy życzeń z autosave**

**Funkcjonalności:**
- Debounced save (2s)
- Stan edytora z walidacją
- Obsługa błędów API

### useWishlistLinking
**Hook do konwersji URL-i na klikalne linki**

**Funkcjonalności:**
- Regex do wykrywania URL-i
- Bezpieczna konwersja na HTML linki

## Optymalizacje wydajności

- **React.memo()** dla wszystkich komponentów prezentacyjnych
- **Lazy loading** dla biblioteki react-confetti
- **useCallback** dla wszystkich funkcji
- **useMemo** dla kosztownych obliczeń
- **Debounced save** dla redukcji requestów API

## Obsługa błędów

Implementacja zawiera kompleksową obsługę błędów dla wszystkich scenariuszy API i interakcji użytkownika.

## Responsywność

Wszystkie komponenty są w pełni responsywne z mobile-first approach.

## Przykład użycia

```typescript
// Dla zalogowanych użytkowników
<ResultView groupId={123} isAuthenticated={true} />

// Dla niezarejestrowanych uczestników
<ResultView token="abc123def" isAuthenticated={false} />
```
