# Analiza: Algorytm losowania Secret Santa - Problem z parami krzyżowymi

## Status
- **Data utworzenia**: 2025-11-02
- **Priorytet**: WYSOKI - wymaga analizy
- **Typ**: Analiza problemu + diagnoza
- **Plik**: `src/lib/services/draw.service.ts`

---

## 1. Zgłoszony problem

### Obserwacja z ostatniego losowania

**Grupa:** 6 uczestników [A, B, C, D, E, F]

**Wynik losowania:**
```
A → B, B → A  (para krzyżowa)
C → D, D → C  (para krzyżowa)
E → F, F → E  (para krzyżowa)
```

**Problem:** WSZYSTKIE przypisania to pary krzyżowe. Każdy uczestnik wylosował kogoś, kto wylosował jego.

---

## 2. Wymagania algorytmu

### Formalne wymagania z PRD (CLAUDE.md linia 45)

```
Algorytm losujący zapewnia, że:
1. Każdy uczestnik zostaje wylosowany (każdy otrzymuje prezent)
2. Nikt nie może wylosować samego siebie
3. Wszystkie reguły wykluczeń są uwzględnione
```

**To są WSZYSTKIE wymagania!**

### Czego NIE ma w wymaganiach:

- ❌ Zakaz par krzyżowych (A↔B jest technicznie OK)
- ❌ Wymóg jednego cyklu Hamiltona
- ❌ Minimalna długość cykli
- ❌ Wymóg różnorodności struktur

---

## 3. Czy wynik spełnia wymagania?

### Walidacja wyniku z problemu

```
Wynik: A↔B, C↔D, E↔F

Sprawdzenie:
✅ Wymaganie 1: Każdy otrzymuje prezent
   - A otrzymuje od B ✓
   - B otrzymuje od A ✓
   - C otrzymuje od D ✓
   - D otrzymuje od C ✓
   - E otrzymuje od F ✓
   - F otrzymuje od E ✓

✅ Wymaganie 2: Nikt nie losuje siebie
   - A losuje B (nie siebie) ✓
   - B losuje A (nie siebie) ✓
   - C losuje D (nie siebie) ✓
   - D losuje C (nie siebie) ✓
   - E losuje F (nie siebie) ✓
   - F losuje E (nie siebie) ✓

✅ Wymaganie 3: Wykluczenia uwzględnione
   - Założenie: brak wykluczeń dla tej grupy ✓
```

### Wniosek

**Wynik SPEŁNIA wszystkie formalne wymagania!**

Pary krzyżowe nie są błędem algorytmu w sensie "broken logic".

---

## 4. Dlaczego to może być problem?

### Problem 1: Brak prawdziwej losowości

**Pytanie kluczowe:** Czy algorytm ZAWSZE produkuje same pary krzyżowe, czy to był przypadek losowy?

**Jeśli zawsze:**
- To oznacza że algorytm jest deterministyczny lub ma bias
- Brakuje randomizacji
- To JEST problem

**Jeśli losowo:**
- To jest jedna z wielu możliwych konfiguracji
- Algorytm działa poprawnie
- To NIE jest problem

### Problem 2: Przewidywalność (tylko dla małych grup)

**Scenariusz:** Grupa 4 osób [Alice, Bob, Carol, Dave]

**Wynik:** Alice↔Bob, Carol↔Dave

```
Alice wylosowała: Bob
Alice widzi że: Carol i Dave sobie nawzajem dali prezenty

Dedukcja Alice:
"Skoro Carol↔Dave, to Bob MUSI być moim Secret Santa"
→ Element niespodzianki utracony ⚠️
```

**Dla grup ≥6 osób:** Ten problem praktycznie nie występuje, bo możliwości jest zbyt wiele.

### Problem 3: Wrażenia użytkownika

Niektórzy użytkownicy mogą oczekiwać "jednego długiego łańcucha" z tradycyjnego Secret Santa:

```
Tradycyjnie (karteczki):
A → B → C → D → E → F → A

Cyfrowo (może być):
A ↔ B,  C ↔ D,  E ↔ F
```

**Ale:** To nie jest wymóg formalny, tylko preferencja estetyczna.

---

## 5. Analiza obecnego algorytmu

### Jak działa `executeDrawAlgorithm()` (linia 84-107)

```typescript
1. Sprawdza czy losowanie możliwe: isDrawPossible()
2. Buduje reprezentację uczestników: buildDrawParticipants()
3. Uruchamia backtracking: backtrackAssignment()
4. Waliduje wynik: validateAssignments()
5. Zwraca przypisania lub null
```

### Kluczowa metoda: `backtrackAssignment()` (linia 204-275)

```typescript
private backtrackAssignment(
  participants: DrawParticipant[],
  currentAssignments: DrawAssignment[],
  usedReceivers: Set<number>,
  startTime: number
): DrawAssignment[] | null {
  // ...

  // Linia 221: Pobiera następnego uczestnika (KOLEJNO)
  const currentIndex = currentAssignments.length;
  const giver = participants[currentIndex];

  // Linia 225-242: Filtruje dostępnych odbiorców
  const availableReceivers = participants.filter((p) => {
    if (p.id === giver.id) return false;        // Nie siebie
    if (usedReceivers.has(p.id)) return false;  // Nie użytych
    if (giver.exclusions.includes(p.id)) return false; // Nie wykluczonych
    return true;
  });

  // Linia 245-249: SORTUJE po "most constrained first"
  availableReceivers.sort((a, b) => {
    const aOptions = this.countRemainingOptions(a, ...);
    const bOptions = this.countRemainingOptions(b, ...);
    return aOptions - bOptions; // ⚠️ TU MOŻE BYĆ PROBLEM
  });

  // Linia 252: Próbuje każdego odbiorcy
  for (const receiver of availableReceivers) {
    // Backtracking...
  }
}
```

### Potencjalny problem: Brak randomizacji przed sortowaniem

**Linia 245-249:** Algorytm sortuje odbiorców według heurystyki "most constrained first".

**Problem:** Jeśli zawsze sortujemy w ten sam sposób, algorytm może zawsze znajdować to samo rozwiązanie!

**Przykład:**
```
Grupa: [A, B, C, D]

Krok 1: A rozważa odbiorców [B, C, D]
  - Sortowanie heurystyczne: załóżmy B ma najmniej opcji
  - A → B (wybrane)

Krok 2: B rozważa [C, D] (A użyte)
  - B widzi że jeśli wybierze C, D będzie miał tylko A
  - B widzi że jeśli wybierze A, to działa!
  - Sortowanie: A ma najmniej opcji (już prawie wszystko użyte)
  - B → A (para krzyżowa powstała!)

Krok 3: C rozważa [D] (A,B użyte)
  - C → D (jedyna opcja)

Krok 4: D rozważa [C]
  - D → C (para krzyżowa!)

Wynik: A↔B, C↔D (same pary!)
```

### Gdzie jest randomizacja?

**Linia 245:** Sortowanie jest DETERMINISTYCZNE - zawsze daje ten sam wynik dla tych samych danych.

**Brakuje:** Losowego shufflowania przed sortowaniem lub zamiast sortowania!

---

## 6. Diagnoza: Prawdopodobne źródło problemu

### Hipoteza

Algorytm backtrackingu z heurystyką "most constrained first" (linia 245-249) **może być zbyt deterministyczny**.

**Przyczyna:**
1. Uczestnicy są przetwarzani w kolejności tablicy (linia 221)
2. Odbiorcy są sortowani według heurystyki (linia 245)
3. Brak losowości w tych krokach
4. Algorytm zawsze znajdzie to samo "pierwsze poprawne" rozwiązanie
5. To rozwiązanie może często być "same pary krzyżowe"

### Dlaczego same pary?

**Pary krzyżowe to często "najłatwiejsze" rozwiązanie dla backtrackingu:**

```
Backtracking preferuje szybkie rozwiązania:
- Para A↔B: 2 kroki, szybko znaleziona ✓
- Długi cykl A→B→C→D→A: 4 kroki, wymaga więcej prób

Jeśli algorytm jest deterministyczny, zawsze znajdzie pary!
```

---

## 7. Możliwe rozwiązania

### Rozwiązanie 1: Dodać randomizację do backtrackingu (REKOMENDOWANE)

**Cel:** Zapewnić prawdziwie losowe wyniki przy każdym uruchomieniu.

**Implementacja:** Losowo shufflować uczestników PRZED backtrackingiem.

**Lokalizacja:** `src/lib/services/draw.service.ts` - metoda `executeDrawAlgorithm` (linia 84)

**Kod:**

```typescript
executeDrawAlgorithm(participants: ParticipantDTO[], exclusions: ExclusionRuleDTO[]): DrawAssignment[] | null {
  // Guard: Quick validation check
  if (!this.isDrawPossible(participants, exclusions)) {
    return null;
  }

  // Build internal representation
  const drawParticipants = this.buildDrawParticipants(participants, exclusions);

  // ⭐ NOWE: Shuffle participants before backtracking for randomness
  const shuffledParticipants = this.shuffleArray(drawParticipants);

  // Execute backtracking with timeout
  const startTime = Date.now();
  const result = this.backtrackAssignment(shuffledParticipants, [], new Set(), startTime);

  if (!result) {
    return null;
  }

  // Validate final result
  if (!this.validateAssignments(result, participants, exclusions)) {
    return null;
  }

  return result;
}

/**
 * Shuffles array using Fisher-Yates algorithm
 * Ensures true randomness for draw results
 */
private shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]; // Copy to avoid mutation
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

**Efekt:**
- Każde losowanie będzie dawać potencjalnie inny wynik
- Prawdopodobieństwo "same pary" drastycznie spadnie
- Różnorodność struktur wzrośnie
- ✅ Nadal spełnia wszystkie 3 wymagania

### Rozwiązanie 2: Dodatkowo shufflować dostępnych odbiorców

**Cel:** Jeszcze więcej randomizacji w wyborze odbiorcy.

**Lokalizacja:** `src/lib/services/draw.service.ts` - metoda `backtrackAssignment` (linia 245)

**Zmiana:** Zamiast tylko sortować, najpierw shuffle, potem sortuj (lub shuffle zamiast sortowania).

**Kod (opcja A - shuffle + sort):**

```typescript
// Get available receivers for this giver
const availableReceivers = participants.filter((p) => {
  // ... filtry ...
});

// ⭐ NOWE: Shuffle first for randomness
const shuffledReceivers = this.shuffleArray(availableReceivers);

// Then optimize with most constrained first (optional)
shuffledReceivers.sort((a, b) => {
  const aOptions = this.countRemainingOptions(a, participants, usedReceivers, currentIndex + 1);
  const bOptions = this.countRemainingOptions(b, participants, usedReceivers, currentIndex + 1);
  return aOptions - bOptions;
});

// Try each available receiver
for (const receiver of shuffledReceivers) {
  // ...
}
```

**Kod (opcja B - tylko shuffle, bez sort - prostsze):**

```typescript
// Get available receivers for this giver
const availableReceivers = participants.filter((p) => {
  // ... filtry ...
});

// ⭐ NOWE: Shuffle instead of sorting for true randomness
const shuffledReceivers = this.shuffleArray(availableReceivers);

// Try each available receiver in random order
for (const receiver of shuffledReceivers) {
  // ...
}
```

**Uwaga:** Opcja B (tylko shuffle) jest prostsza i zapewnia pełną losowość. Sortowanie "most constrained" to optymalizacja wydajności, ale może wprowadzać bias.

### Rozwiązanie 3: Usunąć sortowanie heurystyczne (najprostsze)

**Cel:** Eliminacja źródła determinizmu.

**Akcja:** Usunąć linie 245-249 (sortowanie).

**Za:**
- Najprostsze rozwiązanie
- Eliminuje bias
- Kod staje się bardziej czytelny

**Przeciw:**
- Może nieznacznie spowolnić algorytm dla dużych grup z wieloma wykluczeniami
- Heurystyka była optymalizacją

**Rekomendacja:** Jeśli wydajność nie jest problemem, to najlepsze rozwiązanie!

---

## 8. Implementacja - Rozwiązanie 1 (rekomendowane)

### Krok 1: Dodać metodę shuffle (jeśli nie istnieje)

**Lokalizacja:** `src/lib/services/draw.service.ts` (na końcu klasy)

```typescript
/**
 * Shuffles an array using Fisher-Yates algorithm
 *
 * This method ensures true randomness for draw results.
 * Each participant has equal probability of being in any position.
 *
 * @param array - Array to shuffle
 * @returns New shuffled array (does not mutate original)
 */
private shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]; // Create copy to avoid mutation

  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}
```

### Krok 2: Użyć shuffle w executeDrawAlgorithm

**Lokalizacja:** `src/lib/services/draw.service.ts` - linia 84

**Zmiana:**

```typescript
// PRZED:
executeDrawAlgorithm(participants: ParticipantDTO[], exclusions: ExclusionRuleDTO[]): DrawAssignment[] | null {
  if (!this.isDrawPossible(participants, exclusions)) {
    return null;
  }

  const drawParticipants = this.buildDrawParticipants(participants, exclusions);

  const startTime = Date.now();
  const result = this.backtrackAssignment(drawParticipants, [], new Set(), startTime);
  // ...
}

// PO:
executeDrawAlgorithm(participants: ParticipantDTO[], exclusions: ExclusionRuleDTO[]): DrawAssignment[] | null {
  if (!this.isDrawPossible(participants, exclusions)) {
    return null;
  }

  const drawParticipants = this.buildDrawParticipants(participants, exclusions);

  // ⭐ Shuffle participants for randomness
  const shuffledParticipants = this.shuffleArray(drawParticipants);

  const startTime = Date.now();
  const result = this.backtrackAssignment(shuffledParticipants, [], new Set(), startTime);
  // ...
}
```

### Krok 3: (Opcjonalnie) Shufflować odbiorców zamiast sortować

**Lokalizacja:** `src/lib/services/draw.service.ts` - linia 245

**Zmiana:**

```typescript
// PRZED:
const availableReceivers = participants.filter((p) => {
  // ... filtry ...
});

availableReceivers.sort((a, b) => {
  const aOptions = this.countRemainingOptions(a, participants, usedReceivers, currentIndex + 1);
  const bOptions = this.countRemainingOptions(b, participants, usedReceivers, currentIndex + 1);
  return aOptions - bOptions;
});

for (const receiver of availableReceivers) {
  // ...
}

// PO (opcja prosta - tylko shuffle):
const availableReceivers = participants.filter((p) => {
  // ... filtry ...
});

// ⭐ Shuffle for random selection order
const shuffledReceivers = this.shuffleArray(availableReceivers);

for (const receiver of shuffledReceivers) {
  // ...
}
```

**Lub zachować sortowanie ale dodać shuffle przed:**

```typescript
const availableReceivers = participants.filter((p) => {
  // ... filtry ...
});

// ⭐ Shuffle first
const shuffledReceivers = this.shuffleArray(availableReceivers);

// Then sort for optimization (optional)
shuffledReceivers.sort((a, b) => {
  const aOptions = this.countRemainingOptions(a, participants, usedReceivers, currentIndex + 1);
  const bOptions = this.countRemainingOptions(b, participants, usedReceivers, currentIndex + 1);
  return aOptions - bOptions;
});

for (const receiver of shuffledReceivers) {
  // ...
}
```

---

## 9. Testy - weryfikacja randomizacji

### Test 1: Różnorodność wyników

**Cel:** Sprawdzić czy wielokrotne losowanie dla tej samej grupy daje różne wyniki.

**Plik:** `src/lib/services/__tests__/draw.service.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { DrawService } from '../draw.service';
import type { ParticipantDTO, ExclusionRuleDTO } from '../../../types';

describe('DrawService - Randomness', () => {
  it('should produce different results on multiple runs', () => {
    const drawService = new DrawService();

    const participants: ParticipantDTO[] = [
      { id: 1, name: 'A', group_id: 1, email: null, created_at: '' },
      { id: 2, name: 'B', group_id: 1, email: null, created_at: '' },
      { id: 3, name: 'C', group_id: 1, email: null, created_at: '' },
      { id: 4, name: 'D', group_id: 1, email: null, created_at: '' },
      { id: 5, name: 'E', group_id: 1, email: null, created_at: '' },
      { id: 6, name: 'F', group_id: 1, email: null, created_at: '' },
    ];

    const exclusions: ExclusionRuleDTO[] = [];

    // Run algorithm 10 times
    const results = [];
    for (let i = 0; i < 10; i++) {
      const result = drawService.executeDrawAlgorithm(participants, exclusions);
      expect(result).not.toBeNull();

      // Convert to comparable format
      const signature = result!
        .map(a => `${a.giver_participant_id}->${a.receiver_participant_id}`)
        .sort()
        .join(',');

      results.push(signature);
    }

    // Check that not all results are identical
    const uniqueResults = new Set(results);

    // With proper randomization, we should get at least 2-3 different results
    // (probability of all 10 being same is astronomically low)
    expect(uniqueResults.size).toBeGreaterThan(1);
  });
});
```

### Test 2: Nie tylko pary krzyżowe

**Cel:** Sprawdzić czy algorytm produkuje też inne struktury niż pary.

```typescript
it('should not always produce only cross-pairs', () => {
  const drawService = new DrawService();

  const participants: ParticipantDTO[] = [
    { id: 1, name: 'A', group_id: 1, email: null, created_at: '' },
    { id: 2, name: 'B', group_id: 1, email: null, created_at: '' },
    { id: 3, name: 'C', group_id: 1, email: null, created_at: '' },
    { id: 4, name: 'D', group_id: 1, email: null, created_at: '' },
    { id: 5, name: 'E', group_id: 1, email: null, created_at: '' },
    { id: 6, name: 'F', group_id: 1, email: null, created_at: '' },
  ];

  const exclusions: ExclusionRuleDTO[] = [];

  let foundNonPairStructure = false;

  // Run 20 times (high probability of finding non-pair structure)
  for (let i = 0; i < 20; i++) {
    const result = drawService.executeDrawAlgorithm(participants, exclusions);
    expect(result).not.toBeNull();

    // Check if result contains any cycle longer than 2
    const hasLongerCycle = detectLongerCycle(result!, participants);

    if (hasLongerCycle) {
      foundNonPairStructure = true;
      break;
    }
  }

  // Should find at least one result that's not all pairs
  expect(foundNonPairStructure).toBe(true);
});

// Helper function
function detectLongerCycle(
  assignments: Array<{giver_participant_id: number, receiver_participant_id: number}>,
  participants: ParticipantDTO[]
): boolean {
  // Build map
  const nextMap = new Map<number, number>();
  for (const a of assignments) {
    nextMap.set(a.giver_participant_id, a.receiver_participant_id);
  }

  const visited = new Set<number>();

  for (const p of participants) {
    if (visited.has(p.id)) continue;

    // Follow cycle
    let current = p.id;
    let length = 0;
    const cycleStart = current;

    do {
      visited.add(current);
      const next = nextMap.get(current);
      if (!next) break;
      current = next;
      length++;
    } while (current !== cycleStart && length < 100);

    // If found cycle longer than 2, return true
    if (length > 2) {
      return true;
    }
  }

  return false;
}
```

### Test 3: Nadal spełnia wymagania

```typescript
it('should still meet all requirements after shuffle', () => {
  const drawService = new DrawService();

  const participants: ParticipantDTO[] = [
    { id: 1, name: 'A', group_id: 1, email: null, created_at: '' },
    { id: 2, name: 'B', group_id: 1, email: null, created_at: '' },
    { id: 3, name: 'C', group_id: 1, email: null, created_at: '' },
    { id: 4, name: 'D', group_id: 1, email: null, created_at: '' },
  ];

  const exclusions: ExclusionRuleDTO[] = [
    {
      id: 1,
      group_id: 1,
      blocker_participant_id: 1,
      blocked_participant_id: 2,
      created_at: ''
    }
  ];

  // Run 5 times
  for (let i = 0; i < 5; i++) {
    const result = drawService.executeDrawAlgorithm(participants, exclusions);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(4);

    // Check requirement 1: Everyone receives
    const receivers = new Set(result!.map(a => a.receiver_participant_id));
    expect(receivers.size).toBe(4);

    // Check requirement 2: No self-assignment
    for (const a of result!) {
      expect(a.giver_participant_id).not.toBe(a.receiver_participant_id);
    }

    // Check requirement 3: Exclusions respected
    const violation = result!.find(
      a => a.giver_participant_id === 1 && a.receiver_participant_id === 2
    );
    expect(violation).toBeUndefined();
  }
});
```

---

## 10. Podsumowanie

### Problem

**Obserwacja:** Ostatnie losowanie dało TYLKO pary krzyżowe (A↔B, C↔D, E↔F).

**Przyczyna:** Algorytm backtrackingu może być zbyt deterministyczny z powodu:
1. Brak shufflowania uczestników przed algorytmem
2. Sortowanie heurystyczne może wprowadzać bias
3. Pary krzyżowe to często "najłatwiejsze" rozwiązanie dla backtrackingu

### Wymagania (przypomnienie)

```
1. Każdy otrzymuje prezent          ✅ Spełnione
2. Nikt nie losuje siebie           ✅ Spełnione
3. Wykluczenia uwzględnione         ✅ Spełnione
```

Wynik "same pary" spełnia wymagania, ale brakuje randomizacji.

### Rozwiązanie

**Dodać shuffle uczestników przed backtrackingiem:**

```typescript
const shuffledParticipants = this.shuffleArray(drawParticipants);
const result = this.backtrackAssignment(shuffledParticipants, ...);
```

**Opcjonalnie:** Shufflować lub usunąć sortowanie heurystyczne w lini 245.

### Efekt naprawy

Po implementacji:
- ✅ Różnorodność wyników wzrośnie dramatycznie
- ✅ Prawdopodobieństwo "same pary" spadnie praktycznie do zera
- ✅ Wszystkie 3 wymagania nadal spełnione
- ✅ Prawdziwie losowe wyniki przy każdym uruchomieniu

---

## 11. Checklist implementacji

### Implementacja
- [ ] Dodać metodę `shuffleArray()` do klasy DrawService
- [ ] Shufflować uczestników w `executeDrawAlgorithm()` przed backtrackingiem
- [ ] (Opcjonalnie) Shufflować odbiorców w `backtrackAssignment()`
- [ ] (Opcjonalnie) Usunąć sortowanie heurystyczne (linia 245-249)
- [ ] Uruchomić ESLint i Prettier
- [ ] Sprawdzić kompilację TypeScript

### Testowanie
- [ ] Napisać test "different results on multiple runs"
- [ ] Napisać test "not always cross-pairs"
- [ ] Napisać test "still meets requirements after shuffle"
- [ ] Uruchomić wszystkie testy: `npm test`
- [ ] Sprawdzić coverage

### Weryfikacja ręczna
- [ ] Stworzyć grupę testową z 6 uczestnikami
- [ ] Wykonać losowanie 3-5 razy (za każdym razem nowa grupa)
- [ ] Sprawdzić czy wyniki są różne
- [ ] Sprawdzić czy występują różne struktury (nie tylko pary)
- [ ] Przetestować z wykluczeniami

### Finalizacja
- [ ] Code review
- [ ] Zaktualizować dokumentację (jeśli istnieje changelog)
- [ ] Deploy na środowisko testowe
- [ ] Weryfikacja na produkcji

---

## 12. Szacowany czas implementacji

- **Implementacja shuffla:** 15 min
- **Modyfikacja executeDrawAlgorithm:** 5 min
- **Testy jednostkowe:** 45 min
- **Testowanie ręczne:** 20 min
- **Code review i finalizacja:** 15 min

**Łącznie:** ~100 minut (1h 40min)

---

**Autor:** Claude (AI Assistant)
**Data:** 2025-11-02
**Wersja:** 3.0 (przepisana - focus na randomizację)
**Status:** Gotowe do implementacji
