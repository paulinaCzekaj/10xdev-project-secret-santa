# API Endpoint Implementation Plan: List Exclusion Rules

## 1. Przegląd punktu końcowego
Endpoint `GET /api/groups/:groupId/exclusions` zwraca wszystkie reguły wykluczeń dla określonej grupy Secret Santa. Endpoint wymaga autoryzacji i sprawdza, czy użytkownik jest członkiem grupy. Zwraca rozszerzone informacje o regułach wykluczeń zawierające nazwy zarówno blokującego, jak i blokowanego uczestnika.

## 2. Szczegóły żądania
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/groups/:groupId/exclusions`
- **Parametry**:
  - **Wymagane**:
    - `groupId` (path parameter): identyfikator grupy jako liczba całkowita
    - `Authorization` header: `Bearer {access_token}`
  - **Opcjonalne**: brak (choć struktura pozwala na przyszłą paginację)
- **Request Body**: nie dotyczy (GET endpoint)

## 3. Wykorzystywane typy
- **Response Type**: `PaginatedExclusionRulesDTO` (choć aktualnie bez paginacji)
- **DTO Types**:
  - `ExclusionRuleListItemDTO` - rozszerzony DTO z nazwami uczestników
  - `ExclusionRuleDTO` - bazowy typ z bazy danych
- **Command Types**: nie dotyczy (GET endpoint)
- **Query Types**: `PaginationQuery` (dla potencjalnej przyszłej paginacji)

## 4. Szczegóły odpowiedzi
- **Success Response (200)**:
```json
{
  "data": [
    {
      "id": 1,
      "group_id": 1,
      "blocker_participant_id": 1,
      "blocker_name": "John Doe",
      "blocked_participant_id": 2,
      "blocked_name": "Jane Smith",
      "created_at": "2025-10-09T10:00:00Z"
    }
  ]
}
```
- **Error Responses**:
  - `401 Unauthorized`: brak lub nieprawidłowy token autoryzacji
  - `403 Forbidden`: użytkownik nie jest członkiem grupy
  - `404 Not Found`: grupa nie istnieje
  - `500 Internal Server Error`: błąd serwera

## 5. Przepływ danych
1. **Walidacja wejścia**: sprawdzenie formatu `groupId` i obecności Authorization header
2. **Autentyfikacja**: weryfikacja Bearer token przez Supabase Auth
3. **Autoryzacja**: sprawdzenie czy użytkownik należy do grupy (uczestnik lub twórca)
4. **Pobieranie danych**:
   - Wywołanie `exclusion-rule.service.getExclusionRulesForGroup()`
   - JOIN między `exclusion_rules` i `participants` dla pobrania nazw
   - Mapowanie wyników na `ExclusionRuleListItemDTO[]`
5. **Formatowanie odpowiedzi**: zwrot danych w standardowym formacie API

## 6. Względy bezpieczeństwa
- **Autentyfikacja**: Bearer token weryfikowany przez Supabase Auth
- **Autoryzacja**: sprawdzenie przynależności użytkownika do grupy przez sprawdzenie czy jest uczestnikiem lub twórcą
- **Walidacja wejścia**: `groupId` walidowany jako bezpieczna liczba całkowita
- **SQL Injection Protection**: używanie parameterized queries przez Supabase client
- **Information Disclosure**: brak dostępu do danych grup, do których użytkownik nie należy
- **Rate Limiting**: rozważenie implementacji na poziomie aplikacji dla wrażliwych endpointów

## 7. Obsługa błędów
- **400 Bad Request**: nieprawidłowy format `groupId` (nie liczba)
- **401 Unauthorized**:
  - Brak Authorization header
  - Malformed Bearer token
  - Nieprawidłowy/expired token
- **403 Forbidden**: użytkownik nie jest członkiem grupy (ani uczestnikiem, ani twórcą)
- **404 Not Found**: grupa o podanym ID nie istnieje
- **500 Internal Server Error**: błędy bazy danych, niespodziewane wyjątki
- **Logowanie**: wszystkie błędy bezpieczeństwa (401, 403) logowane dla audytu

## 8. Rozważania dotyczące wydajności
- **Database Query**: pojedynczy JOIN query między `exclusion_rules` i `participants`
- **Indexing**: wykorzystanie istniejących indeksów na `group_id` w `exclusion_rules`
- **Response Size**: endpoint może zwracać wszystkie reguły wykluczeń dla grupy (potencjalnie duże dla dużych grup)
- **Caching**: rozważenie cache'owania wyników jeśli endpoint często wywoływany
- **Connection Pooling**: wykorzystanie connection pooling Supabase

## 9. Etapy wdrożenia

### Faza 1: Przygotowanie infrastruktury
1. Sprawdzenie istniejącego `exclusion-rule.service.ts`
2. Upewnienie się dostępności wymaganych typów w `types.ts`
3. Przygotowanie struktury pliku endpoint: `src/pages/api/groups/[groupId]/exclusions.ts`

### Faza 2: Implementacja walidacji i autoryzacji
1. Implementacja Zod schema dla path parameters
2. Dodanie middleware autoryzacji dla Bearer token
3. Implementacja sprawdzenia przynależności do grupy
4. Dodanie obsługi błędów autoryzacji (401, 403, 404)

### Faza 3: Implementacja logiki biznesowej
1. Rozszerzenie `exclusion-rule.service.ts` o metodę `getExclusionRulesForGroup()`
2. Implementacja SQL query z JOIN na participants
3. Mapowanie wyników na `ExclusionRuleListItemDTO[]`
4. Dodanie obsługi błędów bazy danych

### Faza 4: Dokumentacja i deployment
1. Aktualizacja API documentation
2. Dodanie curl examples w `curl-examples.md`
3. Code review i security audit
4. Deployment i monitoring w produkcji
