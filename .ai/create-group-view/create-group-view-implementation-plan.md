# Plan implementacji widoku: Tworzenie nowej grupy

## 1. Przegląd

Widok "Tworzenie nowej grupy" umożliwia zalogowanym użytkownikom inicjowanie nowego wydarzenia Secret Santa. Użytkownik podaje podstawowe informacje o grupie, takie jak nazwa, budżet i data zakończenia. Po pomyślnym przesłaniu formularza, grupa jest tworzona w systemie, a użytkownik jest automatycznie przekierowywany do widoku zarządzania nowo utworzoną grupą.

## 2. Routing widoku

Widok będzie dostępny pod następującą ścieżką:

- `/groups/new`

Dostęp do tej ścieżki powinien być chroniony i wymagać aktywnej sesji użytkownika. Niezalogowani użytkownicy powinni być przekierowywani do strony logowania.

## 3. Struktura komponentów

Hierarchia komponentów dla tego widoku będzie następująca:

```
- CreateGroupPage (`/src/pages/groups/new.astro`)
  - Layout (`/src/layouts/Layout.astro`)
  - CreateGroupForm (`/src/components/forms/CreateGroupForm.tsx`)
    - Form (z Shadcn/ui, opakowujący react-hook-form)
      - FormField (dla nazwy grupy)
        - Input (Shadcn/ui)
      - FormField (dla budżetu)
        - Input[type=number] (Shadcn/ui)
      - FormField (dla daty zakończenia)
        - Popover (Shadcn/ui)
          - Button (Shadcn/ui)
          - Calendar (Shadcn/ui)
      - Button[type=submit] (Shadcn/ui)
```

Komponent `CreateGroupForm` będzie renderowany jako interaktywna "wyspa" po stronie klienta za pomocą dyrektywy `client:load`.

## 4. Szczegóły komponentów

### `CreateGroupPage`

- **Opis komponentu:** Strona Astro, która renderuje główny layout aplikacji oraz osadza w nim komponent formularza React. Odpowiada za ustawienie tytułu strony i ochronę trasy.
- **Główne elementy:** Komponent `Layout`, komponent `CreateGroupForm`.
- **Obsługiwane interakcje:** Brak.
- **Obsługiwana walidacja:** Sprawdzenie sesji użytkownika i przekierowanie w przypadku jej braku.
- **Typy:** Brak.
- **Propsy:** Brak.

### `CreateGroupForm`

- **Opis komponentu:** Komponent React wielokrotnego użytku, działający po stronie klienta, odpowiedzialny za renderowanie i zarządzanie formularzem tworzenia grupy. Obsługuje stan, walidację i wysyłanie danych do API.
- **Główne elementy:**
  - Formularz oparty na `react-hook-form` i komponentach `Form` z biblioteki Shadcn/ui.
  - Pole tekstowe `Input` dla nazwy grupy.
  - Pole numeryczne `Input` dla budżetu, z dodatkową etykietą "PLN".
  - Komponent `Calendar` wewnątrz `Popover` do wyboru daty zakończenia.
  - Przycisk `Button` do przesłania formularza.
- **Obsługiwane interakcje:**
  - Wprowadzanie danych w polach formularza.
  - Wybór daty z kalendarza.
  - Przesłanie formularza (submit).
- **Obsługiwana walidacja:** Walidacja jest realizowana w czasie rzeczywistym (on-blur/on-change) oraz przy próbie przesłania formularza.
  - **Nazwa grupy:**
    - Wymagane.
    - Musi mieć co najmniej 3 znaki.
    - Nie może przekraczać 50 znaków.
  - **Budżet:**
    - Wymagane.
    - Musi być liczbą całkowitą.
    - Musi być większy od 0.
  - **Data zakończenia:**
    - Wymagane.
    - Musi być datą w przyszłości (późniejszą niż aktualny dzień).
- **Typy:** `CreateGroupFormViewModel`, `CreateGroupCommand`, `GroupDTO`.
- **Propsy:** Brak.

## 5. Typy

Do implementacji widoku wymagane będą następujące typy:

1.  **`CreateGroupFormViewModel` (ViewModel dla formularza)**
    - Definiuje strukturę danych formularza po stronie klienta i jest używany przez Zod do walidacji.
    - **Pola:**
      - `name`: `string`
      - `budget`: `number`
      - `end_date`: `Date`

2.  **`CreateGroupCommand` (DTO żądania API)**
    - Zdefiniowany w `src/types.ts`. Używany do budowy ciała żądania POST.
    - **Pola:**
      - `name`: `string`
      - `budget`: `number`
      - `end_date`: `string` (w formacie ISO 8601)

3.  **`GroupDTO` (DTO odpowiedzi API)**
    - Zdefiniowany w `src/types.ts`. Reprezentuje obiekt grupy zwrócony przez API po pomyślnym utworzeniu.
    - **Pola:**
      - `id`: `number`
      - `name`: `string`
      - `budget`: `number`
      - `end_date`: `string`
      - `creator_id`: `string`
      - `is_drawn`: `boolean`
      - `created_at`: `string`
      - `updated_at`: `string`

## 6. Zarządzanie stanem

- **Stan formularza:** Cały stan formularza (wartości pól, błędy walidacji, status przesyłania) będzie zarządzany przez hook `useForm` z biblioteki `react-hook-form`.
- **Stan ładowania/błędu API:** W komponencie `CreateGroupForm` zostaną użyte proste stany `useState` do zarządzania stanem ładowania (`isSubmitting`) oraz ewentualnymi błędami zwróconymi z API (`apiError`).
- **Niestandardowy hook:** Nie jest wymagane tworzenie niestandardowego hooka. Logika związana z wywołaniem API zostanie zawarta w funkcji obsługującej `onSubmit` formularza.

## 7. Integracja API

- **Endpoint:** `POST /api/groups`
- **Proces integracji:**
  1. W momencie przesłania formularza, dane z `CreateGroupFormViewModel` zostaną zmapowane na obiekt `CreateGroupCommand`.
  2. W szczególności, obiekt `Date` z pola `end_date` zostanie sformatowany do ciągu znaków w standardzie ISO 8601 (UTC). Na przykład: `date.toISOString()`.
  3. Zostanie wykonane asynchroniczne żądanie `POST` na podany endpoint z użyciem `fetch` API.
  4. W nagłówkach żądania zostanie umieszczony token autoryzacyjny `Bearer`, pobrany z aktywnej sesji Supabase.
  5. **Typ żądania:** `CreateGroupCommand`
  6. **Typ odpowiedzi (sukces):** `GroupDTO`
- **Obsługa odpowiedzi:**
  - W przypadku sukcesu (status 201), komponent odczyta `id` nowej grupy z odpowiedzi i przekieruje użytkownika na stronę `/groups/{id}`.
  - W przypadku błędu, odpowiedni komunikat zostanie wyświetlony użytkownikowi.

## 8. Interakcje użytkownika

- **Wypełnianie formularza:** Użytkownik wpisuje dane w pola. Błędy walidacji pojawiają się pod polami po ich zwalidowaniu (np. po utracie fokusu).
- **Próba wysłania niepoprawnego formularza:** Kliknięcie przycisku "Utwórz grupę" nie powoduje wysłania żądania. Wszystkie błędy walidacyjne są wyraźnie pokazywane.
- **Wysyłanie poprawnego formularza:**
  - Po kliknięciu przycisku "Utwórz grupę", przycisk staje się nieaktywny, a obok może pojawić się wskaźnik ładowania.
  - Po pomyślnej odpowiedzi z API, użytkownik widzi krótkie powiadomienie "toast" o sukcesie i zostaje przekierowany.
  - W razie błędu API, przycisk staje się ponownie aktywny, a pod formularzem pojawia się komunikat o błędzie.

## 9. Warunki i walidacja

- **Warunek:** Użytkownik musi być zalogowany.
  - **Weryfikacja:** Na poziomie strony (`CreateGroupPage`) przez sprawdzenie sesji.
- **Warunek:** Nazwa grupy jest wymagana (min. 3, max. 50 znaków).
  - **Weryfikacja:** W komponencie `CreateGroupForm` za pomocą schemy Zod. Wpływa na stan interfejsu poprzez wyświetlanie komunikatu błędu i blokowanie wysyłki.
- **Warunek:** Budżet jest wymagany, musi być liczbą całkowitą dodatnią.
  - **Weryfikacja:** W `CreateGroupForm` za pomocą schemy Zod. Wpływa na stan interfejsu.
- **Warunek:** Data zakończenia jest wymagana i musi być w przyszłości.
  - **Weryfikacja:** W `CreateGroupForm` za pomocą schemy Zod. Wpływa na stan interfejsu.

## 10. Obsługa błędów

- **Brak autoryzacji:** Strona `/groups/new` przekierowuje na `/login`, jeśli użytkownik nie jest zalogowany.
- **Błędy walidacji klienta:** Obsługiwane i wyświetlane przez `react-hook-form` i Zod pod odpowiednimi polami.
- **Błędy sieciowe:** Ogólny komunikat o błędzie (np. "Błąd połączenia. Spróbuj ponownie.") jest wyświetlany w obszarze formularza.
- **Błędy serwera (4xx, 5xx):** Ogólny komunikat o błędzie (np. "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.") jest wyświetlany. Szczegóły błędu są logowane do konsoli deweloperskiej.

## 11. Kroki implementacji

1.  Utworzenie pliku strony Astro: `src/pages/groups/new.astro`.
    - Dodanie podstawowego layoutu i implementacja logiki sprawdzającej sesję użytkownika.
    - Osadzenie w nim komponentu React `CreateGroupForm` z dyrektywą `client:load`.
2.  Utworzenie pliku komponentu formularza: `src/components/forms/CreateGroupForm.tsx`.
3.  Zdefiniowanie schemy walidacji Zod dla `CreateGroupFormViewModel` wewnątrz pliku komponentu.
4.  Implementacja struktury formularza przy użyciu `react-hook-form` oraz komponentów z Shadcn/ui (`Form`, `Input`, `Popover`, `Calendar`, `Button`).
5.  Konfiguracja integracji kalendarza z `react-hook-form` poprzez `FormField` i `render` prop.
6.  Implementacja logiki `onSubmit`:
    - Pobranie danych z formularza.
    - Transformacja danych do formatu `CreateGroupCommand` (w tym formatowanie daty).
    - Implementacja wywołania `fetch` do endpointu `POST /api/groups`, włączając dodanie tokena autoryzacyjnego.
7.  Implementacja obsługi stanu ładowania (dezaktywacja przycisku).
8.  Implementacja obsługi odpowiedzi API:
    - W przypadku sukcesu: wyświetlenie powiadomienia typu "toast" i wykonanie przekierowania `window.location.href`.
    - W przypadku błędu: wyświetlenie komunikatu o błędzie.
9.  Stylizacja komponentu przy użyciu Tailwind CSS w celu zapewnienia responsywności.
10. Ręczne przetestowanie wszystkich scenariuszy: walidacji, pomyślnego utworzenia grupy oraz różnych typów błędów.
