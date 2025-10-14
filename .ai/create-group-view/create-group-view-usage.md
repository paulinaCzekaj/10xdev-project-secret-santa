# Widok tworzenia grupy - Przewodnik użytkownika

## Lokalizacja
- **URL:** `/groups/new`
- **Strona Astro:** `src/pages/groups/new.astro`
- **Komponent React:** `src/components/forms/CreateGroupForm.tsx`

## Jak używać

### 1. Uruchomienie aplikacji

```bash
# Development
npm run dev

# Production build
npm run build
npm run preview
```

### 2. Dostęp do widoku

Przejdź do: `http://localhost:4321/groups/new`

**Uwaga:** Strona wymaga autoryzacji. W trybie development używany jest DEFAULT_USER_ID.

### 3. Wypełnianie formularza

#### Pole: Nazwa grupy
- **Typ:** Tekstowe
- **Wymagane:** Tak
- **Min:** 3 znaki
- **Max:** 50 znaków
- **Przykład:** "Secret Santa 2025"

#### Pole: Budżet
- **Typ:** Numeryczne
- **Wymagane:** Tak
- **Min:** 1
- **Jednostka:** PLN (wyświetlana po prawej stronie)
- **Przykład:** 100

#### Pole: Data zakończenia
- **Typ:** Data (kalendarz)
- **Wymagane:** Tak
- **Ograniczenie:** Tylko daty w przyszłości (od jutra)
- **Format wyświetlania:** dd.MM.yyyy
- **Przykład:** 25.12.2025

### 4. Przesyłanie formularza

1. Kliknij przycisk **"Utwórz grupę"**
2. Formularz waliduje dane
3. Jeśli dane są poprawne:
   - Przycisk pokazuje stan ładowania
   - Dane są wysyłane do API
4. Po sukcesie:
   - Pojawia się powiadomienie sukcesu (toast)
   - Następuje przekierowanie do `/groups/{id}`
5. W przypadku błędu:
   - Pojawia się komunikat błędu
   - Można poprawić dane i spróbować ponownie

## Wykorzystane komponenty

### Z Shadcn/ui:
- `Button` - przyciski akcji
- `Input` - pola tekstowe i numeryczne
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` - zarządzanie formularzem
- `Calendar` - wybór daty
- `Popover` - kontener dla kalendarza
- `Toaster` (sonner) - powiadomienia toast

### Biblioteki:
- `react-hook-form` - zarządzanie stanem formularza
- `zod` - walidacja danych
- `date-fns` - formatowanie dat
- `sonner` - system powiadomień

## Architektura

### Walidacja dwupoziomowa

1. **Klient (Zod schema):**
   - Natychmiastowa walidacja podczas wypełniania
   - Sprawdzanie przed wysłaniem
   - User-friendly komunikaty błędów w języku polskim

2. **Serwer (API endpoint):**
   - Dodatkowa walidacja w `POST /api/groups`
   - Ochrona przed manipulacją danymi po stronie klienta
   - Zwraca szczegółowe błędy w formacie ApiErrorResponse

### Przepływ danych

```
Formularz (CreateGroupFormViewModel)
  ↓ [transformacja]
CreateGroupCommand (API DTO)
  ↓ [POST /api/groups]
GroupDTO (odpowiedź)
  ↓ [przekierowanie]
/groups/{id}
```

### Format danych

**CreateGroupFormViewModel (formularz):**
```typescript
{
  name: string;
  budget: number;
  end_date: Date;
}
```

**CreateGroupCommand (API):**
```typescript
{
  name: string;
  budget: number;
  end_date: string; // ISO 8601
}
```

**GroupDTO (odpowiedź):**
```typescript
{
  id: number;
  name: string;
  budget: number;
  end_date: string;
  creator_id: string;
  is_drawn: boolean;
  created_at: string;
  updated_at: string;
}
```

## Responsywność

### Breakpointy Tailwind:

- **Mobile** (< 640px): Pełna szerokość z padding 4
- **SM** (≥ 640px): Zwiększony padding do 6, większe odstępy
- **MD** (≥ 768px): Padding 8, większy nagłówek
- **Desktop**: Maksymalna szerokość 2xl, wycentrowany layout

## Bezpieczeństwo

### Ochrona trasy
- Sprawdzanie sesji Supabase
- Przekierowanie do `/login` dla niezalogowanych (w produkcji)
- Użycie DEFAULT_USER_ID w development

### Autoryzacja API
- Token Bearer z sesji Supabase
- Dodawany automatycznie do nagłówków żądania
- Format: `Authorization: Bearer {access_token}`

## Obsługa błędów

### Typy błędów:

1. **Błędy walidacji klienta**
   - Wyświetlane pod polami formularza
   - Blokują wysłanie formularza

2. **Błędy API**
   - Wyświetlane w ramce nad przyciskiem submit
   - Toast notification z opisem błędu
   - Przycisk pozostaje aktywny (można spróbować ponownie)

3. **Błędy sieciowe**
   - Ogólny komunikat o problemie z połączeniem
   - Toast notification
   - Możliwość ponowienia próby

## Dostępność (a11y)

- Wszystkie pola mają powiązane etykiety (labels)
- Focus states są wyraźnie widoczne
- Nawigacja klawiaturą (Tab) działa poprawnie
- ARIA attributes są ustawione przez komponenty Shadcn/ui
- Komunikaty błędów są czytane przez screen readery

## Rozwiązywanie problemów

### Problem: Formularz nie wysyła danych
- Sprawdź czy wszystkie pola są poprawnie wypełnione
- Otwórz DevTools Console i szukaj błędów JavaScript
- Sprawdź zakładkę Network - czy żądanie zostało wysłane

### Problem: Błąd "Data zakończenia musi być w przyszłości"
- Upewnij się, że wybierasz datę jutrzejszą lub późniejszą
- Dzisiejsza data i daty w przeszłości są zablokowane

### Problem: Nie widać powiadomień toast
- Sprawdź czy komponent Toaster jest dodany do Layout.astro
- Upewnij się, że pakiet "sonner" jest zainstalowany

### Problem: Przekierowanie nie działa po utworzeniu grupy
- Sprawdź czy endpoint `/groups/{id}` istnieje
- Sprawdź konsole przeglądarki pod kątem błędów

## Dalszy rozwój

### Możliwe ulepszenia:

1. **Autosave drafts** - zapisywanie wersji roboczej w localStorage
2. **Szablony grup** - możliwość wybrania szablonu z predefiniowanymi ustawieniami
3. **Podpowiedzi** - tooltips z wyjaśnieniem każdego pola
4. **Historia** - lista ostatnio utworzonych grup
5. **Import danych** - możliwość importu uczestników z pliku
6. **Walidacja nazwy** - sprawdzanie unikalności nazwy grupy
7. **Rich text editor** - dla dodatkowego pola "opis grupy"
8. **Multi-step form** - podział na kroki (podstawowe info → uczestnicy → zasady)

## Maintanance

### Aktualizacja walidacji:
Edytuj schemat Zod w `CreateGroupForm.tsx`:
```typescript
const createGroupFormSchema = z.object({
  // Dodaj lub zmodyfikuj reguły walidacji
});
```

### Aktualizacja stylowania:
Zmodyfikuj klasy Tailwind w komponentach lub w `src/pages/groups/new.astro`

### Aktualizacja komunikatów:
Wszystkie komunikaty są w języku polskim i zdefiniowane w:
- Schemacie Zod (błędy walidacji)
- Funkcji onSubmit (toast notifications)
- Komponentach formularza (etykiety, placeholdery)

