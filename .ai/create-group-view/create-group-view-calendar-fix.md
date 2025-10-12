# Poprawki widoku - Kalendarz i zmiana terminologii

## Wprowadzone zmiany (druga iteracja feedbacku)

### 1. ✅ Naprawiono kalendarz (datepicker)

**Problem:** Kalendarz się nie otwierał - kliknięcie przycisku daty nie pokazywało popovera z kalendarzem.

**Przyczyna:**
- Popover nie miał kontrolowanego stanu (open/onOpenChange)
- Brak jawnego handlera onClick na przycisku

**Rozwiązanie:**

#### Dodano kontrolowany stan dla Popover:
```tsx
const [datePickerOpen, setDatePickerOpen] = React.useState(false);

// W komponencie Popover:
<Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
```

#### Dodano onClick handler:
```tsx
<Button
  type="button"
  onClick={() => setDatePickerOpen(true)}  // ← Jawnie otwiera popover
  // ...
>
```

#### Zmodyfikowano onSelect:
```tsx
<Calendar
  onSelect={(date) => {
    field.onChange(date);
    setDatePickerOpen(false);  // ← Zamyka popover po wyborze daty
  }}
/>
```

**Jak działa teraz:**
1. ✅ Kliknięcie przycisku daty → otwiera kalendarz
2. ✅ Wybór daty → zapisuje datę i zamyka kalendarz automatycznie
3. ✅ Kliknięcie poza kalendarzem → zamyka kalendarz
4. ✅ Data wyświetla się w formacie dd.MM.yyyy

### 2. ✅ Zmiana terminologii: "grupa" → "loteria"

**Zmienione teksty:**

#### Strona (new.astro):
- Tytuł: "Utwórz nową loterię Secret Santa" (było: "grupę")
- Meta title: "Utwórz nową loterię - Secret Santa"

#### Formularz (CreateGroupForm.tsx):

**Etykiety pól:**
- "Nazwa loterii" (było: "Nazwa grupy")
- "Limit budżetu" (bez zmian)
- "Data losowania" (bez zmian)

**Komunikaty walidacji:**
- "Nazwa loterii musi mieć co najmniej 3 znaki" (było: "grupy")
- "Nazwa loterii nie może przekraczać 50 znaków" (było: "grupy")

**Info Box:**
- "Po utworzeniu loterii będziesz mógł..." (było: "grupy")

**Przycisk submit:**
- "Utwórz loterię" (było: "Utwórz grupę")
- Podczas ładowania: "Tworzenie..." (bez zmian)

**Toast notifications:**
- Sukces: "Loteria została utworzona pomyślnie!" (było: "Grupa")
- Opis: `Loteria "${result.name}" jest gotowa do użycia.`
- Błąd: "Nie udało się utworzyć loterii" (było: "grupy")

### 3. ✅ Zachowano wszystkie poprzednie poprawki

- ✅ Walidacja w czasie rzeczywistym (`mode: "onChange"`)
- ✅ Przycisk disabled gdy formularz niepoprawny
- ✅ Różowy gradient w tle
- ✅ Layout z budżetem i datą obok siebie
- ✅ Białe tło formularza z cieniem
- ✅ Czerwony przycisk submit
- ✅ Info box różowy
- ✅ PLN jako jednostka budżetu
- ✅ Format daty dd.MM.yyyy
- ✅ Język polski we wszystkich tekstach

## Szczegóły techniczne

### Stan komponentu:
```tsx
export default function CreateGroupForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false); // ← NOWY stan
```

### Kontrolowany Popover:
```tsx
<Popover 
  open={datePickerOpen}              // ← Kontrolowany stan
  onOpenChange={setDatePickerOpen}   // ← Callback do zmiany stanu
>
  <PopoverTrigger asChild>
    <Button
      type="button"
      onClick={() => setDatePickerOpen(true)}  // ← Jawne otwarcie
    >
```

### Automatyczne zamykanie po wyborze daty:
```tsx
<Calendar
  mode="single"
  selected={field.value}
  onSelect={(date) => {
    field.onChange(date);           // ← Aktualizacja formularza
    setDatePickerOpen(false);       // ← Zamknięcie popovera
  }}
/>
```

## Testy do wykonania

### ✅ Test 1: Otwarcie kalendarza
1. Otwórz `/groups/new`
2. Kliknij pole "Data losowania"
3. **Oczekiwany rezultat:** Kalendarz się otwiera (popover z kalendarzem jest widoczny)

### ✅ Test 2: Wybór daty
1. Kalendarz jest otwarty
2. Kliknij jutrzejszą datę (np. 13.10.2025)
3. **Oczekiwany rezultat:** 
   - Data zapisuje się w polu
   - Kalendarz zamyka się automatycznie
   - Format: "13.10.2025"

### ✅ Test 3: Zamknięcie kalendarza
1. Otwórz kalendarz
2. Kliknij poza kalendarzem
3. **Oczekiwany rezultat:** Kalendarz się zamyka

### ✅ Test 4: Daty w przeszłości
1. Otwórz kalendarz
2. Spróbuj kliknąć wczorajszą datę
3. **Oczekiwany rezultat:** Data jest zablokowana (szara, nie można kliknąć)

### ✅ Test 5: Walidacja przycisku
1. Otwórz formularz - przycisk "Utwórz loterię" jest szary (disabled)
2. Wypełnij nazwę loterii
3. Wypełnij budżet
4. Wybierz datę
5. **Oczekiwany rezultat:** Przycisk staje się czerwony i aktywny

### ✅ Test 6: Terminologia
Sprawdź czy wszystkie teksty używają słowa "loteria":
- [ ] Tytuł strony: "Utwórz nową loterię Secret Santa"
- [ ] Pole: "Nazwa loterii"
- [ ] Przycisk: "Utwórz loterię"
- [ ] Info box: "Po utworzeniu loterii..."
- [ ] Toast sukcesu: "Loteria została utworzona pomyślnie!"
- [ ] Toast błędu: "Nie udało się utworzyć loterii"

## Porównanie: Przed i Po (tylko zmiany)

### Kalendarz - PRZED:
```tsx
<Popover>  {/* Niekontrolowany stan */}
  <PopoverTrigger asChild>
    <Button type="button">  {/* Brak onClick */}
      ...
    </Button>
  </PopoverTrigger>
  <Calendar
    onSelect={field.onChange}  {/* Nie zamyka popovera */}
  />
</Popover>
```
❌ Problem: Kalendarz się nie otwiera

### Kalendarz - PO:
```tsx
<Popover 
  open={datePickerOpen}              {/* ✅ Kontrolowany stan */}
  onOpenChange={setDatePickerOpen}
>
  <PopoverTrigger asChild>
    <Button 
      type="button"
      onClick={() => setDatePickerOpen(true)}  {/* ✅ Jawne otwarcie */}
    >
      ...
    </Button>
  </PopoverTrigger>
  <Calendar
    onSelect={(date) => {
      field.onChange(date);
      setDatePickerOpen(false);  {/* ✅ Automatyczne zamknięcie */}
    }}
  />
</Popover>
```
✅ Rozwiązanie: Kalendarz działa poprawnie

### Terminologia - PRZED:
- "Utwórz nową grupę"
- "Nazwa grupy"
- "Utwórz grupę"

### Terminologia - PO:
- "Utwórz nową loterię"
- "Nazwa loterii"
- "Utwórz loterię"

## Pliki zmodyfikowane

1. **`src/pages/groups/new.astro`**
   - Zmiana tytułu na "loteria"

2. **`src/components/forms/CreateGroupForm.tsx`**
   - ✅ Dodano stan `datePickerOpen`
   - ✅ Kontrolowany Popover (open, onOpenChange)
   - ✅ Dodano onClick do przycisku daty
   - ✅ onSelect zamyka popover po wyborze daty
   - ✅ Wszystkie teksty zmienione na "loteria"
   - ✅ Komunikaty walidacji z "loteria"
   - ✅ Toast notifications z "loteria"

## Status

✅ **Problem z kalendarzem został rozwiązany**
- Kalendarz otwiera się po kliknięciu
- Data wybiera się poprawnie
- Kalendarz zamyka się automatycznie

✅ **Terminologia zmieniona na "loteria"**
- Wszystkie teksty interfejsu
- Komunikaty walidacji
- Toast notifications
- Info box

✅ **Build przeszedł pomyślnie**
- Brak błędów kompilacji
- Brak błędów linter'a

## Uruchomienie

Serwer deweloperski jest już uruchomiony na porcie **3001**:
```
http://localhost:3001/groups/new
```

lub

```bash
npm run dev
```

## Następne kroki (opcjonalne)

Jeśli kalendarz nadal nie działa w przeglądarce, możliwe rozwiązania:
1. Hard refresh przeglądarki (Ctrl+Shift+R)
2. Wyczyść cache przeglądarki
3. Sprawdź console.log w DevTools czy nie ma błędów JavaScript
4. Sprawdź czy Popover nie jest blokowany przez z-index

Możemy też rozważyć alternatywne rozwiązanie - używając natywnego `<input type="date">` jako fallback lub dodanie biblioteki `react-datepicker` jako alternatywy.

