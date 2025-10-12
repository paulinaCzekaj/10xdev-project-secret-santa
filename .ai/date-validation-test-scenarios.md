# Scenariusze testowe walidacji dat - Formularz tworzenia loterii

## Przegląd
Ten dokument zawiera scenariusze testowe do weryfikacji walidacji dat w formularzu tworzenia loterii.

**Data utworzenia:** 2025-10-12  
**Status:** READY FOR TESTING

---

## ✅ Zaimplementowane mechanizmy walidacji

### 1. Walidacja UI (DatePicker - linie 193-198)
```typescript
minDate = jutro (dzisiejsza data + 1 dzień, godzina 00:00:00)
```

### 2. Walidacja Zod Schema (linie 33-40)
```typescript
.refine((date) => date > today, { message: "Data zakończenia musi być w przyszłości" })
```

---

## 🧪 Scenariusze testowe

### Scenariusz 1: ✅ Otwarcie kalendarza
**Cel:** Sprawdzić czy kalendarz otwiera się po kliknięciu  
**Status:** ✅ POTWIERDZONY PRZEZ UŻYTKOWNIKA

**Kroki:**
1. Przejdź do `/groups/new`
2. Kliknij pole "Data losowania"

**Oczekiwany wynik:**
- Kalendarz otwiera się w Popover
- Widoczne są wszystkie dni bieżącego miesiąca

**Rzeczywisty wynik:** ✅ Działa poprawnie

---

### Scenariusz 2: 🔬 Daty z przeszłości są disabled
**Cel:** Sprawdzić czy daty wcześniejsze niż jutro są nieaktywne  
**Status:** ⏳ DO PRZETESTOWANIA

**Kroki:**
1. Otwórz kalendarz (kliknij pole "Data losowania")
2. Sprawdź wizualnie dni:
   - Wczorajsza data
   - Dzisiejsza data
   - Jutrzejsza data

**Oczekiwany wynik:**
- Wczoraj: **disabled** (szary, niedostępny do kliknięcia)
- Dzisiaj: **disabled** (szary, niedostępny do kliknięcia)
- Jutro i dalej: **aktywne** (czarny tekst, można kliknąć)

**Wskaźniki wizualne:**
- Disabled dni mają klasę CSS: `text-muted-foreground opacity-50`
- Aktywne dni są w normalnym kolorze

---

### Scenariusz 3: 🔬 Wybór jutrzejszej daty
**Cel:** Sprawdzić czy można wybrać jutrzejszą datę (minimalna dopuszczalna)  
**Status:** ⏳ DO PRZETESTOWANIA

**Kroki:**
1. Otwórz kalendarz
2. Kliknij na jutrzejszą datę

**Oczekiwany wynik:**
- Data zostaje wybrana
- Kalendarz zamyka się automatycznie
- W polu wyświetla się data w formacie `dd.MM.yyyy`
- Brak komunikatu błędu walidacji
- Przycisk "Utwórz loterię" pozostaje aktywny (jeśli inne pola są wypełnione)

---

### Scenariusz 4: 🔬 Wybór daty za tydzień
**Cel:** Sprawdzić czy można wybrać datę dalej w przyszłości  
**Status:** ⏳ DO PRZETESTOWANIA

**Kroki:**
1. Otwórz kalendarz
2. Kliknij na datę za 7 dni od dzisiaj

**Oczekiwany wynik:**
- Data zostaje wybrana
- Kalendarz zamyka się automatycznie
- W polu wyświetla się data w formacie `dd.MM.yyyy`
- Brak komunikatu błędu walidacji
- Przycisk "Utwórz loterię" pozostaje aktywny (jeśli inne pola są wypełnione)

---

### Scenariusz 5: 🔬 Próba kliknięcia daty z przeszłości
**Cel:** Sprawdzić co się dzieje przy próbie kliknięcia disabled daty  
**Status:** ⏳ DO PRZETESTOWANIA

**Kroki:**
1. Otwórz kalendarz
2. Spróbuj kliknąć na wczorajszą lub dzisiejszą datę

**Oczekiwany wynik:**
- Kliknięcie nie ma efektu (dni są disabled)
- Kalendarz pozostaje otwarty
- Nie można wybrać tej daty
- Brak błędów w konsoli przeglądarki

---

### Scenariusz 6: 🔬 Walidacja w czasie rzeczywistym
**Cel:** Sprawdzić czy walidacja Zod działa poprawnie  
**Status:** ⏳ DO PRZETESTOWANIA

**Kroki:**
1. Wypełnij pole "Nazwa loterii" (np. "Test")
2. Wypełnij pole "Limit budżetu" (np. 100)
3. NIE wybieraj daty
4. Sprawdź przycisk "Utwórz loterię"
5. Wybierz jutrzejszą datę
6. Sprawdź przycisk ponownie

**Oczekiwany wynik:**
- Krok 4: Przycisk **disabled** (brak daty)
- Krok 6: Przycisk **aktywny** (wszystkie pola wypełnione poprawnie)
- Brak komunikatu błędu pod polem daty (bo data jest w przyszłości)

---

### Scenariusz 7: 🔬 Komunikat błędu Zod (edge case)
**Cel:** Sprawdzić czy komunikat błędu Zod się wyświetla (teoretyczny, bo UI blokuje)  
**Status:** ⏳ DO PRZETESTOWANIA (wymaga dev tools)

**Kroki:**
1. Otwórz dev tools (F12)
2. W konsoli wykonaj:
   ```javascript
   // Symulacja wyboru dzisiejszej daty (minięcie UI validation)
   const dateInput = document.querySelector('[name="end_date"]');
   // ... (trudne do wykonania bez ręcznej manipulacji React state)
   ```

**Oczekiwany wynik:**
- W normalnym użytkowaniu: **nie powinno być możliwe** (UI blokuje)
- Jeśli jakoś uda się wybrać dzisiejszą datę: komunikat "Data zakończenia musi być w przyszłości"

**Uwaga:** Ten scenariusz jest teoretyczny. UI validation (minDate) powinno skutecznie blokować nieprawidłowe wybory.

---

### Scenariusz 8: 🔬 Format wyświetlanej daty
**Cel:** Sprawdzić czy data wyświetla się w polskim formacie  
**Status:** ⏳ DO PRZETESTOWANIA

**Kroki:**
1. Otwórz kalendarz
2. Wybierz datę 25 grudnia 2025
3. Sprawdź tekst w polu "Data losowania"

**Oczekiwany wynik:**
- Format: `25.12.2025` (dd.MM.yyyy)
- Locale: polski (pl)
- Separator: kropka (.)

---

### Scenariusz 9: 🔬 Zmiana miesiąca w kalendarzu
**Cel:** Sprawdzić czy nawigacja między miesiącami działa  
**Status:** ⏳ DO PRZETESTOWANIA

**Kroki:**
1. Otwórz kalendarz
2. Kliknij strzałkę "następny miesiąc" (>)
3. Sprawdź disabled dni w następnym miesiącu

**Oczekiwany wynik:**
- Kalendarz przechodzi do następnego miesiąca
- W następnym miesiącu wszystkie dni są aktywne (bo wszystkie są w przyszłości)
- Nawigacja działa płynnie

---

### Scenariusz 10: 🔬 Submit formularza z poprawną datą
**Cel:** Sprawdzić end-to-end flow z walidacją daty  
**Status:** ⏳ DO PRZETESTOWANIA

**Kroki:**
1. Wypełnij wszystkie pola:
   - Nazwa: "Testowa Loteria"
   - Budżet: 150
   - Data: jutro (np. 13.10.2025)
2. Kliknij "Utwórz loterię"
3. Sprawdź request w Network tab (F12)

**Oczekiwany wynik:**
- Formularz wysyła request do `/api/groups`
- Data w request body jest w formacie ISO 8601: `2025-10-13T00:00:00.000Z`
- Request przechodzi pomyślnie (status 201)
- Toast notification: "Loteria została utworzona pomyślnie!"
- Przekierowanie do `/groups/{id}/manage`

---

## 📋 Checklist do weryfikacji

### UI Validation (DatePicker)
- [ ] Kalendarz otwiera się po kliknięciu
- [ ] Wczorajsza data jest disabled
- [ ] Dzisiejsza data jest disabled
- [ ] Jutrzejsza data jest aktywna
- [ ] Można wybrać daty w przyszłości
- [ ] Format wyświetlania: dd.MM.yyyy
- [ ] Kalendarz zamyka się po wyborze daty

### Zod Validation
- [ ] Walidacja działa w czasie rzeczywistym (onChange)
- [ ] Komunikat błędu: "Data zakończenia musi być w przyszłości"
- [ ] Przycisk submit disabled gdy brak daty
- [ ] Przycisk submit aktywny gdy data poprawna
- [ ] Walidacja sprawdza date > today (nie date >= today)

### Integration
- [ ] Data transformuje się do ISO 8601 przy submit
- [ ] API przyjmuje datę bez błędu
- [ ] Grupa tworzy się w bazie z poprawną datą
- [ ] Brak błędów w konsoli przeglądarki

---

## 🔧 Implementacja techniczna

### minDate calculation (CreateGroupForm.tsx)
```typescript
minDate={(() => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);  // +1 dzień
  tomorrow.setHours(0, 0, 0, 0);             // Zerowanie czasu
  return tomorrow;
})()}
```

### disabled dates logic (date-picker.tsx)
```typescript
disabled={(date) => {
  if (minDate) {
    return date < minDate;  // Disable jeśli data < jutro
  }
  return false;
}}
```

### Zod validation (CreateGroupForm.tsx)
```typescript
.refine(
  (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;  // Data musi być większa niż dzisiaj
  },
  { message: "Data zakończenia musi być w przyszłości" }
)
```

---

## 🐛 Potencjalne problemy do sprawdzenia

### Problem 1: Timezone
**Opis:** Czy walidacja działa poprawnie w różnych strefach czasowych?  
**Test:** Zmień timezone systemowy i przetestuj walidację

### Problem 2: Granica północy
**Opis:** Co się dzieje tuż przed i po północy?  
**Test:** Testować o 23:59 i 00:01

### Problem 3: Zmiana daty systemowej
**Opis:** Czy minDate aktualizuje się dynamicznie?  
**Test:** Otworzyć formularz, zmienić datę systemową, sprawdzić czy minDate się zmienił

---

## ✅ Status ogólny

| Kategoria | Status |
|-----------|--------|
| Implementacja UI | ✅ ZAIMPLEMENTOWANE |
| Implementacja Zod | ✅ ZAIMPLEMENTOWANE |
| Testowanie UI | ⏳ DO PRZETESTOWANIA |
| Testowanie Zod | ⏳ DO PRZETESTOWANIA |
| Testowanie Integration | ⏳ DO PRZETESTOWANIA |

**Następny krok:** Testy manualne przez użytkownika zgodnie z scenariuszami powyżej.

---

**Data utworzenia:** 2025-10-12  
**Autor:** Claude (Cursor AI)  
**Wersja:** 1.0

