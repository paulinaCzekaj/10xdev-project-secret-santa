# Plan Testów dla Aplikacji "Secret Santa"

## 1. Wprowadzenie i Cele Testowania

### 1.1. Wprowadzenie
Niniejszy dokument stanowi kompleksowy plan testów dla aplikacji internetowej "Secret Santa". Aplikacja została zbudowana w oparciu o nowoczesny stos technologiczny, w tym Astro, React, TypeScript i Supabase. Celem projektu jest umożliwienie użytkownikom organizowania i uczestniczenia w losowaniach "Sekretnego Mikołaja", zarządzania grupami, uczestnikami, budżetem oraz listami życzeń.

### 1.2. Cele Testowania
Głównym celem procesu testowania jest zapewnienie najwyższej jakości, niezawodności, bezpieczeństwa i użyteczności aplikacji przed jej wdrożeniem produkcyjnym.

Szczegółowe cele obejmują:
*   **Weryfikację funkcjonalną:** Potwierdzenie, że wszystkie funkcje aplikacji działają zgodnie z założeniami i specyfikacją.
*   **Identyfikację i eliminację błędów:** Wykrycie, zaraportowanie i śledzenie defektów w oprogramowaniu.
*   **Zapewnienie spójności i intuicyjności interfejsu (UI/UX):** Sprawdzenie, czy aplikacja jest łatwa w obsłudze i spójna wizualnie na różnych urządzeniach i przeglądarkach.
*   **Weryfikację bezpieczeństwa:** Upewnienie się, że dane użytkowników są chronione, a dostęp do zasobów jest prawidłowo autoryzowany.
*   **Ocenę wydajności:** Sprawdzenie, jak aplikacja zachowuje się pod obciążeniem i czy czasy odpowiedzi są akceptowalne.
*   **Zapewnienie stabilności:** Potwierdzenie, że aplikacja działa stabilnie i nie występują nieoczekiwane awarie.

---

## 2. Zakres Testów

### 2.1. Funkcjonalności objęte testami (In-Scope)
*   **Moduł uwierzytelniania użytkowników:**
    *   Rejestracja nowego konta.
    *   Logowanie i wylogowywanie.
    *   Mechanizm "Zapomniałem hasła" i resetowanie hasła.
    *   Walidacja formularzy i obsługa błędów.
*   **Pulpit (Dashboard):**
    *   Wyświetlanie listy grup utworzonych przez użytkownika.
    *   Wyświetlanie listy grup, do których użytkownik dołączył.
    *   Nawigacja do widoku szczegółowego grupy.
*   **Zarządzanie grupą "Secret Santa":**
    *   Tworzenie nowej grupy (nazwa, budżet, data zakończenia).
    *   Wyświetlanie szczegółów grupy (dashboard grupy).
    *   Edycja danych grupy.
    *   Usuwanie grupy (wraz ze wszystkimi powiązanymi danymi).
*   **Zarządzanie uczestnikami:**
    *   Dodawanie nowych uczestników (z adresem e-mail i bez).
    *   Edycja danych uczestników.
    *   Usuwanie uczestników z grupy.
    *   Generowanie i obsługa linków dostępowych dla niezarejestrowanych użytkowników.
*   **Zarządzanie regułami wykluczeń:**
    *   Dodawanie reguł wykluczeń (kto nie może kogo wylosować).
    *   Usuwanie reguł wykluczeń.
*   **Proces losowania:**
    *   Walidacja możliwości przeprowadzenia losowania (np. minimalna liczba uczestników).
    *   Wykonanie losowania.
    *   Blokada edycji grupy po losowaniu.
*   **Wyświetlanie wyników i listy życzeń:**
    *   Dostęp do wyników dla zalogowanych uczestników.
    *   Dostęp do wyników za pomocą unikalnego tokenu dla niezarejestrowanych uczestników.
    *   Mechanizm "odkrywania" wyniku.
    *   Wyświetlanie i edycja własnej listy życzeń.
    *   Wyświetlanie listy życzeń wylosowanej osoby.
*   **API:**
    *   Wszystkie punkty końcowe w `src/pages/api/`.

### 2.2. Funkcjonalności wyłączone z testów (Out-of-Scope)
*   Testy obciążeniowe na dużą skalę (powyżej 1000 jednoczesnych użytkowników).
*   Testy integracji z zewnętrznymi usługami wysyłki e-maili (zakładamy, że usługa działa poprawnie, testujemy jedynie fakt wywołania API).
*   Testy samego frameworka Astro i biblioteki React (testujemy aplikację, a nie narzędzia).

---

## 3. Typy Testów

W projekcie zostanie zastosowana strategia piramidy testów, aby zapewnić kompleksowe pokrycie przy jednoczesnej optymalizacji czasu i kosztów.

| Typ Testu | Opis | Narzędzia | Zakres |
| :--- | :--- | :--- | :--- |
| **Testy Jednostkowe** | Testowanie pojedynczych funkcji, komponentów i hooków w izolacji. Skupienie na logice biznesowej, funkcjach pomocniczych (np. formatujących) i schematach walidacji. | Vitest, React Testing Library, Zod | `src/lib/utils`, `src/lib/services`, `src/hooks`, schematy walidacji w komponentach, proste komponenty UI. |
| **Testy Komponentów** | Testowanie pojedynczych komponentów React w izolacji, weryfikując ich renderowanie, interakcje i zarządzanie stanem. | Vitest, React Testing Library, Storybook | Wszystkie komponenty w `src/components/`, zwłaszcza formularze, modale i elementy interaktywne. |
| **Testy Integracyjne** | Testowanie współpracy kilku modułów. Skupienie na poprawnym przepływie danych między komponentami, hookami a warstwą API. | Vitest, React Testing Library, Mock Service Worker (MSW) | Łączenie komponentów-kontenerów (np. `GroupView`) z hookami danych, testowanie interakcji z zamockowanym API. |
| **Testy End-to-End (E2E)** | Symulacja rzeczywistych scenariuszy użytkownika w prawdziwej przeglądarce. Weryfikacja kompletnych przepływów, od logowania po sprawdzenie wyniku. | Playwright | Krytyczna ścieżka użytkownika (rejestracja, tworzenie grupy, losowanie, wynik), uwierzytelnianie, dostęp z tokenem. |
| **Testy API** | Bezpośrednie testowanie punktów końcowych API w celu weryfikacji logiki backendowej, autoryzacji, walidacji danych wejściowych i formatu odpowiedzi. | Vitest (z `supertest` lub `fetch`), Playwright | Wszystkie endpointy w `src/pages/api/`. |
| **Testy Wizualnej Regresji** | Porównywanie zrzutów ekranu interfejsu użytkownika w celu wykrycia niezamierzonych zmian wizualnych. | Storybook + Chromatic, Playwright | Kluczowe komponenty UI, widok pulpitu, widok grupy, strona główna. |
| **Testy Dostępności (a11y)** | Automatyczne sprawdzanie zgodności ze standardami WCAG w celu zapewnienia, że aplikacja jest użyteczna dla osób z niepełnosprawnościami. | `axe-core` zintegrowane z Playwright i React Testing Library | Wszystkie interaktywne komponenty i kluczowe widoki aplikacji. |

---

## 4. Scenariusze Testowe dla Kluczowych Funkcjonalności

### 4.1. Uwierzytelnianie i Autoryzacja
*   **TC-AUTH-01:** Użytkownik może pomyślnie utworzyć nowe konto przy użyciu prawidłowych danych.
*   **TC-AUTH-02:** System uniemożliwia rejestrację z już istniejącym adresem e-mail.
*   **TC-AUTH-03:** Walidacja formularza rejestracji działa poprawnie (np. wymagania dotyczące hasła).
*   **TC-AUTH-04:** Użytkownik może pomyślnie zalogować się przy użyciu prawidłowych danych.
*   **TC-AUTH-05:** Użytkownik nie może zalogować się przy użyciu nieprawidłowego hasła lub adresu e-mail.
*   **TC-AUTH-06:** Użytkownik może pomyślnie zresetować swoje hasło poprzez link wysłany na e-mail.
*   **TC-AUTH-07:** Niezalogowany użytkownik jest przekierowywany na stronę logowania przy próbie dostępu do chronionych zasobów (np. `/dashboard`).
*   **TC-AUTH-08:** Użytkownik A nie ma dostępu do danych (np. grup) użytkownika B poprzez API.

### 4.2. Zarządzanie Grupą i Uczestnikami
*   **TC-GROUP-01:** Zalogowany użytkownik może utworzyć nową grupę, podając prawidłową nazwę, budżet i przyszłą datę.
*   **TC-GROUP-02:** Twórca grupy może dodać nowego uczestnika z adresem e-mail.
*   **TC-GROUP-03:** Twórca grupy może dodać nowego uczestnika bez adresu e-mail, a system generuje dla niego link dostępowy.
*   **TC-GROUP-04:** Twórca grupy może edytować dane uczestnika przed losowaniem.
*   **TC-GROUP-05:** Twórca grupy może usunąć uczestnika (ale nie samego siebie) przed losowaniem.
*   **TC-GROUP-06:** Twórca grupy może dodać regułę wykluczenia między dwoma różnymi uczestnikami.
*   **TC-GROUP-07:** Twórca grupy nie może dodać reguły wykluczenia, w której uczestnik wyklucza sam siebie.
*   **TC-GROUP-08:** Twórca grupy może usunąć grupę po potwierdzeniu w oknie modalnym.

### 4.3. Proces Losowania i Wyniki
*   **TC-DRAW-01:** Przycisk losowania jest nieaktywny, jeśli w grupie jest mniej niż 3 uczestników.
*   **TC-DRAW-02:** System uniemożliwia losowanie, jeśli zdefiniowane reguły wykluczeń tworzą niemożliwą do rozwiązania pętlę.
*   **TC-DRAW-03:** Pomyślne wykonanie losowania skutkuje przypisaniem każdej osobie jednej osoby, której kupuje prezent.
*   **TC-DRAW-04:** Po losowaniu edycja grupy, uczestników i wykluczeń jest zablokowana.
*   **TC-DRAW-05:** Zalogowany uczestnik grupy może zobaczyć swój wynik (komu kupuje prezent) po "odkryciu" go w interfejsie.
*   **TC-DRAW-06:** Niezarejestrowany uczestnik może zobaczyć swój wynik, korzystając z unikalnego linku z tokenem.
*   **TC-DRAW-07:** Uczestnik A nie może zobaczyć wyniku uczestnika B.
*   **TC-DRAW-08:** Uczestnik może dodać i zaktualizować swoją listę życzeń przed upływem terminu grupy.

---

## 5. Środowisko Testowe
*   **Baza Danych:** Osobna, dedykowana instancja projektu Supabase przeznaczona wyłącznie do celów testowych. Baza danych będzie regularnie czyszczona i wypełniana zestawem danych testowych (seed) przed uruchomieniem testów E2E.
*   **Zmienne Środowiskowe:** Dedykowany plik `.env.test` zawierający klucze API i URL do testowej instancji Supabase.
*   **Przeglądarki:** Testy E2E będą uruchamiane na najnowszych wersjach przeglądarek:
    *   Chromium (dla Chrome i Edge)
    *   Firefox
    *   WebKit (dla Safari)
*   **Systemy Operacyjne:** Testy będą wykonywane lokalnie na maszynach deweloperskich (macOS, Windows, Linux) oraz w środowisku CI (Linux).

---

## 6. Narzędzia do Testowania

| Narzędzie | Zastosowanie |
| :--- | :--- |
| **Vitest** | Framework do uruchamiania testów jednostkowych i integracyjnych. Wybrany ze względu na szybkość i natywną integrację z Vite, używanym przez Astro. |
| **React Testing Library (RTL)** | Biblioteka do testowania komponentów React, promująca dobre praktyki i testowanie z perspektywy użytkownika. |
| **Playwright** | Narzędzie do testów End-to-End, umożliwiające automatyzację interakcji w prawdziwych przeglądarkach. Zapewnia niezawodność dzięki mechanizmom auto-wait. |
| **Mock Service Worker (MSW)** | Biblioteka do mockowania API na poziomie sieci, co pozwala na realistyczne testowanie komponentów i hooków bez potrzeby komunikacji z prawdziwym backendem. |
| **Zod** | Biblioteka do walidacji schematów, używana do testowania logiki walidacji formularzy niezależnie od UI. |
| **Storybook** | Narzędzie do tworzenia izolowanych komponentów UI, ułatwiające testy wizualne i testowanie komponentów w różnych stanach. |
| **Chromatic** | Usługa do automatyzacji testów wizualnej regresji zintegrowana ze Storybookiem. |
| **axe-core** | Silnik do testowania dostępności, integrowany z RTL i Playwright. |

---

## 7. Harmonogram Testów (Przykładowy Sprint 2-tygodniowy)

*   **Tydzień 1, Dzień 1-2:** Konfiguracja środowiska testowego, instalacja i konfiguracja narzędzi (Vitest, Playwright, MSW).
*   **Tydzień 1, Dzień 3-5:** Pisanie testów jednostkowych dla logiki biznesowej (`services`), funkcji pomocniczych (`utils`) i hooków. Równoległe tworzenie Storybooka dla kluczowych komponentów UI.
*   **Tydzień 2, Dzień 1-3:** Pisanie testów integracyjnych i komponentowych dla kluczowych widoków (uwierzytelnianie, zarządzanie grupą).
*   **Tydzień 2, Dzień 4-5:** Pisanie testów E2E dla krytycznych ścieżek użytkownika. Konfiguracja CI do automatycznego uruchamiania testów.
*   **Ciągłe:** Testy regresji i testy nowych funkcjonalności będą pisane równolegle z rozwojem aplikacji w kolejnych sprintach.

---

## 8. Kryteria Akceptacji Testów

### 8.1. Kryteria Wejścia (Rozpoczęcie Testów)
*   Kod nowej funkcjonalności został zintegrowany z główną gałęzią deweloperską.
*   Aplikacja została pomyślnie zbudowana i wdrożona na środowisku testowym.
*   Dostępna jest podstawowa dokumentacja techniczna dla testowanych funkcji.

### 8.2. Kryteria Wyjścia (Zakończenie Testów)
*   **Pokrycie kodu:**
    *   Testy jednostkowe: > 85% dla kluczowej logiki biznesowej.
    *   Testy integracyjne: > 70%.
    *   Ogólne pokrycie projektu: > 80%.
*   **Wyniki testów:** 100% testów E2E dla krytycznej ścieżki użytkownika musi zakończyć się sukcesem.
*   **Status błędów:**
    *   Brak otwartych błędów o priorytecie krytycznym (Blocker) lub wysokim (Critical).
    *   Wszystkie zidentyfikowane błędy zostały zaraportowane i ocenione przez zespół.

---

## 9. Role i Odpowiedzialności

| Rola | Odpowiedzialności |
| :--- | :--- |
| **Deweloper** | - Pisanie testów jednostkowych dla swojego kodu.<br>- Tworzenie testów komponentów i integracyjnych dla nowych funkcjonalności.<br>- Naprawa błędów zgłoszonych przez QA.<br>- Utrzymanie i aktualizacja istniejących testów. |
| **Inżynier QA** | - Projektowanie i utrzymanie planu testów.<br>- Tworzenie i automatyzacja scenariuszy testowych E2E.<br>- Wykonywanie testów eksploracyjnych i manualnych w poszukiwaniu błędów.<br>- Zarządzanie procesem raportowania i śledzenia błędów.<br>- Ostateczna akceptacja jakości produktu. |
| **Product Owner** | - Dostarczanie kryteriów akceptacji dla funkcjonalności.<br>- Priorytetyzacja naprawy błędów. |

---

## 10. Procedury Raportowania Błędów

Wszystkie wykryte błędy będą raportowane w systemie do śledzenia zadań (np. Jira, GitHub Issues). Każdy raport o błędzie musi zawierać następujące informacje:

*   **Tytuł:** Zwięzły i jednoznaczny opis problemu.
*   **Środowisko:** Przeglądarka, system operacyjny, na którym wystąpił błąd.
*   **Kroki do odtworzenia:** Szczegółowa, ponumerowana lista kroków potrzebnych do wywołania błędu.
*   **Obserwowany rezultat:** Co faktycznie się stało.
*   **Oczekiwany rezultat:** Jakie było oczekiwane zachowanie aplikacji.
*   **Priorytet/Waga:** Ocena wpływu błędu na działanie aplikacji (np. Krytyczny, Wysoki, Średni, Niski).
*   **Załączniki:** Zrzuty ekranu, nagrania wideo lub logi z konsoli, które pomogą w diagnozie problemu.

Błędy będą przypisywane do odpowiednich deweloperów, a ich status będzie regularnie aktualizowany aż do zamknięcia.