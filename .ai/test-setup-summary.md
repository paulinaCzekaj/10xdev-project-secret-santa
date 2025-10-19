# Test Environment Setup Summary

## Zainstalowane narzędzia i zależności

### Vitest (Unit Testing)
- `vitest` - Framework do testów jednostkowych i integracyjnych
- `@vitest/ui` - Interfejs użytkownika do przeglądania testów
- `@vitest/coverage-v8` - Narzędzie do generowania raportów pokrycia kodu
- `jsdom` - Środowisko DOM dla testów
- `@vitejs/plugin-react` - Plugin React dla Vite/Vitest

### React Testing Library
- `@testing-library/react` - Biblioteka do testowania komponentów React
- `@testing-library/jest-dom` - Dodatkowe matchery dla testów DOM
- `@testing-library/user-event` - Symulacja interakcji użytkownika

### Playwright (E2E Testing)
- `@playwright/test` - Framework do testów end-to-end
- Chromium browser - Zainstalowany dla testów E2E

## Struktura projektu

```
├── e2e/                                    # Testy E2E
│   ├── auth/                               # Testy autentykacji
│   ├── groups/                             # Testy zarządzania grupami
│   ├── results/                            # Testy wyników i list życzeń
│   └── example.spec.ts                     # Przykładowy test E2E
│
├── src/
│   ├── __tests__/                          # Testy jednostkowe
│   │   ├── components/                     # Testy komponentów
│   │   │   └── Button.test.tsx
│   │   ├── lib/                            # Testy utility functions
│   │   │   └── utils.test.ts
│   │   └── hooks/                          # Testy hooków React
│   └── **/*.test.{ts,tsx}                  # Testy współlokowane z kodem
│
├── vitest.config.ts                        # Konfiguracja Vitest
├── vitest.setup.ts                         # Setup dla Vitest (mocks, globals)
├── playwright.config.ts                    # Konfiguracja Playwright
├── TESTING.md                              # Przewodnik po testach
└── .cursor/rules/
    ├── vitest-unit-testing.mdc             # Zasady testów jednostkowych
    └── playwright-e2e-testing.mdc          # Zasady testów E2E
```

## Dostępne skrypty

### Testy jednostkowe (Vitest)
```bash
npm run test                    # Uruchom wszystkie testy jednostkowe
npm run test:watch              # Uruchom w trybie watch
npm run test:ui                 # Uruchom z interfejsem graficznym
npm run test:coverage           # Wygeneruj raport pokrycia kodu
```

### Testy E2E (Playwright)
```bash
npm run test:e2e                # Uruchom testy E2E
npm run test:e2e:ui             # Uruchom z interfejsem graficznym
npm run test:e2e:debug          # Uruchom w trybie debug
npm run test:e2e:report         # Pokaż raport z testów
```

## Konfiguracja

### Vitest (vitest.config.ts)
- Środowisko: `jsdom` (dla testów komponentów React)
- Coverage provider: `v8`
- Threshold: 70% dla lines, functions, branches, statements
- Setup file: `vitest.setup.ts` (mocks dla matchMedia, IntersectionObserver, ResizeObserver)
- Path alias: `@/` wskazuje na `./src`
- Include: `src/**/*.{test,spec}.{ts,tsx}`
- Exclude: `node_modules`, `dist`, `.astro`, `e2e`

### Playwright (playwright.config.ts)
- Test directory: `./e2e`
- Browser: Chromium (Desktop Chrome)
- Base URL: `http://localhost:3000`
- Web Server: Automatycznie uruchamia `npm run dev`
- Reporter: HTML
- Screenshots: Tylko przy błędach
- Trace: Przy pierwszym retry

## Przykładowe testy

### Test komponentu React
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button Component", () => {
  it("calls onClick handler when clicked", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Test E2E
```typescript
import { test, expect } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveTitle(/Secret Santa|10x/i);
});
```

## Status weryfikacji

✅ Vitest zainstalowany i skonfigurowany
✅ React Testing Library zainstalowany
✅ Playwright zainstalowany
✅ Testy jednostkowe działają (10/10 passed)
✅ Struktura katalogów utworzona
✅ Skrypty npm skonfigurowane
✅ Pliki dokumentacji utworzone
✅ Przykładowe testy utworzone i działają

## Następne kroki

1. **Napisz testy dla istniejącego kodu**
   - Zacznij od krytycznych ścieżek (autentykacja, tworzenie grup, losowanie)
   - Testuj service'y z użyciem mocków Supabase
   - Testuj komponenty React z RTL

2. **Testy E2E**
   - Napisz testy dla głównych user flows
   - Test pełnego cyklu: rejestracja → tworzenie grupy → losowanie → wyniki

3. **CI/CD**
   - Dodaj testy do GitHub Actions
   - Skonfiguruj automatyczne uruchamianie przy push/PR
   - Dodaj badge'e z coverage do README

4. **Monitoring pokrycia**
   - Regularnie sprawdzaj `npm run test:coverage`
   - Dąż do 70%+ pokrycia dla krytycznego kodu
   - Priorytetyzuj testowanie logiki biznesowej

## Użyteczne zasoby

- [TESTING.md](../TESTING.md) - Szczegółowy przewodnik po testach
- [.cursor/rules/vitest-unit-testing.mdc](../.cursor/rules/vitest-unit-testing.mdc) - Wytyczne testów jednostkowych
- [.cursor/rules/playwright-e2e-testing.mdc](../.cursor/rules/playwright-e2e-testing.mdc) - Wytyczne testów E2E
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)

## Troubleshooting

### Problem: "Cannot find module '@/...'"
**Rozwiązanie**: Sprawdź, czy path alias jest poprawnie skonfigurowany w `vitest.config.ts`

### Problem: Testy E2E timeout
**Rozwiązanie**:
- Sprawdź czy serwer dev działa
- Zwiększ timeout w `playwright.config.ts`
- Użyj `await page.waitForLoadState('networkidle')`

### Problem: "ReferenceError: vi is not defined"
**Rozwiązanie**: Dodaj `globals: true` w `vitest.config.ts` lub importuj: `import { vi } from 'vitest'`

### Problem: React Testing Library warnings
**Rozwiązanie**:
- Używaj `userEvent` zamiast `fireEvent`
- Używaj `await waitFor()` dla async operacji
- Upewnij się, że cleanup jest wykonywany (jest w `vitest.setup.ts`)
