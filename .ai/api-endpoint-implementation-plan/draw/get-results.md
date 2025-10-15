# API Endpoint Implementation Plan: Get Draw Result

## 1. Przegląd punktu końcowego

Ten plan implementacji opisuje dwa powiązane endpointy REST API służące do pobierania wyników losowania Secret Santa:

1. **GET /api/groups/:groupId/result** - dla uwierzytelnionych użytkowników
2. **GET /api/results/:token** - dla niezarejestrowanych uczestników korzystających z tokenu dostępu

Oba endpointy zwracają informacje o wyniku losowania dla konkretnego uczestnika, zawierające szczegóły grupy, dane uczestnika, informacje o osobie wylosowanej oraz listy życzeń.

## 2. Szczegóły żądania

### GET /api/groups/:groupId/result (Authenticated)
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/groups/:groupId/result`
  - `groupId`: Liczba całkowita dodatnia identyfikująca grupę
- **Parametry**:
  - **Wymagane**: `groupId` (path parameter)
  - **Opcjonalne**: Brak
- **Nagłówki**:
  - `Authorization: Bearer {access_token}` - wymagany dla uwierzytelnienia
  - `Content-Type: application/json` - niejawnie ustawiany
- **Treść żądania**: Brak (GET request)

### GET /api/results/:token (Token-based)
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/results/:token`
  - `token`: Ciąg znaków reprezentujący token dostępu uczestnika
- **Parametry**:
  - **Wymagane**: `token` (path parameter)
  - **Opcjonalne**: Brak
- **Nagłówki**: Brak specjalnych wymagań
- **Treść żądania**: Brak (GET request)

## 3. Wykorzystywane typy

### Główne typy DTO
- `DrawResultResponseDTO` - główny typ odpowiedzi:
```typescript
interface DrawResultResponseDTO {
  group: ResultGroupInfo;
  participant: ResultParticipantInfo;
  assigned_to: ResultAssignedParticipant;
  my_wishlist: ResultMyWishlist;
}
```

### Typy pomocnicze
- `ResultGroupInfo` - minimalne informacje o grupie
- `ResultParticipantInfo` - informacje o uczestniku
- `ResultAssignedParticipant` - informacje o wylosowanej osobie z wishlistą
- `ResultMyWishlist` - informacje o własnej liście życzeń uczestnika

### Typy błędów
- `ApiErrorResponse` - standardowy format błędów API

## 4. Szczegóły odpowiedzi

### Pomyślna odpowiedź (200)
```json
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
    "wishlist": "I would love a book about cooking or a new kitchen gadget.\nhttps://example.com/wishlist"
  },
  "my_wishlist": {
    "content": "I like tech gadgets and board games.",
    "can_edit": true
  }
}
```

### Odpowiedzi błędów
- **400 Bad Request**: Losowanie nie zostało jeszcze zakończone
```json
{
  "error": {
    "code": "DRAW_NOT_COMPLETED",
    "message": "Draw has not been completed yet for this group"
  }
}
```

- **401 Unauthorized**: Brak autoryzacji (tylko dla authenticated endpoint)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

- **403 Forbidden**: Użytkownik nie jest uczestnikiem grupy
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not a participant in this group"
  }
}
```

- **404 Not Found**: Grupa nie istnieje lub nieprawidłowy token
```json
{
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "Group not found"
  }
}
```

## 5. Przepływ danych

### GET /api/groups/:groupId/result (Authenticated Flow)
1. **Walidacja parametrów**: Sprawdzenie poprawności `groupId`
2. **Uwierzytelnienie**: Weryfikacja tokenu JWT z nagłówka Authorization
3. **Autoryzacja**: Sprawdzenie czy użytkownik jest uczestnikiem grupy
4. **Sprawdzenie statusu losowania**: Weryfikacja czy losowanie zostało wykonane
5. **Pobranie danych**:
   - Informacje o grupie
   - Dane uczestnika na podstawie `user_id`
   - Przypisanie dla uczestnika z tabeli assignments
   - Dane wylosowanej osoby
   - Lista życzeń wylosowanej osoby
   - Własna lista życzeń uczestnika
6. **Formatowanie odpowiedzi**: Przygotowanie DrawResultResponseDTO
7. **Trackowanie dostępu**: Aktualizacja `result_viewed_at` dla uczestnika

### GET /api/results/:token (Token Flow)
1. **Walidacja parametrów**: Sprawdzenie poprawności tokenu
2. **Weryfikacja tokenu**: Znajdowanie uczestnika na podstawie `access_token`
3. **Sprawdzenie statusu losowania**: Weryfikacja czy losowanie zostało wykonane
4. **Pobranie danych**: Analogicznie do authenticated flow, ale na podstawie tokenu
5. **Formatowanie odpowiedzi**: Przygotowanie DrawResultResponseDTO
6. **Trackowanie dostępu**: Aktualizacja `result_viewed_at` dla uczestnika

### Kluczowe operacje bazodanowe
- **Sprawdzenie statusu losowania**: `SELECT id FROM assignments WHERE group_id = ? LIMIT 1`
- **Znajdowanie uczestnika**: 
  - Authenticated: `SELECT * FROM participants WHERE group_id = ? AND user_id = ?`
  - Token: `SELECT * FROM participants WHERE access_token = ?`
- **Pobranie przypisania**: `SELECT * FROM assignments WHERE group_id = ? AND giver_participant_id = ?`
- **Pobranie danych wylosowanej osoby**: JOIN między participants i assignments
- **Pobranie wishlist**: `SELECT * FROM wishes WHERE participant_id = ?`

## 6. Względy bezpieczeństwa

### Uwierzytelnienie i autoryzacja
- **Authenticated endpoint**: Wymaga prawidłowego JWT tokenu w nagłówku Authorization
- **Token endpoint**: Nie wymaga uwierzytelnienia, ale sprawdza ważność tokenu dostępu
- **Walidacja dostępu**: Użytkownik może zobaczyć tylko własne wyniki losowania

### Ochrona danych
- **Token bezpieczeństwa**: Access tokeny są generowane losowo i przechowywane zahashowane w bazie
- **Zakres dostępu**: Uczestnik może zobaczyć tylko informacje o jednej osobie (tej którą wylosował)
- **Czas życia**: Brak specjalnych ograniczeń czasowych dla dostępu do wyników

### Potencjalne zagrożenia
- **Brute force na tokeny**: Tokeny są wystarczająco długie i losowe
- **Nieautoryzowany dostęp**: Ścisła walidacja przynależności do grupy
- **Timing attacks**: Brak wrażliwych operacji wymagających ochrony przed timing attacks

## 7. Obsługa błędów

### Strategia obsługi błędów
- **Walidacja wczesna**: Wszystkie sprawdzenia wykonywane na początku funkcji
- **Precyzyjne komunikaty błędów**: Szczegółowe informacje o przyczynie błędu
- **Logowanie**: Wszystkie błędy logowane z kontekstem dla debugowania
- **Bezpieczne odpowiedzi**: Brak wycieku wrażliwych informacji w komunikatach błędów

### Scenariusze błędów i odpowiedzi

| Scenariusz | Kod HTTP | Kod błędu | Opis |
|------------|----------|-----------|------|
| Nieprawidłowy groupId | 400 | INVALID_INPUT | groupId nie jest liczbą dodatnią |
| Nieprawidłowy token format | 400 | INVALID_INPUT | Token nie spełnia wymagań formatu |
| Brak autoryzacji | 401 | UNAUTHORIZED | Brak lub nieprawidłowy JWT token |
| Użytkownik nie w grupie | 403 | FORBIDDEN | Użytkownik nie jest uczestnikiem grupy |
| Grupa nie istnieje | 404 | GROUP_NOT_FOUND | groupId nie odpowiada istniejącej grupie |
| Nieprawidłowy token dostępu | 404 | INVALID_TOKEN | Token nie istnieje w bazie danych |
| Losowanie nie wykonane | 400 | DRAW_NOT_COMPLETED | Brak assignments dla grupy |
| Błąd bazy danych | 500 | INTERNAL_ERROR | Nieoczekiwany błąd operacji bazodanowej |

## 8. Wydajność

### Optymalizacje zapytań
- **Indeksy**: Wykorzystanie istniejących indeksów na `group_id`, `user_id`, `access_token`
- **JOIN optymalization**: Minimalizacja liczby zapytań przez efektywne JOINs
- **Buforowanie**: Brak specjalnego buforowania (wyniki losowania są statyczne)

### Potencjalne wąskie gardła
- **Concurrent access**: Wielu uczestników jednocześnie sprawdzających wyniki
- **Duże grupy**: JOINs między participants, assignments i wishes dla dużych grup
- **Wishlist content**: Długie teksty wishlist mogą wpływać na rozmiar odpowiedzi

### Metryki wydajności
- **Response time**: < 500ms dla typowych przypadków
- **Database queries**: Maksymalnie 4-5 zapytań na żądanie
- **Memory usage**: Minimalne zużycie pamięci (głównie obiekty DTO)

## 9. Kroki implementacji

### Krok 1: Tworzenie ResultsService
- Utworzyć `src/lib/services/results.service.ts`
- Zaimplementować metodę `getAuthenticatedUserResult(groupId, userId)`
- Zaimplementować metodę `getTokenBasedResult(token)`
- Dodać prywatne metody pomocnicze dla wspólnej logiki

### Krok 2: Implementacja endpointu uwierzytelnionego
- Utworzyć `src/pages/api/groups/[groupId]/result.ts`
- Zaimplementować walidację parametrów i autoryzację
- Dodać obsługę błędów zgodnie ze specyfikacją
- Zintegrować z ResultsService

### Krok 3: Implementacja endpointu tokenowego
- Utworzyć `src/pages/api/results/[token]/index.ts`
- Zaimplementować walidację tokenu
- Dodać obsługę błędów zgodnie ze specyfikacją
- Zintegrować z ResultsService

### Krok 4: Dodanie trackowania dostępu
- Rozszerzyć istniejący ParticipantService o metodę aktualizacji `result_viewed_at`
- Zintegrować trackowanie w obu endpointach
- Zapewnić atomowość operacji

### Krok 5: Testowanie
- **Unit tests**: Testy dla ResultsService
- **Integration tests**: Testy endpointów z różnymi scenariuszami
- **Error scenarios**: Testy wszystkich przypadków błędów
- **Performance tests**: Testy obciążeniowe dla dużych grup

### Krok 6: Dokumentacja i deployment
- Zaktualizować API documentation
- Dodać przykłady użycia w Postman collection
- Wdrożyć na środowisko testowe
- Przeprowadzić acceptance testing

## 10. Wymagania niefunkcjonalne

### Dostępność
- **Uptime**: 99.9% dostępności
- **Response time**: < 1s dla 95% żądań
- **Error rate**: < 0.1% błędów

### Bezpieczeństwo
- **Encryption**: Wszystkie dane wrażliwe szyfrowane w tranzycie i spoczynku
- **Access control**: Ścisła kontrola dostępu na poziomie użytkownika/tokenu
- **Audit logging**: Wszystkie dostępy logowane dla celów audytu

### Skalowalność
- **Concurrent users**: Obsługa 1000+ równoczesnych użytkowników
- **Database load**: Efektywne zapytania minimalizujące obciążenie bazy
- **Caching strategy**: Brak potrzeby buforowania (statyczne dane losowania)
