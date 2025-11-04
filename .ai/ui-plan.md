# Architektura UI dla Secret Santa

## 1. Przegląd struktury UI

System opiera się na podejściu mobile-first, z wykorzystaniem Astro do renderowania statycznych stron oraz React. Interfejs ma łączyć prostotę i intuicyjność z estetyką świąteczną (czerwony, zielony, złoty, elementy tematyczne) oraz zapewniać wysokie standardy dostępności (WCAG 2.1 Level AA) i bezpieczeństwa (m.in. token-based access). Projekt został zaplanowany tak, aby każdy widok wyraźnie komunikował swój cel, dostarczał tylko niezbędne informacje i umożliwiał płynne przemieszczanie się użytkownika zgodnie z głównym przypadkiem użycia – stworzenie, zarządzanie i przeprowadzenie losowania w grupie.

## 2. Lista widoków

### Landing Page

- **Ścieżka widoku:** `/`
- **Główny cel:** Prezentacja aplikacji dla niezalogowanych użytkowników, zachęta do rejestracji lub logowania.
- **Kluczowe informacje:** Krótki opis aplikacji, główne korzyści, CTA do logowania/rejestracji.
- **Kluczowe komponenty:** Hero section, CTA buttons, informacyjny teaser o Secret Santa.
- **UX, dostępność i bezpieczeństwo:** Responsywny design (przystosowany do mobile), wyraźne kontrasty, odpowiednie etykiety ARIA, automatyczna redirekcja do dashboardu dla zalogowanych.

### Strony Autentykacji

- **Logowanie**
  - **Ścieżka widoku:** `/login`
  - **Główny cel:** Umożliwienie zalogowania się istniejącego użytkownika.
  - **Kluczowe informacje:** Formularz logowania (email, hasło, „zapamiętaj mnie”), link do resetu hasła i rejestracji.
  - **Kluczowe komponenty:** Formularz, validacja inline, feedback (toast notifications).
  - **UX, dostępność i bezpieczeństwo:** Formularz dostępny z klawiatury, focus management, semantyczne etykiety i komunikaty błędów.

- **Rejestracja**
  - **Ścieżka widoku:** `/register`
  - **Główny cel:** Umożliwienie nowemu użytkownikowi stworzenie konta.
  - **Kluczowe informacje:** Formularz rejestracyjny (email, hasło, powtórz hasło, akceptacja regulaminu), wskaźnik siły hasła.
  - **Kluczowe komponenty:** Formularz rejestracji, password strength indicator, checkbox.
  - **UX, dostępność i bezpieczeństwo:** Inline walidacja, ARIA labels, komunikaty błędów, zabezpieczenie przed atakami XSS.

- **Reset hasła**
  - **Ścieżka widoku:** `/forgot-password`
  - **Główny cel:** Umożliwienie użytkownikowi odzyskania dostępu poprzez reset hasła.
  - **Kluczowe informacje:** Formularz wpisania adresu email, instrukcje resetu.
  - **Kluczowe komponenty:** Formularz, przycisk submit, komunikaty feedback.
  - **UX, dostępność i bezpieczeństwo:** Prosty, czytelny interfejs z odpowiednią walidacją.

### Dashboard (Widok chroniony dla zalogowanych)

- **Ścieżka widoku:** `/dashboard`
- **Główny cel:** Prezentacja listy grup podzielonych na „Grupy, które stworzyłem” oraz „Grupy, do których należę”.
- **Kluczowe informacje:** Karty/grids grup z nazwą, budżetem, datą zakończenia, liczbą uczestników, statusem (przed/post losowaniem), badge rolą (twórca/uczestnik).
- **Kluczowe komponenty:** Lista/grids kartu, elementy filtrów (taby sortowania i filtrów).
- **UX, dostępność i bezpieczeństwo:** Responsywność – grid 1/2/3 kolumny w zależności od urządzenia, focus management na interaktywnych elementach, przyciski z czytelnymi etykietami i feedbackiem (toast notifications).

### Tworzenie Grupy

- **Ścieżka widoku:** `/groups/new`
- **Główny cel:** Umożliwienie stworzenia nowej grupy Secret Santa.
- **Kluczowe informacje:** Formularz z polami: nazwa grupy, budżet, data zakończenia.
- **Kluczowe komponenty:** Formularz (React Hook Form + Zod), date picker (Shadcn Calendar), przycisk submit.
- **UX, dostępność i bezpieczeństwo:** Walidacja pól (inline, regex dla email przy dodawaniu uczestników później), feedback na sukces (redirect + toast), responsywny design.

### Widok Grupy

- **Ścieżka widoku:** `/groups/:id`
- **Główny cel:** Zarządzanie szczegółami grupy – przed losowaniem (edycja, dodawanie uczestników, wykluczenia) oraz podgląd po losowaniu.
- **Kluczowe informacje:**
  - **Przed losowaniem:** Informacje o grupie (nazwa, budżet, data), lista uczestników (tabela/karty), sekcja wykluczeń, przyciski edycji i usuwania grupy, formularz dodawania uczestników i wykluczeń oraz przycisk „Rozpocznij losowanie”.
  - **Po losowaniu:** Widok read-only, dodatkowe kolumny statusu listu i wyniku, przyciski kopiowania linku z tokenem oraz „Zobacz mój wynik”.
- **Kluczowe komponenty:** Nagłówek grupy, tabela lub karty uczestników, modal edycji uczestników, inline formularze, sekcja wykluczeń, przycisk do losowania.
- **UX, dostępność i bezpieczeństwo:** Dla mobile – przyjazne karty zamiast tabel; zabezpieczenie przed edycją po losowaniu; widoczny status operacji (np. disabled button „Rozpocznij losowanie” gdy uczestników jest za mało); ARIA labels dla przycisków edycji i dynamiczne komunikaty o statusie.

### Strona Wyniku

- **Ścieżka widoku:** `/groups/:id/result` (dla zalogowanych) lub `/results/:token` (dla niezarejestrowanych lub zalogowanych)
- **Główny cel:** Prezentacja wyniku losowania, z interaktywnym odkrywaniem wyniku oraz edycją listy do św. Mikołaja (z opcjonalnym wsparciem AI w wersji 1.1).
- **Kluczowe informacje:** Nagłówek grupy (nazwa, budżet, data), interaktywny element prezentu (animowany, do odkrycia wyniku), wynik (wylosowana osoba) oraz sekcja list (list do św. Mikołaja) – osobno wyświetlane edytowane pola dla własnego listu i listy wylosowanej osoby.
- **Kluczowe komponenty:**
  - Prezent z animacją i konfetti
  - Komponenty do edycji listy z autosave
  - **NOWE (v1.1):** Przycisk "Wygeneruj list do Mikołaja z pomocą AI" z ikoną sparkles i licznikiem pozostałych generowań
  - **NOWE (v1.1):** Modal do wprowadzenia promptu (preferencje/zainteresowania użytkownika)
  - **NOWE (v1.1):** Modal podglądu wygenerowanego listu z opcjami: "Akceptuj", "Odrzuć", "Generuj ponownie"
  - Statusy (ikony ✓/⚠️)
  - Przyciski kopiowania linku oraz breadcrumb (dla zalogowanych)
- **UX, dostępność i bezpieczeństwo:**
  - Mechanizm „kliknij, aby odkryć" z odpowiednią animacją realizowaną przy pierwszym wyświetleniu (z przechowywaniem flagi w localStorage)
  - Zabezpieczenie tokenem do wyników
  - Responsywne układy i obsługa dotykowa
  - **NOWE (v1.1):** Wizualna informacja o limitach AI (3 generowania dla niezarejestrowanych, 5 dla zalogowanych per-grupa)
  - **NOWE (v1.1):** Disabled state przycisku AI po wyczerpaniu limitów z komunikatem "Wykorzystałeś wszystkie generowania AI"
  - **NOWE (v1.1):** Loading state podczas generowania z animacją (spinner)
  - **NOWE (v1.1):** Obsługa błędów API (timeout, rate limiting, błędy serwera) z user-friendly komunikatami
  - **NOWE (v1.1):** Walidacja promptu (min. 10 znaków, max. 1000 znaków)
  - **NOWE (v1.1):** Podgląd przed akceptacją pozwala użytkownikowi ocenić wygenerowaną treść
  - **NOWE (v1.1):** Każde generowanie (nawet odrzucone) zmniejsza licznik - użytkownik jest o tym informowany
  - **NOWE (v1.1):** Po akceptacji treść jest automatycznie wstawiana do textarea i użytkownik może ją dowolnie edytować

## 3. Mapa podróży użytkownika

1. **Strona startowa (Landing Page):**
   - Użytkownik odwiedza `/`.
   - Dla niezalogowanych – widzi opis aplikacji i CTA do logowania/rejestracji.
   - Dla zalogowanych – następuje automatyczna redirekcja do `/dashboard`.

2. **Proces autentykacji:**
   - Użytkownik wybiera logowanie lub rejestrację.
   - Po poprawnym logowaniu, następuje przekierowanie do `/dashboard`.

3. **Dashboard:**
   - Użytkownik widzi listę swoich grup (jako twórca lub uczestnik).
   - Może sortować, filtrować i wybierać grupę.
   - Użytkownik wybiera grupę, aby przejść do widoku szczegółów.

4. **Tworzenie nowej grupy:**
   - Użytkownik klika „Utwórz grupę” (FAB lub link).
   - Wypełnia formularz na `/groups/new`.
   - Po sukcesie następuje przekierowanie do widoku grupy i fokus na dodawanie uczestników.

5. **Widok grupy (przed losowaniem):**
   - Użytkownik widzi szczegóły grupy, listę uczestników oraz sekcję wykluczeń.
   - Może dodać/edytować uczestników i wykluczenia (edytory modali, formularze inline).
   - Po spełnieniu warunku (min. 3 uczestników) użytkownik klika „Rozpocznij losowanie”.
   - System wywołuje walidację przez API, pojawia się modal potwierdzenia losowania.

6. **Losowanie:**
   - Użytkownik potwierdza losowanie w modalnym oknie.
   - Po potwierdzeniu następuje wywołanie API wykonujące losowanie.
   - Po sukcesie następuje przekierowanie do strony wyniku.

7. **Strona wyniku:**
   - Użytkownik widzi ekran z interaktywną ikoną prezentu („kliknij, aby odkryć wynik").
   - Po interakcji – animacja, konfetti oraz wyświetlenie wylosowanego uczestnika.
   - Użytkownik może edytować swój list do św. Mikołaja, a dodatkowo widzi status wypełnienia listów przez uczestników.
   - **NOWE (v1.1) - Przepływ AI-generowania listu:**
     - Obok pola tekstowego listy życzeń użytkownik widzi przycisk "Wygeneruj list do Mikołaja z pomocą AI" z ikoną sparkles ✨
     - Przycisk wyświetla licznik pozostałych generowań (3 dla niezarejestrowanych / 5 dla zalogowanych)
     - **Krok 1 - Otwarcie modala promptu:**
       - Po kliknięciu przycisku otwiera się modal z formularzem
       - Użytkownik wpisuje swoje preferencje/zainteresowania w pole tekstowe (min. 10 znaków)
       - Widzi wskazówki dotyczące tego, co może wpisać (np. "Opisz swoje hobby, ulubione książki, gry...")
       - Klikając "Generuj" wysyła request do AI
     - **Krok 2 - Generowanie:**
       - Wyświetla się loading state z animacją (spinner i komunikat "Mikołaj przygotowuje Twój list... 🎅")
       - System wysyła POST do `/api/participants/:participantId/wishlist/generate-ai`
       - Maksymalny czas oczekiwania: 15 sekund (z timeout handling)
     - **Krok 3 - Podgląd wygenerowanego listu:**
       - Po otrzymaniu odpowiedzi otwiera się modal podglądu
       - Użytkownik widzi wygenerowany list z emoji świątecznymi, ciepłym tonem i narracyjną formą
       - Dostępne są 3 opcje:
         - **"Akceptuj"** - treść jest wstawiana do textarea, modal zamyka się, licznik zmniejsza się o 1
         - **"Odrzuć"** - modal zamyka się, pole pozostaje niezmienione, licznik zmniejsza się o 1
         - **"Generuj ponownie"** - proces generowania powtarza się z tym samym promptem, licznik zmniejsza się o 1
       - Użytkownik widzi zaktualizowany licznik pozostałych generowań
     - **Krok 4 - Po akceptacji:**
       - Wygenerowana treść jest automatycznie wstawiona do pola edycji listy życzeń
       - Użytkownik może dowolnie edytować wygenerowaną treść (dodawać, usuwać, modyfikować)
       - Działa autosave (standardowa funkcjonalność textarea)
     - **Obsługa limitów:**
       - Po wykorzystaniu wszystkich generowań przycisk AI staje się nieaktywny (disabled)
       - Wyświetla się komunikat "Wykorzystałeś wszystkie generowania AI (0/3)" lub "(0/5)"
       - Użytkownik nadal może ręcznie edytować swoją listę życzeń
     - **Obsługa błędów:**
       - Timeout (>15s): "Generowanie trwa zbyt długo. Spróbuj ponownie."
       - Rate limiting (429): "Zbyt wiele żądań. Poczekaj chwilę i spróbuj ponownie."
       - Limit wyczerpany (429): "Wykorzystałeś wszystkie dostępne generowania dla tej grupy."
       - Błąd serwera (5xx): "Wystąpił problem z serwerem AI. Spróbuj ponownie później."
       - Błąd sieci: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
       - Nieprawidłowy prompt (400): "Prompt jest za krótki. Wpisz co najmniej 10 znaków."
   - Użytkownik ma możliwość skopiowania unikalnego tokenowego linku.
   - Dla zalogowanych dostępny jest breadcrumb „← Powrót do grupy".

## 4. Układ i struktura nawigacji

- **Główna Nawigacja (Navbar):**
  - Widoczna na stronach chronionych (Dashboard, Widok Grupy, Strona Wyniku – dla zalogowanych).
  - Elementy: Logo ("🎅 Secret Santa"), linki: Dashboard, Utwórz grupę, oraz menu użytkownika (avatar/inicjały z dropdownem: Profil, Wyloguj).
  - Dla desktop: pełny pasek; dla mobile: hamburger menu otwierający drawer z linkami.

- **Nawigacja mobilna:**
  - Hamburger menu wyświetla się po lewej, zawiera odnośniki do Dashboard, Utwórz grupę, Moje konto.
  - Przyciski CTA są widoczne w stopce (np. „Zarejestruj się” na stronach publicznych).

- **Breadcrumbs:**
  - Dla widoków szczegółowych (np. Widok Wyniku) – dla zalogowanych umożliwiając powrót do poprzedniego widoku, bez wyświetlania w widoku dla niezarejestrowanych.

## 5. Kluczowe komponenty

- **Komponent Formularza:** Wspólny dla logowania, rejestracji, tworzenia grup i edycji danych – z React Hook Form i walidacją Zod.
- **Karty/Lista Grupy:** Komponent do wyświetlania grup w dashboardzie; karta informacyjna z badge rolą, statusem, CTA.
- **Tabela/Karty uczestników:** Dla widoku grupy – tabela dla desktop/tablet, karta dla mobile z przyciskami edycji.
- **Modal Edycji:** Do edycji danych grup/uczestników/wykluczeń z pełnym focus management.
- **Prezent z animacją:** Interaktywny komponent na stronie wyniku realizujący animację odkrywania (z obsługą konfetti).
- **Wishlist Editor:** Tekstowe pole z autosave, counterem, podświetlaniem linków i responsywnym podglądem.
- **Toast Notifications:** Globalny system komunikatów dla feedbacku na operacje (success, error, info).
- **Date Picker:** Komponent bazujący na Shadcn Calendar skonfigurowany na format DD.MM.YYYY.
- **Dropdown/Select:** Komponenty do wyboru uczestników przy dodawaniu wykluczeń.
- **Button – akcje:** Ikony przy edycji, kopiowaniu linków oraz akcjach CRUD, wszystkie z ARIA label oraz feedbackiem wizualnym.

### Komponenty AI (wersja 1.1)

- **AIGenerateButton.tsx:**
  - Przycisk "Wygeneruj list do Mikołaja z pomocą AI" z ikoną sparkles (✨)
  - Wyświetla licznik pozostałych generowań w formie badge (np. "3/3", "2/5")
  - Stan disabled po wyczerpaniu limitów z odpowiednim komunikatem tooltip
  - Responsywny design (pełna szerokość na mobile, auto na desktop)
  - Props: `onClick`, `remainingGenerations`, `maxGenerations`, `disabled`, `isLoading`
  - Stylizacja: świąteczna paleta (gradient czerwony-zielony), białe tło, shadow na hover
  - Accessibility: ARIA label, keyboard support, focus visible

- **AIGenerateModal.tsx:**
  - Modal z formularzem do wprowadzenia promptu (preferencje/zainteresowania)
  - Pojedyncze pole textarea z placeholder i wskazówkami (np. "Opisz swoje hobby, ulubione książki, gry...")
  - Walidacja inline: min. 10 znaków, max. 1000 znaków
  - Licznik znaków w prawym dolnym rogu textarea
  - Przyciski: "Anuluj" (secondary) i "Generuj" (primary, disabled gdy prompt < 10 znaków)
  - Loading state: przycisk "Generuj" zamienia się w spinner z tekstem "Generowanie..."
  - Props: `isOpen`, `onClose`, `onGenerate`, `isGenerating`, `remainingGenerations`
  - Responsywny: full-screen na mobile, centered dialog na desktop
  - Accessibility: trap focus, ESC zamyka modal, ARIA labels

- **AIPreviewModal.tsx:**
  - Modal podglądu wygenerowanego listu do Mikołaja
  - Sekcja podglądu: wyświetla wygenerowaną treść z zachowaniem formatowania (emoji, nowe linie)
  - Informacja o długości treści (np. "852/1000 znaków")
  - Trzy przyciski akcji:
    - **"Akceptuj"** (primary, zielony gradient) - wstawia treść do textarea
    - **"Odrzuć"** (secondary, szary) - zamyka modal bez zmian
    - **"Generuj ponownie"** (outline, fioletowy) - ponawia generowanie z tym samym promptem
  - Wyświetla zaktualizowany licznik pozostałych generowań po każdej akcji
  - Ostrzeżenie przy akcji "Generuj ponownie": "To wykorzysta kolejne generowanie"
  - Props: `isOpen`, `onClose`, `generatedContent`, `onAccept`, `onReject`, `onRegenerate`, `remainingGenerations`, `isRegenerating`
  - Responsywny: scroll jeśli treść przekracza wysokość viewportu
  - Accessibility: keyboard navigation, focus management, czytnik ekranu

- **AIGenerationLimit.tsx (opcjonalny):**
  - Komponent badge/chip wyświetlający status limitów
  - Warianty kolorystyczne:
    - Zielony: pełne limity dostępne (3/3, 5/5)
    - Żółty: częściowe wykorzystanie (1-2 pozostałe)
    - Czerwony: limity wyczerpane (0/3, 0/5)
  - Tooltip z dodatkowymi informacjami (np. "Niezarejestrowani użytkownicy mają 3 generowania per grupa")
  - Props: `current`, `max`, `variant`, `tooltip`
  - Użycie: wewnątrz AIGenerateButton lub jako standalone indicator

- **AIGeneratingSpinner.tsx (opcjonalny):**
  - Komponent loading state z animowanym spinnerem i komunikatem
  - Animacja: świąteczny spinner (np. wirujący prezent 🎁 lub śnieżynka ❄️)
  - Komunikat: "Mikołaj przygotowuje Twój list... 🎅"
  - Opcjonalny progress bar (jeśli API zwraca progress)
  - Props: `message`, `progress`
  - Użycie: wewnątrz AIGenerateModal podczas generowania

### Hooki AI (wersja 1.1)

- **useAIGeneration.ts:**
  - Hook zarządzający procesem generowania listu AI
  - Stan: `isGenerating`, `error`, `generatedContent`, `remainingGenerations`, `canGenerateMore`
  - Funkcje:
    - `generate(prompt: string)` - wysyła POST do `/api/participants/:participantId/wishlist/generate-ai`
    - `clearError()` - czyści błędy
    - `reset()` - resetuje stan hooka
  - Walidacja promptu (min 10 znaków)
  - Obsługa błędów z mapowaniem kodów na user-friendly komunikaty
  - Obsługa timeout (15s)
  - Integracja z API: zwraca `{ generated_content, remaining_generations, can_generate_more }`

- **useAIGenerationStatus.ts:**
  - Hook do pobierania statusu limitów AI dla uczestnika
  - Wywołuje GET `/api/participants/:participantId/wishlist/ai-status`
  - Zwraca: `{ ai_generation_count, remaining_generations, can_generate, last_generated_at }`
  - Automatyczne odświeżanie po każdym wygenerowaniu
  - Cache'owanie wyniku (React Query lub SWR)
  - Props: `participantId`, `accessToken`

## 6. Integracja z AI (wersja 1.1)

### 6.1. Przegląd funkcjonalności

Wersja 1.1 aplikacji Secret Santa wprowadza inteligentny asystent AI pomagający użytkownikom w tworzeniu spersonalizowanych listów do świętego Mikołaja. Funkcjonalność wykorzystuje model AI (openai/gpt-4o-mini via OpenRouter) do generowania listów życzeń w ciepłym, świątecznym tonie narracyjnym, eliminując trudność w wymyślaniu treści i dodając świąteczną atmosferę.

### 6.2. API Endpoints

#### POST `/api/participants/:participantId/wishlist/generate-ai`

**Opis:** Generuje spersonalizowany list do Mikołaja na podstawie promptu użytkownika.

**Autentykacja:**
- Bearer token (dla zalogowanych użytkowników)
- Participant access token (dla niezarejestrowanych, przekazywany w query string lub header)

**Request Body:**
```json
{
  "prompt": "string (min. 10 znaków, max. 1000 znaków)"
}
```

**Success Response (200):**
```json
{
  "generated_content": "string (max. 1000 znaków)",
  "remaining_generations": "number",
  "can_generate_more": "boolean"
}
```

**Error Responses:**
- **400 Bad Request:**
  - `INVALID_PROMPT` - Prompt jest za krótki (< 10 znaków) lub za długi (> 1000 znaków)
  - `END_DATE_PASSED` - Data zakończenia wydarzenia minęła, brak możliwości generowania
- **403 Forbidden:**
  - `FORBIDDEN` - Użytkownik nie ma uprawnień do edycji listy życzeń tego uczestnika
- **429 Too Many Requests:**
  - `AI_GENERATION_LIMIT_REACHED` - Wykorzystano wszystkie dostępne generowania dla tej grupy
  - `RATE_LIMIT_EXCEEDED` - Zbyt wiele żądań w krótkim czasie
- **500 Internal Server Error:**
  - `AI_API_ERROR` - Błąd komunikacji z API OpenRouter
  - `TIMEOUT` - Przekroczono limit czasu generowania (15s)

#### GET `/api/participants/:participantId/wishlist/ai-status`

**Opis:** Pobiera status limitów AI dla uczestnika w danej grupie.

**Autentykacja:** Bearer token lub participant access token

**Success Response (200):**
```json
{
  "ai_generation_count": "number",
  "remaining_generations": "number",
  "can_generate": "boolean",
  "last_generated_at": "string (ISO 8601 timestamp) | null"
}
```

### 6.3. Parametry generowania AI

**Model:** `openai/gpt-4o-mini` (via OpenRouter API)

**Parametry:**
- **Max tokens:** 1000 (odpowiada maksymalnej długości wygenerowanego listu)
- **Temperature:** 0.7 (balans między kreatywnością a spójnością)
- **Top P:** 1.0 (pełne sampling)
- **Timeout:** 15 sekund (maksymalny czas oczekiwania na odpowiedź)
- **Retry policy:** 2 próby w przypadku timeout lub 5xx errors
- **Backoff:** Exponential backoff (1s, 2s)

**System Prompt:**
```
Jesteś asystentem pomagającym tworzyć listy do świętego Mikołaja na Gwiazdkę (Secret Santa).

Zadanie:
Na podstawie preferencji użytkownika wygeneruj ciepły, narracyjny list do Mikołaja zawierający listę życzeń.

Wytyczne:
1. Użyj formy listu (np. "Drogi Mikołaju,..." lub "Hej Mikołaju!")
2. Ton ma być ciepły, personalny i świąteczny (nie oficjalny czy suchy)
3. Zawrzyj pomysły na prezenty wysłane przez użytkownika w narracji listu
4. Dodaj emoji świąteczne (🎁, 🎄, ⭐, 🎅, ❄️, 🔔)
5. Maksymalnie 1000 znaków
6. Odpowiadaj TYLKO po polsku
7. Zakończ list w ciepły, świąteczny sposób

Przykład:
Cześć Mikołaju! 🎅

W tym roku byłam/em grzeczna/y i marze o kilku rzeczach pod choinkę 🎄. Mega chciałabym/bym dostać "Wiedźmin: Ostatnie życzenie" Sapkowskiego 📚, bo fantasy to moja ulubiona bajka! Poza tym uwielbiam dobrą kawę ☕ - jakiś ciekawy zestaw z różnych zakątków świata byłby super. I jeszcze ciepły, kolorowy szalik 🧣, bo zima idzie!

Dzięki i wesołych Świąt! ⭐
```

### 6.4. Limity i ograniczenia

**Limity generowań per-grupa:**
- **Niezarejestrowani użytkownicy:** 3 generowania
- **Zarejestrowani użytkownicy:** 5 generowań

**Zasady liczenia:**
- Każde wywołanie API zmniejsza licznik (nawet jeśli użytkownik odrzuci wynik)
- Regeneracja z tym samym promptem również zmniejsza licznik
- Licznik jest osobny dla każdego uczestnika w każdej grupie (per-participant-per-group)
- Po wyczerpaniu limitów przycisk AI staje się nieaktywny
- Limitów nie można zresetować (z wyjątkiem interwencji administratora w bazie danych)

**Ograniczenia czasowe:**
- Generowanie możliwe tylko przed upływem `end_date` grupy
- Po `end_date` lista życzeń staje się read-only (dotyczy również AI)

**Ograniczenia techniczne:**
- Maksymalna długość promptu: 1000 znaków
- Minimalna długość promptu: 10 znaków
- Maksymalna długość wygenerowanego listu: 1000 znaków
- Timeout pojedynczego żądania: 15 sekund
- Maksymalna liczba retry: 2

### 6.5. Obsługa błędów i przypadków brzegowych

**Błędy API:**

| Kod błędu | Komunikat dla użytkownika | Akcja systemu |
|-----------|---------------------------|---------------|
| 400 - INVALID_PROMPT | "Prompt jest za krótki. Wpisz co najmniej 10 znaków." | Podświetlenie pola textarea w modalu |
| 400 - END_DATE_PASSED | "Wydarzenie się zakończyło. Nie można już edytować listy życzeń." | Wyłączenie przycisku AI, przekierowanie do read-only |
| 403 - FORBIDDEN | "Nie masz uprawnień do edycji tej listy życzeń." | Wyświetlenie toast error, zamknięcie modali |
| 429 - LIMIT_REACHED | "Wykorzystałeś wszystkie dostępne generowania dla tej grupy (0/3 lub 0/5)." | Wyłączenie przycisku AI, wyświetlenie badge z 0 |
| 429 - RATE_LIMIT | "Zbyt wiele żądań. Poczekaj chwilę i spróbuj ponownie." | Tymczasowe wyłączenie przycisku (30s), toast warning |
| 500 - AI_API_ERROR | "Wystąpił problem z serwerem AI. Spróbuj ponownie później." | Toast error, możliwość ponowienia |
| 500 - TIMEOUT | "Generowanie trwa zbyt długo. Spróbuj ponownie." | Toast error, możliwość ponowienia |
| NETWORK_ERROR | "Brak połączenia z internetem. Sprawdź połączenie." | Toast error, możliwość ponowienia |

**Przypadki brzegowe:**

1. **Użytkownik zamyka modal podczas generowania:**
   - Request API jest anulowany (AbortController)
   - Licznik generowań nie zmniejsza się
   - Użytkownik może ponownie otworzyć modal

2. **Użytkownik odświeża stronę podczas generowania:**
   - Request API kontynuuje działanie w tle
   - Po odświeżeniu licznik może być już zmniejszony
   - Użytkownik musi wygenerować ponownie

3. **Wygenerowana treść jest pusta lub nieprawidłowa:**
   - System wyświetla error: "Nie udało się wygenerować listu. Spróbuj ponownie."
   - Licznik jest zmniejszony (API zostało wywołane)
   - Użytkownik może ponownie wygenerować

4. **Użytkownik osiąga limit podczas otwartego modala:**
   - Modal podglądu wyświetla komunikat o braku kolejnych generowań
   - Przycisk "Generuj ponownie" jest nieaktywny
   - Dostępne są tylko opcje "Akceptuj" i "Odrzuć"

5. **Równoczesne generowanie z dwóch urządzeń:**
   - Pierwszy request, który dotrze do serwera, zmniejsza licznik
   - Drugi request może otrzymać błąd 429 (limit reached) jeśli pierwszy wyczerpał limity
   - Frontend synchronizuje stan limitów po każdym wygenerowaniu

### 6.6. Bezpieczeństwo i prywatność

**Dane przekazywane do API AI:**
- System przekazuje do OpenRouter API **wyłącznie** treść promptu wprowadzonego przez użytkownika
- **NIE** są przekazywane: imiona, nazwiska, adresy e-mail, tokeny dostępu, ID grup, ID uczestników
- Kontekst budżetu (jeśli potrzebny) jest przekazywany jako liczba bez powiązania z konkretną grupą

**Informowanie użytkowników:**
- Przed pierwszym użyciem funkcji AI wyświetlany jest disclaimer o wykorzystaniu zewnętrznego API
- Tooltip przy przycisku AI informuje: "Twoje preferencje zostaną wysłane do API AI (OpenRouter)"
- W polityce prywatności dodany punkt o OpenRouter i OpenAI jako podmiotach przetwarzających

**Walidacja i sanityzacja:**
- Prompt jest walidowany po stronie klienta (długość, format)
- Po stronie serwera: dodatkowo sanityzacja HTML/XSS
- Wygenerowana treść jest sanityzowana przed wyświetleniem (XSS protection)
- Automatyczne linkowanie URLs z escapowaniem

**Rate limiting:**
- Per-participant-per-grupa: 3/5 generowań (niemożliwe do obejścia)
- Per-IP: 20 żądań na minutę (ochrona przed abuse)
- Per-account: 50 żądań na godzinę (dla zalogowanych)

**Monitoring kosztów:**
- Tracking liczby wywołań API w czasie rzeczywistym
- Alert przy przekroczeniu miesięcznego budżetu
- Możliwość wyłączenia funkcji AI globally (feature flag)

### 6.7. Metryki i monitorowanie

**Kluczowe metryki (zgodnie z PRD):**

1. **Wskaźnik adopcji AI:**
   - Cel: 30% użytkowników korzysta z AI w ciągu pierwszego miesiąca
   - Mierzone: liczba unikalnych uczestników, którzy użyli funkcji AI / łączna liczba uczestników

2. **Współczynnik akceptacji:**
   - Cel: min. 60% wygenerowanych listów jest akceptowanych
   - Mierzone: liczba kliknięć "Akceptuj" / łączna liczba generowań

3. **Średnia liczba generowań na użytkownika:**
   - Monitorowanie: czy użytkownicy wykorzystują dostępne limity (3/5 per-grupa)
   - Mierzone: suma generowań / liczba użytkowników korzystających z AI

4. **Średni czas tworzenia listy życzeń:**
   - Cel: redukcja o 50% w porównaniu do metody manualnej
   - Mierzone: timestamp rozpoczęcia edycji → timestamp zapisania (AI vs manual)

5. **Wskaźnik wypełnienia list życzeń:**
   - Cel: wzrost procentu uczestników z wypełnioną listą po wprowadzeniu AI
   - Mierzone: liczba uczestników z niepustą wishlist / łączna liczba uczestników

**Monitorowane zdarzenia:**
- Kliknięcie przycisku AI
- Otwarcie modala promptu
- Wysłanie promptu (z długością promptu)
- Sukces/błąd generowania (z kodem błędu)
- Akceptacja wygenerowanego listu
- Odrzucenie wygenerowanego listu
- Kliknięcie "Generuj ponownie"
- Osiągnięcie limitu generowań

**Logi:**
- Wszystkie wywołania API AI (z participant_id, group_id, timestamp, status)
- Błędy generowania (z kodem błędu, participant_id, group_id)
- Przekroczenia limitów (z participant_id, group_id)

### 6.8. Harmonogram implementacji

**Faza 1: Przygotowanie backendu (US-015, kryteria 13-14)**
- ✅ Rozszerzenie tabeli `wishes` o kolumny AI
- ✅ Implementacja serwisu `openrouter.service.ts`
- ✅ Implementacja endpointów API (`generate-ai`, `ai-status`)
- ✅ Testy jednostkowe i integracyjne

**Faza 2: Implementacja hooków (US-015, kryterium 5)**
- ✅ `useAIGeneration.ts` - logika generowania
- ⬜ `useAIGenerationStatus.ts` - status limitów
- ⬜ Testy jednostkowe hooków

**Faza 3: Komponenty UI (US-015, kryteria 1-4, 6-7)**
- ⬜ `AIGenerateButton.tsx` - przycisk z licznikiem
- ⬜ `AIGenerateModal.tsx` - modal promptu
- ⬜ `AIPreviewModal.tsx` - podgląd z 3 opcjami
- ⬜ Opcjonalnie: `AIGenerationLimit.tsx`, `AIGeneratingSpinner.tsx`

**Faza 4: Integracja z WishlistEditor (US-015, kryteria 8-12)**
- ⬜ Dodanie przycisku AI obok textarea
- ⬜ Obsługa flow: otwórz modal → generuj → podgląd → akceptuj/odrzuć
- ⬜ Wstawienie wygenerowanej treści do textarea
- ⬜ Synchronizacja licznika generowań

**Faza 5: Testy E2E i UX (wszystkie kryteria US-015)**
- ⬜ Testy Playwright dla pełnego flow AI
- ⬜ Testy dostępności (keyboard navigation, screen readers)
- ⬜ Testy responsywności (mobile, tablet, desktop)
- ⬜ Testy obciążeniowe (rate limiting, concurrent requests)

**Faza 6: Monitoring i dokumentacja**
- ⬜ Konfiguracja monitoringu metryk
- ⬜ Aktualizacja dokumentacji użytkownika
- ⬜ Przygotowanie materiałów onboardingowych (tooltip, tutorial)
