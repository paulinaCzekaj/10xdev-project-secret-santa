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
- **Główny cel:** Prezentacja wyniku losowania, z interaktywnym odkrywaniem wyniku oraz edycją listy do św. Mikołaja.
- **Kluczowe informacje:** Nagłówek grupy (nazwa, budżet, data), interaktywny element prezentu (animowany, do odkrycia wyniku), wynik (wylosowana osoba) oraz sekcja list (list do św. Mikołaja) – osobno wyświetlane edytowane pola dla własnego listu i listy wylosowanej osoby.
- **Kluczowe komponenty:** Prezent z animacją i konfetti, komponenty do edycji listy z autosave, statusy (ikony ✓/⚠️), przyciski kopiowania linku oraz breadcrumb (dla zalogowanych).
- **UX, dostępność i bezpieczeństwo:** Mechanizm „kliknij, aby odkryć” z odpowiednią animacją realizowaną przy pierwszym wyświetleniu (z przechowywaniem flagi w localStorage), zabezpieczenie tokenem do wyników, responsywne układy i obsługa dotykowa.

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
   - Użytkownik widzi ekran z interaktywną ikoną prezentu („kliknij, aby odkryć wynik”).
   - Po interakcji – animacja, konfetti oraz wyświetlenie wylosowanego uczestnika.
   - Użytkownik może edytować swój list do św. Mikołaja, a dodatkowo widzi status wypełnienia listów przez uczestników.
   - Użytkownik ma możliwość skopiowania unikalnego tokenowego linku.
   - Dla zalogowanych dostępny jest breadcrumb „← Powrót do grupy”.

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

```