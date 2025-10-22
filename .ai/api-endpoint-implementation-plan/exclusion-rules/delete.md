# API Endpoint Implementation Plan: Delete Exclusion Rule

## 1. Przegląd punktu końcowego

Endpoint `DELETE /api/exclusions/:id` umożliwia usunięcie reguły wykluczenia w Secret Santa tylko przed przeprowadzeniem losowania. Operacja jest dostępna wyłącznie dla twórcy grupy i ma na celu zapobieganie konfliktom w relacjach między uczestnikami (np. wykluczenie małżonków).

### Cel biznesowy

- Zapewnienie możliwości korekty reguł wykluczenia przed losowaniem
- Ochrona integralności procesu losowania poprzez blokadę zmian po jego zakończeniu
- Ograniczenie dostępu do operacji wyłącznie twórcom grup

### Ograniczenia

- Reguła może być usunięta tylko przed wykonaniem losowania
- Operacja wymaga autoryzacji i uprawnień twórcy grupy
- Brak możliwości przywrócenia usuniętej reguły

## 2. Szczegóły żądania

- **Metoda HTTP**: `DELETE`
- **Struktura URL**: `/api/exclusions/:id`
- **Parametry ścieżki**:
  - `id` (wymagany): ID reguły wykluczenia (liczba całkowita dodatnia)
- **Nagłówki**:
  - `Authorization: Bearer {access_token}` (wymagany): Token dostępu Supabase
  - `Content-Type`: `application/json` (standardowe dla API)
- **Treść żądania**: Brak (DELETE nie wymaga body)

### Walidacja parametrów

- ID reguły wykluczenia musi być liczbą całkowitą dodatnią
- Token dostępu musi być prawidłowy i nie wygasły
- Użytkownik musi istnieć w systemie Supabase Auth

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`

- `ExclusionRuleDTO`: Reprezentuje dane reguły wykluczenia z bazy danych
- `ApiErrorResponse`: Standardowa struktura odpowiedzi błędu
- `UserId`: Alias dla typu ID użytkownika Supabase

### Nowe typy (jeśli potrzebne)

Brak - endpoint DELETE nie wymaga dodatkowych typów DTO czy komend.

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu

- **Kod statusu**: `204 No Content`
- **Treść**: Brak (standard dla operacji DELETE)
- **Nagłówki**: Standardowe nagłówki CORS i cache control

### Odpowiedzi błędów

- **400 Bad Request**: Losowanie już zakończone

  ```json
  {
    "error": {
      "code": "DRAW_COMPLETED",
      "message": "Cannot delete exclusion rules after draw has been completed"
    }
  }
  ```

- **401 Unauthorized**: Brak autoryzacji

  ```json
  {
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Authentication required"
    }
  }
  ```

- **403 Forbidden**: Brak uprawnień (nie twórca grupy)

  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "Only the group creator can delete exclusion rules"
    }
  }
  ```

- **404 Not Found**: Reguła wykluczenia nie istnieje

  ```json
  {
    "error": {
      "code": "EXCLUSION_RULE_NOT_FOUND",
      "message": "Exclusion rule not found"
    }
  }
  ```

- **500 Internal Server Error**: Błąd serwera
  ```json
  {
    "error": {
      "code": "DATABASE_ERROR",
      "message": "Failed to delete exclusion rule. Please try again later."
    }
  }
  ```

## 5. Przepływ danych

```
1. Żądanie DELETE /api/exclusions/:id
2. Walidacja parametru :id (Zod schema)
3. Autentyfikacja użytkownika (requireApiAuth)
4. Pobranie danych reguły wykluczenia wraz z grupą
5. Walidacja istnienia reguły (404 jeśli nie istnieje)
6. Sprawdzenie uprawnień twórcy grupy (403 jeśli nie twórca)
7. Sprawdzenie statusu losowania (400 jeśli zakończone)
8. Usunięcie reguły z bazy danych
9. Odpowiedź 204 No Content
```

### Interakcje z bazą danych

1. **Pobranie danych reguły**: JOIN z tabelami `exclusion_rules` i `groups`
2. **Sprawdzenie losowania**: Zapytanie do tabeli `assignments` dla grupy
3. **Usunięcie rekordu**: DELETE z tabeli `exclusion_rules`

### Zewnętrzne zależności

- **Supabase Auth**: Weryfikacja tokena dostępu
- **Supabase Database**: Operacje CRUD na tabelach
- Brak zewnętrznych API czy usług

## 6. Względy bezpieczeństwa

### Autentyfikacja i autoryzacja

- **Bearer Token Authentication**: Wymagany prawidłowy token Supabase
- **Authorization**: Wyłącznie twórca grupy może usuwać reguły wykluczenia
- **Session Validation**: Token musi być aktywny i nie wygasły

### Ochrona przed atakami

- **SQL Injection**: Zapobieganie przez Supabase ORM i parametryzowane zapytania
- **Authorization Bypass**: Dwupoziomowa weryfikacja (autentyfikacja + autoryzacja)
- **Race Conditions**: Atomowe operacje bazodanowe
- **Timing Attacks**: Stały czas odpowiedzi dla błędów autoryzacji

### Walidacja danych

- **Input Sanitization**: Walidacja parametrów przez Zod schemas
- **Type Safety**: TypeScript zapewnia bezpieczeństwo typów
- **Business Logic Validation**: Sprawdzenie wszystkich warunków biznesowych

## 7. Obsługa błędów

### Strategia obsługi błędów

- **Warstwowa obsługa**: Błędy łapane na poziomie endpointu, service i bazy danych
- **Standaryzowane odpowiedzi**: Wszystkie błędy zwracają `ApiErrorResponse`
- **Logowanie błędów**: Szczegółowe logi dla debugowania i monitoringu
- **User-friendly messages**: Komunikaty błędów zrozumiałe dla użytkownika

### Potencjalne scenariusze błędów

| Scenariusz           | Warunek                                  | Kod | Komunikat                                                     |
| -------------------- | ---------------------------------------- | --- | ------------------------------------------------------------- |
| Brak tokena          | `!user`                                  | 401 | "Authentication required"                                     |
| Token nieprawidłowy  | Token expired/invalid                    | 401 | "Authentication required"                                     |
| Nieprawidłowe ID     | `id` nie jest liczbą                     | 400 | "Exclusion rule ID must be a positive integer"                |
| Reguła nie istnieje  | Brak rekordu w DB                        | 404 | "Exclusion rule not found"                                    |
| Brak uprawnień       | `user.id !== group.creator_id`           | 403 | "Only the group creator can delete exclusion rules"           |
| Losowanie zakończone | Istnieją assignments                     | 400 | "Cannot delete exclusion rules after draw has been completed" |
| Błąd bazy danych     | Connection/query failure                 | 500 | "Failed to delete exclusion rule. Please try again later."    |
| Concurrent deletion  | Rekord usunięty przez innego użytkownika | 404 | "Exclusion rule not found"                                    |

### Logowanie błędów

- **Info logs**: Pomyślne operacje i ważne kroki walidacji
- **Error logs**: Wszystkie nieoczekiwane błędy z pełnym kontekstem
- **Security logs**: Próby nieautoryzowanego dostępu
- **Performance logs**: Czasy wykonania operacji

## 8. Rozważania dotyczące wydajności

### Optymalizacja zapytań

- **Single query approach**: Pobranie danych reguły i grupy w jednym zapytaniu z JOIN
- **Efficient existence checks**: Użycie `maybeSingle()` zamiast `single()` gdzie to możliwe
- **Minimal data transfer**: Pobieranie tylko niezbędnych pól (`id`, `group_id`, `creator_id`)

### Wydajność bazy danych

- **Index usage**: Wykorzystanie istniejących indeksów na `exclusion_rules.id` i `groups.creator_id`
- **Connection pooling**: Zarządzanie połączeniami przez Supabase
- **Query optimization**: Unikanie N+1 queries przez odpowiednie JOINs

### Cache considerations

- **No caching**: Operacja DELETE nie powinna być cachowana
- **Cache invalidation**: Wymagane unieważnienie cache grup po usunięciu reguły
- **Headers**: `Cache-Control: no-cache, no-store, must-revalidate`

### Metryki wydajności

- **Response time**: Cel < 200ms dla typowych operacji
- **Database query time**: Monitoring czasów wykonania zapytań
- **Error rate**: Śledzenie procentu błędnych odpowiedzi

## 9. Etapy wdrożenia

### Etap 1: Przygotowanie service layer

1. Dodać metodę `deleteExclusionRule()` do `ExclusionRuleService`
2. Zaimplementować walidację istnienia reguły
3. Dodać sprawdzenie uprawnień twórcy grupy
4. Zaimplementować kontrolę statusu losowania
5. Dodać operację usunięcia rekordu

### Etap 2: Implementacja endpointu API

1. Utworzyć plik `/api/exclusions/[id].ts`
2. Zaimplementować schemat walidacji Zod dla parametru ID
3. Dodać obsługę metody DELETE
4. Zaimplementować flow autentyfikacji i autoryzacji
5. Dodać wywołanie service i obsługę odpowiedzi
6. Zaimplementować kompleksową obsługę błędów

### Etap 4: Dokumentacja i deployment

1. Zaktualizować API documentation (Postman collection)
2. Dodać JSDoc comments do nowej metody
3. Zaktualizować README jeśli potrzebne
4. Wdrożyć na środowisku testowym
5. Przeprowadzić acceptance testing

### Akceptacyjne kryteria sukcesu

- [ ] Endpoint poprawnie usuwa reguły wykluczenia
- [ ] Tylko twórca grupy może usuwać reguły
- [ ] Nie można usuwać po zakończeniu losowania
- [ ] Wszystkie błędy zwracają odpowiednie kody statusu
- [ ] Operacja jest bezpieczna i wydajna
- [ ] Dokumentacja jest aktualna
