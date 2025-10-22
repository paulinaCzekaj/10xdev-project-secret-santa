# Scenariusze testowe dla widoku tworzenia grupy

## Przegląd

Ten dokument zawiera szczegółowe scenariusze testowe dla widoku `/groups/new`.

## Warunki wstępne

- Użytkownik musi być zalogowany (lub używany jest DEFAULT_USER_ID w development)
- Endpoint API `POST /api/groups` musi być dostępny

## Scenariusze testowe

### 1. Walidacja formularza po stronie klienta

#### 1.1. Walidacja nazwy grupy

**Test Case 1.1.1: Puste pole nazwy**

- **Kroki:**
  1. Otwórz `/groups/new`
  2. Pozostaw pole "Nazwa grupy" puste
  3. Kliknij "Utwórz grupę"
- **Oczekiwany rezultat:** Wyświetla się błąd "Nazwa grupy musi mieć co najmniej 3 znaki"

**Test Case 1.1.2: Za krótka nazwa (< 3 znaki)**

- **Kroki:**
  1. Wprowadź "AB" w pole "Nazwa grupy"
  2. Kliknij "Utwórz grupę"
- **Oczekiwany rezultat:** Wyświetla się błąd "Nazwa grupy musi mieć co najmniej 3 znaki"

**Test Case 1.1.3: Za długa nazwa (> 50 znaków)**

- **Kroki:**
  1. Wprowadź 51 znaków w pole "Nazwa grupy"
  2. Przejdź do kolejnego pola (blur)
- **Oczekiwany rezultat:**
  - Pole przyjmuje maksymalnie 50 znaków (atrybut maxLength)
  - Wyświetla się błąd "Nazwa grupy nie może przekraczać 50 znaków" (jeśli udało się wprowadzić więcej)

**Test Case 1.1.4: Poprawna nazwa (3-50 znaków)**

- **Kroki:**
  1. Wprowadź "Secret Santa 2025"
  2. Przejdź do kolejnego pola
- **Oczekiwany rezultat:** Brak błędu walidacji

#### 1.2. Walidacja budżetu

**Test Case 1.2.1: Puste pole budżetu**

- **Kroki:**
  1. Pozostaw pole "Budżet" puste
  2. Kliknij "Utwórz grupę"
- **Oczekiwany rezultat:** Wyświetla się błąd "Budżet jest wymagany"

**Test Case 1.2.2: Budżet = 0**

- **Kroki:**
  1. Wprowadź 0 w pole "Budżet"
  2. Kliknij "Utwórz grupę"
- **Oczekiwany rezultat:** Wyświetla się błąd "Budżet musi być większy od 0"

**Test Case 1.2.3: Budżet ujemny**

- **Kroki:**
  1. Wprowadź -50 w pole "Budżet"
  2. Kliknij "Utwórz grupę"
- **Oczekiwany rezultat:** Wyświetla się błąd "Budżet musi być większy od 0"

**Test Case 1.2.4: Budżet niecałkowity (z miejscami dziesiętnymi)**

- **Kroki:**
  1. Wprowadź 50.5 w pole "Budżet"
  2. Kliknij "Utwórz grupę"
- **Oczekiwany rezultat:** Wyświetla się błąd "Budżet musi być liczbą całkowitą"

**Test Case 1.2.5: Poprawny budżet**

- **Kroki:**
  1. Wprowadź 100 w pole "Budżet"
  2. Przejdź do kolejnego pola
- **Oczekiwany rezultat:** Brak błędu walidacji, widoczne "PLN" po prawej stronie pola

#### 1.3. Walidacja daty zakończenia

**Test Case 1.3.1: Brak wybranej daty**

- **Kroki:**
  1. Nie wybieraj żadnej daty
  2. Kliknij "Utwórz grupę"
- **Oczekiwany rezultat:** Wyświetla się błąd "Data zakończenia jest wymagana"

**Test Case 1.3.2: Data w przeszłości**

- **Kroki:**
  1. Otwórz kalendarz
  2. Spróbuj wybrać wczorajszą datę
- **Oczekiwany rezultat:** Daty w przeszłości są wyłączone (disabled) w kalendarzu

**Test Case 1.3.3: Dzisiejsza data**

- **Kroki:**
  1. Otwórz kalendarz
  2. Spróbuj wybrać dzisiejszą datę
- **Oczekiwany rezultat:** Dzisiejsza data jest wyłączona (disabled) w kalendarzu

**Test Case 1.3.4: Poprawna data (jutro lub później)**

- **Kroki:**
  1. Otwórz kalendarz klikając przycisk z ikoną kalendarza
  2. Wybierz datę jutrzejszą lub późniejszą
- **Oczekiwany rezultat:**
  - Data zostaje wybrana
  - Wyświetla się w formacie dd.MM.yyyy
  - Brak błędu walidacji

### 2. Przesyłanie formularza (Submit)

#### 2.1. Pomyślne utworzenie grupy

**Test Case 2.1.1: Poprawne dane**

- **Kroki:**
  1. Wprowadź poprawną nazwę: "Secret Santa 2025"
  2. Wprowadź poprawny budżet: 100
  3. Wybierz jutrzejszą datę
  4. Kliknij "Utwórz grupę"
- **Oczekiwany rezultat:**
  - Przycisk staje się nieaktywny (disabled)
  - Wyświetla się ikona ładowania (spinning loader)
  - Tekst przycisku zmienia się na "Tworzenie..."
  - Po otrzymaniu odpowiedzi z API:
    - Wyświetla się toast sukcesu: "Grupa została utworzona pomyślnie!"
    - Użytkownik jest przekierowywany do `/groups/{id}`

#### 2.2. Obsługa błędów API

**Test Case 2.2.1: Błąd sieciowy (brak połączenia)**

- **Symulacja:** Wyłącz serwer API lub zablokuj połączenie
- **Kroki:**
  1. Wypełnij formularz poprawnymi danymi
  2. Kliknij "Utwórz grupę"
- **Oczekiwany rezultat:**
  - Wyświetla się komunikat błędu w formularzu
  - Wyświetla się toast z błędem
  - Przycisk staje się ponownie aktywny
  - Użytkownik może spróbować ponownie

**Test Case 2.2.2: Błąd walidacji serwera (400)**

- **Symulacja:** Wyślij dane, które przejdą walidację klienta ale nie serwera
- **Kroki:**
  1. Wypełnij formularz
  2. Kliknij "Utwórz grupę"
- **Oczekiwany rezultat:**
  - Wyświetla się komunikat błędu z odpowiedzi API
  - Wyświetla się toast z błędem
  - Przycisk staje się ponownie aktywny

**Test Case 2.2.3: Błąd serwera (500)**

- **Symulacja:** Spowoduj błąd 500 na serwerze (np. problem z bazą danych)
- **Kroki:**
  1. Wypełnij formularz poprawnymi danymi
  2. Kliknij "Utwórz grupę"
- **Oczekiwany rezultat:**
  - Wyświetla się komunikat: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później."
  - Wyświetla się toast z błędem
  - Przycisk staje się ponownie aktywny

### 3. Responsywność i UX

#### 3.1. Responsywność widoku

**Test Case 3.1.1: Widok mobilny (< 640px)**

- **Kroki:**
  1. Zmień rozmiar okna przeglądarki na 375px szerokości
  2. Sprawdź widok
- **Oczekiwany rezultat:**
  - Formularz zajmuje pełną szerokość (z paddingiem)
  - Wszystkie pola są czytelne
  - Przycisk submit jest pełnej szerokości
  - Tekst jest czytelny

**Test Case 3.1.2: Widok tablet (640px - 768px)**

- **Kroki:**
  1. Zmień rozmiar okna na 768px
  2. Sprawdź widok
- **Oczekiwany rezultat:**
  - Layout dostosowuje się płynnie
  - Padding formularza zwiększa się (sm: breakpoint)

**Test Case 3.1.3: Widok desktop (> 768px)**

- **Kroki:**
  1. Zmień rozmiar okna na 1024px+
  2. Sprawdź widok
- **Oczekiwany rezultat:**
  - Formularz ma maksymalną szerokość 2xl (max-w-2xl)
  - Jest wycentrowany na stronie
  - Padding formularza zwiększa się (md: breakpoint)

#### 3.2. Interaktywność

**Test Case 3.2.1: Focus states**

- **Kroki:**
  1. Użyj Tab do nawigacji między polami
- **Oczekiwany rezultat:**
  - Każde pole ma wyraźny focus ring
  - Kolejność tabulacji jest logiczna: Nazwa → Budżet → Data → Przycisk

**Test Case 3.2.2: Kalendarz - otwarcie/zamknięcie**

- **Kroki:**
  1. Kliknij przycisk wyboru daty
  2. Kalendarz się otwiera
  3. Wybierz datę
- **Oczekiwany rezultat:**
  - Kalendarz otwiera się w popover
  - Po wyborze daty kalendarz się zamyka
  - Data wyświetla się w przycisku

**Test Case 3.2.3: Disabled state podczas submit**

- **Kroki:**
  1. Wypełnij formularz
  2. Kliknij "Utwórz grupę"
  3. Spróbuj zmodyfikować pola podczas wysyłania
- **Oczekiwany rezultat:**
  - Wszystkie pola są zablokowane (disabled)
  - Przycisk jest zablokowany
  - Nie można modyfikować danych

### 4. Bezpieczeństwo i autoryzacja

#### 4.1. Ochrona trasy

**Test Case 4.1.1: Dostęp bez sesji (produkcja)**

- **Warunek:** W środowisku produkcyjnym bez DEFAULT_USER_ID
- **Kroki:**
  1. Wyloguj się
  2. Spróbuj otworzyć `/groups/new`
- **Oczekiwany rezultat:**
  - Użytkownik jest przekierowywany do `/login`

**Test Case 4.1.2: Token autoryzacyjny w żądaniu**

- **Kroki:**
  1. Zaloguj się
  2. Wypełnij i wyślij formularz
  3. Sprawdź żądanie w DevTools (Network)
- **Oczekiwany rezultat:**
  - Żądanie POST zawiera nagłówek `Authorization: Bearer {token}`
  - Token pochodzi z sesji Supabase

### 5. Integracja z API

#### 5.1. Format danych

**Test Case 5.1.1: Format CreateGroupCommand**

- **Kroki:**
  1. Wypełnij formularz:
     - Nazwa: "Test Group"
     - Budżet: 50
     - Data: 25.12.2025
  2. Sprawdź payload w DevTools
- **Oczekiwany rezultat:**
  - Payload JSON:
    ```json
    {
      "name": "Test Group",
      "budget": 50,
      "end_date": "2025-12-25T00:00:00.000Z" // ISO 8601 format
    }
    ```

**Test Case 5.1.2: Parsowanie odpowiedzi GroupDTO**

- **Kroki:**
  1. Wyślij formularz
  2. Sprawdź odpowiedź w DevTools
- **Oczekiwany rezultat:**
  - Odpowiedź zawiera wszystkie pola GroupDTO
  - Formularz używa `result.id` do przekierowania

## Scenariusze brzegowe (Edge Cases)

### E1. Bardzo długa nazwa (testowanie maxLength)

- Wprowadź 100 znaków w pole nazwy
- **Rezultat:** Pole przyjmuje tylko 50 znaków

### E2. Specjalne znaki w nazwie

- Wprowadź: "Group <script>alert('xss')</script>"
- **Rezultat:** Nazwa jest akceptowana, ale powinna być escapowana przez API

### E3. Bardzo duża liczba w budżecie

- Wprowadź: 999999999999
- **Rezultat:** Walidacja powinna przejść (jeśli jest liczbą całkowitą dodatnią)

### E4. Szybkie wielokrotne kliknięcie submit

- Kliknij "Utwórz grupę" wielokrotnie bardzo szybko
- **Rezultat:** Tylko jedno żądanie jest wysyłane (przycisk jest disabled po pierwszym kliknięciu)

### E5. Nawigacja wstecz podczas wysyłania

- Rozpocznij wysyłanie formularza
- Kliknij wstecz w przeglądarce
- **Rezultat:** Żądanie może zostać anulowane, ale nie powinno to spowodować błędów

## Checklist testowy

- [ ] Wszystkie pola wymagane są walidowane
- [ ] Walidacja min/max działa poprawnie
- [ ] Kalendarz blokuje nieprawidłowe daty
- [ ] Toast notifications działają (sukces i błąd)
- [ ] Loading state jest wyświetlany podczas submit
- [ ] Przekierowanie działa po sukcesie
- [ ] Błędy API są poprawnie wyświetlane
- [ ] Formularz jest responsywny na wszystkich urządzeniach
- [ ] Focus states są wyraźne i dostępne
- [ ] Token autoryzacyjny jest wysyłany w żądaniu
- [ ] Format danych jest zgodny z CreateGroupCommand
- [ ] Ochrona trasy działa (redirect dla niezalogowanych)

## Instrukcje uruchomienia testów manualnych

1. Uruchom serwer deweloperski:

   ```bash
   npm run dev
   ```

2. Otwórz przeglądarkę i przejdź do:

   ```
   http://localhost:4321/groups/new
   ```

3. Otwórz DevTools (F12):
   - Zakładka "Console" - sprawdzanie błędów
   - Zakładka "Network" - sprawdzanie żądań API
   - Zakładka "Application" > "Storage" - sprawdzanie sesji

4. Przejdź przez wszystkie scenariusze testowe

5. Dla testów responsywności:
   - Użyj Device Toolbar w DevTools (Ctrl+Shift+M)
   - Testuj różne rozmiary: Mobile S (320px), Mobile M (375px), Tablet (768px), Desktop (1024px)

## Znane ograniczenia

1. W trybie development używany jest DEFAULT_USER_ID zamiast prawdziwej sesji
2. Toast notifications mogą wymagać konfiguracji dark mode theme
3. Przekierowanie do `/groups/{id}` wymaga implementacji tego widoku
4. Nieużywany import DayButton w calendar.tsx (ostrzeżenie podczas build)
