# API Endpoint Implementation Plan: Get and Delete Wishlist

## 1. Przegląd punktu końcowego

Ten plan implementacji dotyczy dwóch endpointów API dla zarządzania wishlistami uczestników w aplikacji Secret Santa:

- **GET /api/participants/:participantId/wishlist**: Pobiera wishlist uczestnika z automatycznym renderowaniem HTML i informacją o możliwości edycji
- **DELETE /api/participants/:participantId/wishlist**: Usuwa wishlist uczestnika z blokadą po upływie daty zakończenia grupy

Oba endpointy wspierają dwa mechanizmy autoryzacji: Bearer token dla zarejestrowanych użytkowników oraz participant token dla niezarejestrowanych użytkowników.

## 2. Szczegóły żądania

### GET /api/participants/:participantId/wishlist

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/participants/:participantId/wishlist`
- **Parametry**:
  - **Wymagane**: `participantId` (number, path parameter) - ID uczestnika
  - **Opcjonalne**: `token` (string, query parameter) - token dostępu dla niezarejestrowanych użytkowników
- **Request Body**: Brak
- **Headers**:
  - `Authorization: Bearer {access_token}` (dla zarejestrowanych użytkowników) LUB
  - `?token={participant_token}` (dla niezarejestrowanych użytkowników)

### DELETE /api/participants/:participantId/wishlist

- **Metoda HTTP**: DELETE
- **Struktura URL**: `/api/participants/:participantId/wishlist`
- **Parametry**:
  - **Wymagane**: `participantId` (number, path parameter) - ID uczestnika
  - **Opcjonalne**: `token` (string, query parameter) - token dostępu dla niezarejestrowanych użytkowników
- **Request Body**: Brak
- **Headers**:
  - `Authorization: Bearer {access_token}` (dla zarejestrowanych użytkowników) LUB
  - `?token={participant_token}` (dla niezarejestrowanych użytkowników)

## 3. Wykorzystywane typy

### Request/Response Types

```typescript
// Response dla GET
interface WishlistWithHtmlDTO extends WishlistDTO {
  wishlist_html: string; // HTML z automatycznie linkowanymi URL-ami
  can_edit: boolean; // Czy użytkownik może edytować wishlist
}

// Error Response
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### Validation Schemas

```typescript
// Path parameter validation
const ParticipantIdParamSchema = z.object({
  participantId: z.coerce.number().int().positive(),
});

// Query parameter validation
const ParticipantTokenQuerySchema = z.object({
  token: z.string().optional(),
});
```

## 4. Szczegóły odpowiedzi

### GET Success Response (200)

```json
{
  "id": 1,
  "participant_id": 1,
  "wishlist": "I would love:\n- A new book\n- Kitchen gadgets\nhttps://example.com/my-wishlist",
  "wishlist_html": "I would love:<br>- A new book<br>- Kitchen gadgets<br><a href='https://example.com/my-wishlist'>https://example.com/my-wishlist</a>",
  "updated_at": "2025-10-09T10:00:00Z",
  "can_edit": true
}
```

### DELETE Success Response (204)

No content - tylko status code 204

### Error Responses

- **401 Unauthorized**: `{"error": {"code": "UNAUTHORIZED", "message": "Authentication required"}}`
- **403 Forbidden**: `{"error": {"code": "FORBIDDEN", "message": "You do not have permission to access this wishlist"}}`
- **404 Not Found**: `{"error": {"code": "NOT_FOUND", "message": "Participant or wishlist not found"}}`
- **400 Bad Request** (DELETE only): `{"error": {"code": "END_DATE_PASSED", "message": "Cannot delete wishlist after group end date has passed"}}`
- **500 Internal Server Error**: `{"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}}`

## 5. Przepływ danych

### GET Flow

1. **Walidacja parametrów**: Sprawdź `participantId` i opcjonalny `token`
2. **Autoryzacja**: Próba Bearer token, fallback do participant token
3. **Pobranie danych**: Query do `participants` z join do `groups` dla walidacji
4. **Sprawdzenie dostępu**: Walidacja czy użytkownik jest właścicielem wishlist
5. **Pobranie wishlist**: Query do tabeli `wishes`
6. **Renderowanie HTML**: Automatyczne linkowanie URL-i w treści wishlist
7. **Określenie can_edit**: Sprawdzenie czy `group.end_date` nie minęła
8. **Response**: Zwróć `WishlistWithHtmlDTO`

### DELETE Flow

1. **Walidacja parametrów**: Sprawdź `participantId` i opcjonalny `token`
2. **Autoryzacja**: Próba Bearer token, fallback do participant token
3. **Pobranie danych**: Query do `participants` z join do `groups`
4. **Sprawdzenie dostępu**: Walidacja właściciela wishlist
5. **Walidacja end_date**: Sprawdź czy `group.end_date` nie minęła
6. **Usunięcie**: DELETE z tabeli `wishes`
7. **Response**: 204 No Content

### Database Queries

```sql
-- Pobranie uczestnika z informacjami o grupie
SELECT p.*, g.id, g.end_date, g.creator_id
FROM participants p
JOIN groups g ON p.group_id = g.id
WHERE p.id = $1

-- Pobranie wishlist
SELECT * FROM wishes WHERE participant_id = $1

-- Usunięcie wishlist
DELETE FROM wishes WHERE participant_id = $1
```

## 6. Względy bezpieczeństwa

### Authentication & Authorization

- **Dwa mechanizmy autoryzacji**: Bearer token (zarejestrowani) i participant token (niezarejestrowani)
- **Weryfikacja właściciela**: Tylko właściciel może zobaczyć/usunąć swoją wishlist
- **Token validation**: Participant token musi dokładnie odpowiadać przechowywanemu w bazie

### Input Validation

- **Path parameters**: `participantId` musi być dodatnią liczbą całkowitą
- **Query parameters**: `token` opcjonalny, ale wymagany gdy brak Bearer token
- **SQL Injection protection**: Użycie prepared statements przez Supabase ORM

### Business Logic Security

- **Time-based restrictions**: DELETE zablokowany po `end_date` grupy
- **Access isolation**: Uczestnicy mogą tylko zarządzać swoimi wishlistami
- **Audit logging**: Wszystkie operacje logowane z kontekstem autoryzacji

### Additional Security Measures

- **Error handling**: Nie ujawniać wrażliwych informacji w error messages
- **Rate limiting**: Rozważyć implementację na poziomie aplikacji
- **CORS**: Zapewnić odpowiednie CORS headers dla API

## 7. Obsługa błędów

### Error Categories & Handling Strategy

#### Authentication Errors (401)

```typescript
// Brak autoryzacji
{
  error: {
    code: "UNAUTHORIZED",
    message: "Authentication required (Bearer token or participant token)"
  }
}
```

#### Authorization Errors (403)

```typescript
// Brak uprawnień
{
  error: {
    code: "FORBIDDEN",
    message: "You do not have permission to access this wishlist"
  }
}
```

#### Not Found Errors (404)

```typescript
// Uczestnik nie istnieje
{
  error: {
    code: "NOT_FOUND",
    message: "Participant not found"
  }
}

// Wishlist nie istnieje (GET only)
{
  error: {
    code: "NOT_FOUND",
    message: "Wishlist not found"
  }
}
```

#### Business Logic Errors (400)

```typescript
// DELETE po end_date
{
  error: {
    code: "END_DATE_PASSED",
    message: "Cannot delete wishlist after group end date has passed"
  }
}
```

#### System Errors (500)

```typescript
// Błędy bazy danych itp.
{
  error: {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred"
  }
}
```

### Error Handling Strategy

- **Early returns**: Obsługa błędów na początku funkcji
- **Specific error codes**: Różne kody dla różnych typów błędów
- **Logging**: Szczegółowe logowanie błędów z kontekstem
- **User-friendly messages**: Nie ujawniać wrażliwych danych w odpowiedziach

## 8. Rozważania dotyczące wydajności

### Database Optimization

- **Indexes**: Wykorzystanie istniejących indeksów na `participants(id)` i `wishes(participant_id)`
- **Single queries**: Minimalizacja liczby zapytań do bazy
- **Connection pooling**: Wykorzystanie connection pooling Supabase

### Caching Strategy

- **No caching for GET**: Wishlist może być często aktualizowana
- **Cache-Control headers**: `"no-cache, no-store, must-revalidate"` dla wrażliwych danych

### Response Size Optimization

- **Efficient data transfer**: Tylko niezbędne pola w odpowiedzi
- **HTML rendering**: Lekkie przetwarzanie po stronie serwera vs. po stronie klienta

### Monitoring & Metrics

- **Response times**: Monitorować czasy odpowiedzi endpointów
- **Error rates**: Śledzić rate błędów autoryzacji i systemu
- **Database performance**: Monitorować wydajność zapytań

## 9. Etapy wdrożenia

### Faza 1: Przygotowanie Service Layer

1. **Rozszerz WishlistService** o metody:

   ```typescript
   async getWishlist(participantId: number, authUserId: UserId | null, participantToken: string | null): Promise<WishlistWithHtmlDTO>
   async deleteWishlist(participantId: number, authUserId: UserId | null, participantToken: string | null): Promise<void>
   ```

2. **Implementuj HTML rendering**:
   - Funkcja do automatycznego linkowania URL-i
   - Escape HTML dla bezpieczeństwa

3. **Dodaj helper do sprawdzania can_edit**:
   - Porównanie aktualnego czasu z `group.end_date`

### Faza 2: Implementacja GET Endpoint

1. **Dodaj GET handler** w `/api/participants/[participantId]/wishlist/index.ts`
2. **Implementuj walidację**:
   - Path parameters
   - Authentication (Bearer + participant token)
3. **Business logic**:
   - Pobranie participant + group info
   - Walidacja dostępu
   - Pobranie wishlist z HTML rendering
4. **Response handling**: 200 z WishlistWithHtmlDTO lub błędy

### Faza 3: Implementacja DELETE Endpoint

1. **Dodaj DELETE handler** w tym samym pliku
2. **Implementuj walidację** (podobna do GET)
3. **Business logic**:
   - Pobranie participant + group info
   - Walidacja dostępu
   - Sprawdzenie end_date (blokada po terminie)
   - Usunięcie wishlist
4. **Response handling**: 204 No Content lub błędy

### Faza 5: Dokumentacja i Deployment

1. **Aktualizuj Postman collection** z nowymi endpointami
2. **Dodaj JSDoc comments** do wszystkich metod
3. **Update API documentation** w README
4. **Deploy i monitoring** w środowisku produkcyjnym

### Checklist przed deploymentem

- [ ] Wszystkie metody w WishlistService zaimplementowane
- [ ] GET i DELETE handlers dodane i przetestowane
- [ ] Error handling kompletne
- [ ] Security measures zaimplementowane
- [ ] Dokumentacja zaktualizowana
- [ ] Postman collection zawiera nowe requesty
