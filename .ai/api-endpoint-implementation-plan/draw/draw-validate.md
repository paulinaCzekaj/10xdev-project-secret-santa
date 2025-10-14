# API Endpoint Implementation Plan: Validate Draw

## 1. Przegląd punktu końcowego
Endpoint `POST /api/groups/:groupId/draw/validate` przeprowadza walidację możliwości wykonania losowania Secret Santa dla danej grupy. Jest to operacja "dry run" - sprawdza czy obecne wykluczenia między uczestnikami pozwalają na utworzenie poprawnego przyporządkowania (każdy uczestnik dostaje dokładnie jednego odbiorcę, uwzględniając wykluczenia), ale nie wykonuje faktycznego losowania. Endpoint zwraca informacje o statusie walidacji, liczbie uczestników i wykluczeń wraz z komunikatem wyjaśniającym wynik.

## 2. Szczegóły żądania
- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/groups/:groupId/draw/validate`
- **Parametry**:
  - **Wymagane**: 
    - `groupId` (path parameter): ID grupy jako liczba całkowita
  - **Opcjonalne**: brak
- **Request Body**: Brak (pusta treść)
- **Headers**:
  - `Authorization: Bearer {access_token}` (wymagany)
  - `Content-Type: application/json` (opcjonalny, ale zalecany)

## 3. Wykorzystywane typy
- **DrawValidationDTO**: Główny typ odpowiedzi zawierający:
  - `valid`: boolean - czy losowanie jest możliwe
  - `participants_count`: number - liczba uczestników
  - `exclusions_count`: number - liczba wykluczeń
  - `message`: string - komunikat o wyniku walidacji
  - `details?`: string - dodatkowe szczegóły (tylko gdy valid = false)

- **GroupDTO**: Do weryfikacji istnienia grupy i praw dostępu
- **ParticipantDTO[]**: Lista uczestników grupy do analizy
- **ExclusionRuleDTO[]**: Lista wykluczeń do sprawdzenia możliwości losowania

## 4. Szczegóły odpowiedzi
- **Success Response (200)**:
```json
{
  "valid": true,
  "participants_count": 5,
  "exclusions_count": 2,
  "message": "Draw can be executed successfully"
}
```

- **Error Responses**:
  - **400 Bad Request** (losowanie niemożliwe):
```json
{
  "valid": false,
  "participants_count": 5,
  "exclusions_count": 10,
  "message": "Draw is impossible with current exclusion rules",
  "details": "Too many exclusions create an impossible scenario"
}
```
  - **401 Unauthorized**: Brak/brakujący/nieprawidłowy token autoryzacji
  - **403 Forbidden**: Użytkownik nie jest twórcą grupy
  - **404 Not Found**: Grupa o podanym ID nie istnieje
  - **500 Internal Server Error**: Błąd serwera (problemy z bazą danych)

## 5. Przepływ danych
1. **Walidacja parametrów**: Sprawdzenie poprawności `groupId` (czy jest liczbą)
2. **Autoryzacja**: Weryfikacja tokena JWT z Supabase Auth
3. **Pobranie danych grupy**: Zapytanie do tabeli `groups` w celu sprawdzenia istnienia grupy
4. **Sprawdzenie uprawnień**: Weryfikacja czy zalogowany użytkownik jest twórcą grupy (`groups.creator_id`)
5. **Pobranie uczestników**: Zapytanie do tabeli `participants` dla danej grupy
6. **Pobranie wykluczeń**: Zapytanie do tabeli `exclusion_rules` dla danej grupy
7. **Walidacja losowania**: Algorytm sprawdzający czy wykluczenia pozwalają na poprawne przyporządkowanie
8. **Przygotowanie odpowiedzi**: Formatowanie danych zgodnie z `DrawValidationDTO`

## 6. Względy bezpieczeństwa
- **Autoryzacja**: Wymagany ważny JWT token w headerze Authorization
- **Autoryzacja**: Tylko twórca grupy może przeprowadzić walidację (sprawdzenie `groups.creator_id`)
- **Walidacja parametrów**: `groupId` musi być prawidłową liczbą całkowitą
- **SQL Injection Protection**: Używanie prepared statements przez Supabase client
- **Dostęp do danych**: Użytkownicy mogą sprawdzać tylko własne grupy
- **Rate Limiting**: Brak specjalnych ograniczeń, ale monitorować obciążenie

## 7. Obsługa błędów
- **401 Unauthorized**: 
  - Przyczyna: Brak tokena, nieprawidłowy token, token wygasł
  - Obsługa: Zwrócenie standardowej odpowiedzi błędu bez dodatkowych szczegółów
  
- **403 Forbidden**:
  - Przyczyna: Użytkownik nie jest twórcą grupy
  - Obsługa: Zwrócenie błędu z komunikatem "Only group creator can validate draw"
  
- **404 Not Found**:
  - Przyczyna: Grupa o podanym ID nie istnieje
  - Obsługa: Zwrócenie błędu z komunikatem "Group not found"
  
- **400 Bad Request**:
  - Przyczyna: Losowanie niemożliwe z powodu wykluczeń
  - Obsługa: Zwrócenie szczegółów problemu w polu `details`
  
- **500 Internal Server Error**:
  - Przyczyna: Problemy z bazą danych, błędy połączenia
  - Obsługa: Zalogowanie błędu, zwrot ogólnego komunikatu błędu

## 8. Rozważania dotyczące wydajności
- **Złożoność algorytmu**: Sprawdzanie możliwości losowania może być kosztowne przy dużej liczbie uczestników (problem przyporządkowania z wykluczeniami)
- **Optymalizacja zapytań**: Użycie pojedynczych zapytań z JOIN do pobrania wszystkich danych na raz
- **Cache**: Brak potrzeby cache'owania (walidacja wykonywana rzadko)
- **Timeout**: Ustawić rozsądny timeout dla złożonych obliczeń (np. 30 sekund)
- **Monitorowanie**: Logować czasy wykonania dla identyfikacji wąskich gardeł

## 9. Etapy wdrożenia

### Etap 1: Przygotowanie infrastruktury
1. Utworzyć plik `src/pages/api/groups/[groupId]/draw/validate.ts`
2. Dodać podstawową strukturę endpointu z obsługą błędów
3. Skonfigurować middleware autoryzacji

### Etap 2: Implementacja walidacji parametrów
1. Dodać walidację `groupId` jako liczby całkowitej
2. Zaimplementować sprawdzenie istnienia grupy
3. Dodać weryfikację uprawnień twórcy grupy

### Etap 3: Implementacja logiki biznesowej
1. Utworzyć `src/lib/services/draw.service.ts`
2. Zaimplementować funkcję `validateDrawPossibility()`
3. Dodać algorytm sprawdzania możliwości losowania

### Etap 4: Integracja z bazą danych
1. Dodać zapytania do pobrania uczestników grupy
2. Dodać zapytania do pobrania wykluczeń grupy
3. Zaimplementować optymalizację zapytań (JOIN)

### Etap 6: Dokumentacja i deployment
1. Zaktualizować dokumentację API
2. Dodać przykłady użycia w Postman collection
3. Przeprowadzić code review
4. Wdrożyć na środowisko testowe
