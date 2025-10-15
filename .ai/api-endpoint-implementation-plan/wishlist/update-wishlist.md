# API Endpoint Implementation Plan: Update Participant Wishlist

## 1. Przegląd punktu końcowego

Ten endpoint pozwala uczestnikom Secret Santa na tworzenie lub aktualizację swojej listy życzeń (wishlist). Obsługuje zarówno zarejestrowanych użytkowników (autoryzacja przez Bearer token) jak i niezarejestrowanych (autoryzacja przez participant token w query parameter). Endpoint blokuje edycję wishlist po zakończeniu terminu grupy (end_date).

## 2. Szczegóły żądania

- **Metoda HTTP**: `PUT`
- **Ścieżka URL**: `/api/participants/:participantId/wishlist`
- **Parametry ścieżki**:
  - `participantId` (wymagany): ID uczestnika, musi być dodatnią liczbą całkowitą
- **Parametry zapytania**:
  - `token` (opcjonalny): Token dostępu dla niezarejestrowanych użytkowników (alternatywa dla Bearer token)
- **Nagłówki**:
  - `Authorization: Bearer {access_token}` (dla zarejestrowanych użytkowników)
  - `Content-Type: application/json`
- **Treść żądania**:
```json
{
  "wishlist": "string - zawartość listy życzeń, może zawierać URL i formatowanie tekstowe"
}
```

## 3. Wykorzystywane typy

**Command Models:**
- `CreateOrUpdateWishlistCommand`: `{ wishlist: string }`

**DTO Types:**
- `WishlistDTO`: `{ id: number, participant_id: number, wishlist: string, updated_at: string }`

**Query Parameter Types:**
- `ParticipantTokenQuery`: `{ token?: string }`

## 4. Szczegóły odpowiedzi

**Sukces (200 OK):**
```json
{
  "id": 1,
  "participant_id": 1,
  "wishlist": "I would love:\n- A new book\n- Kitchen gadgets\nhttps://example.com/my-wishlist",
  "updated_at": "2025-10-09T10:00:00Z"
}
```

**Błędy:**
- `400 Bad Request`: Data zakończenia grupy minęła lub nieprawidłowe dane wejściowe
- `401 Unauthorized`: Brak prawidłowej autoryzacji
- `403 Forbidden`: Próba edycji cudzej listy życzeń
- `404 Not Found`: Uczestnik nie istnieje
- `422 Unprocessable Entity`: Brak wymaganego pola wishlist

## 5. Przepływ danych

1. **Walidacja parametrów**: Sprawdź poprawność `participantId`
2. **Autoryzacja**: 
   - Dla zarejestrowanych: sprawdź Bearer token
   - Dla niezarejestrowanych: sprawdź participant token z query
3. **Pobierz dane uczestnika**: Pobierz uczestnika wraz z informacjami o grupie
4. **Walidacja dostępu**: Sprawdź czy użytkownik/token ma prawo do edycji tej wishlist
5. **Walidacja terminu**: Sprawdź czy end_date grupy nie minęła
6. **Walidacja danych**: Sprawdź poprawność pola wishlist
7. **Aktualizacja w bazie**: Utwórz lub zaktualizuj rekord w tabeli `wishes`
8. **Odpowiedź**: Zwróć zaktualizowane dane wishlist

## 6. Względy bezpieczeństwa

- **Autoryzacja dwupoziomowa**: Bearer token dla zarejestrowanych, participant token dla niezarejestrowanych
- **Walidacja własności**: Tylko właściciel może edytować swoją wishlist
- **Czasowa blokada**: Edycja niemożliwa po end_date grupy
- **Walidacja danych wejściowych**: Ochrona przed SQL injection i XSS
- **Logowanie dostępu**: Rejestrowanie wszystkich prób dostępu do wishlist
- **Token validation**: Bezpieczna walidacja participant tokenów

## 7. Obsługa błędów

**Walidacja parametrów:**
- `participantId` nie jest liczbą dodatnią → `400 INVALID_INPUT`

**Autoryzacja:**
- Brak tokenu (Bearer lub participant) → `401 UNAUTHORIZED`
- Nieprawidłowy Bearer token → `401 UNAUTHORIZED`
- Nieprawidłowy participant token → `401 UNAUTHORIZED`

**Walidacja dostępu:**
- Uczestnik nie istnieje → `404 NOT_FOUND`
- Użytkownik próbuje edytować cudzą wishlist → `403 FORBIDDEN`
- Token nie odpowiada uczestnikowi → `403 FORBIDDEN`

**Walidacja biznesowa:**
- End date grupy minęła → `400 END_DATE_PASSED`
- Brak pola wishlist → `422 MISSING_REQUIRED_FIELD`

**Błędy systemu:**
- Błąd bazy danych → `500 INTERNAL_ERROR`
- Nieoczekiwany błąd → `500 INTERNAL_ERROR`

## 8. Rozważania dotyczące wydajności

- **Optymalizacja zapytań**: Jedno zapytanie JOIN do pobrania participant + group info
- **Caching**: Brak cache'owania wrażliwych danych wishlist
- **Indeksy**: Wykorzystanie istniejących indeksów na `participant_id` w tabeli `wishes`
- **Transakcje**: UPSERT operacja dla atomowości create/update

## 9. Etapy wdrożenia

### Etap 1: Utworzenie WishlistService
1. Stwórz `src/lib/services/wishlist.service.ts`
2. Zaimplementuj metodę `createOrUpdateWishlist()`
3. Zaimplementuj metodę `validateWishlistAccess()`
4. Dodaj metody pomocnicze dla walidacji

### Etap 2: Utworzenie endpointu API
1. Stwórz `src/pages/api/participants/[participantId]/wishlist.ts`
2. Zaimplementuj schematy Zod dla walidacji
3. Dodaj obsługę obu metod autoryzacji
4. Zaimplementuj wszystkie guard clauses
5. Dodaj obsługę błędów i logowanie

<!-- ### Etap 3: Testowanie i walidacja
1. Testy jednostkowe dla WishlistService
2. Testy integracyjne endpointu
3. Testy bezpieczeństwa (autoryzacja, walidacja dostępu)
4. Testy przypadków błędnych (end date passed, etc.) -->

### Etap 4: Dokumentacja i deployment
1. Zaktualizuj dokumentację API
2. Dodaj przykłady użycia w Postman collection
3. Deploy i monitoring w produkcji
