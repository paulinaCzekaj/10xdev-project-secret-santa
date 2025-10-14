# Postman Collection - Secret Santa API

## 📦 Import kolekcji

1. Otwórz Postmana
2. Kliknij **Import** w lewym górnym rogu
3. Wybierz plik `Secret-Santa-API.postman_collection.json`
4. Kliknij **Import**

## 🔧 Konfiguracja zmiennych

Po zaimportowaniu kolekcji, skonfiguruj następujące zmienne środowiskowe:

### Zmienne kolekcji (Collection Variables):
- `base_url` - domyślnie: `http://localhost:4321`
- `group_id` - ID grupy (ustaw po utworzeniu grupy)
- `participant_id` - ID uczestnika (ustaw po dodaniu uczestnika)
- `access_token` - token dostępu uczestnika (ustaw po dodaniu uczestnika)

## 🚀 Workflow testowania

### 1. Przygotowanie środowiska
```bash
# Uruchom serwer deweloperski
npm run dev
```

### 2. Testowanie autentyfikacji
1. **Register User** - utwórz konto testowe
2. **Login User** - zaloguj się (zachowaj cookies!)
3. **Reset Password** - testuj reset hasła (opcjonalnie)

### 3. Zarządzanie grupami
1. **Create Group** - utwórz nową grupę Secret Santa
   - Skopiuj zwrócony `id` i ustaw jako `group_id`
2. **List Groups** - sprawdź swoje grupy
3. **Get Group Details** - szczegóły wybranej grupy

### 4. Zarządzanie uczestnikami
1. **Add Participant** - dodaj uczestników do grupy
   - Skopiuj zwrócony `id` uczestnika jako `participant_id`
2. **List Group Participants** - sprawdź listę uczestników
3. **Update Participant** - edytuj dane uczestnika (opcjonalnie)
4. **Delete Participant** - usuń uczestnika (opcjonalnie)

### 5. Reguły wykluczeń
1. **Add Exclusion Rule** - dodaj reguły kto nie może komu dać prezentu
2. **List Group Exclusions** - sprawdź reguły wykluczeń

### 6. Losowanie
1. **Execute Secret Santa Draw** - wykonaj losowanie (wymaga min. 3 uczestników)

### 7. Wyniki losowania
1. **Get Draw Result (Authenticated)** - pobierz wynik losowania dla zalogowanego użytkownika
   - Wymaga autoryzacji i przynależności do grupy
   - Losowanie musi być zakończone
2. **Get Draw Result (Token-based)** - pobierz wynik losowania używając tokenu dostępu
   - Nie wymaga autoryzacji - używa tokenu uczestnika
   - Losowanie musi być zakończone
   - Ustaw `access_token` po dodaniu uczestnika

## ⚠️ Ważne uwagi

### Cookies i sesja
- Większość endpointów wymaga autentyfikacji
- Postman automatycznie zarządza cookies po zalogowaniu
- Jeśli stracisz sesję, zaloguj się ponownie

### Zmienne środowiskowe
- Ustaw `group_id` po utworzeniu grupy
- Ustaw `participant_id` po dodaniu uczestnika
- Możesz też używać zmiennych środowiskowych zamiast kolekcji

### Błędy i statusy
- `200` - Sukces
- `201` - Utworzono
- `204` - Brak zawartości (DELETE)
- `400` - Błędne dane
- `401` - Brak autoryzacji
- `403` - Brak dostępu
- `404` - Nie znaleziono
- `422` - Nieprzetwarzalne dane
- `500` - Błąd serwera

## 📝 Przykładowy scenariusz testowy

```bash
# 1. Rejestracja i logowanie
POST /api/auth/register
POST /api/auth/login

# 2. Tworzenie grupy
POST /api/groups

# 3. Dodawanie uczestników (powtórz 3 razy)
POST /api/groups/{group_id}/participants

# 4. Dodawanie wykluczeń (opcjonalnie)
POST /api/groups/{group_id}/exclusions

# 5. Losowanie
POST /api/groups/{group_id}/draw

# 6. Sprawdzanie wyników
GET /api/groups/{group_id}

# 7. Pobieranie wyników losowania
GET /api/groups/{group_id}/result          # Dla zalogowanych użytkowników
GET /api/results/{access_token}            # Dla niezarejestrowanych uczestników
```

## 🔄 Testowanie błędów

Dla każdego endpointu dostępne są również przypadki błędne:
- Puste dane
- Nieprawidłowe formaty
- Nieistniejące zasoby
- Brak autoryzacji

## 🛠️ Rozszerzone testowanie

### Testy automatyczne
Możesz dodać testy w Postman Scripts dla automatycznego sprawdzania odpowiedzi:

```javascript
// Example test script
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
});
```

### Zmienne środowiskowe
Utwórz środowisko w Postman z zmiennymi:
- `base_url` = `http://localhost:4321`
- `group_id` = (ustaw dynamicznie)
- `participant_id` = (ustaw dynamicznie)
- `access_token` = (ustaw dynamicznie po dodaniu uczestnika)

### Runner i monitorowanie
- Użyj **Collection Runner** do wykonania całej kolekcji
- Skonfiguruj **Monitory** dla automatycznych testów

## 📞 Wsparcie

Jeśli masz problemy z API:
1. Sprawdź czy serwer działa (`npm run dev`)
2. Zweryfikuj zmienne środowiskowe
3. Sprawdź cookies/sesję
4. Przejrzyj logi serwera w terminalu
