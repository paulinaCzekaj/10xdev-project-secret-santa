# Testing Guide

## Overview

This project uses a comprehensive testing setup:

- **Vitest** for unit and integration tests
- **React Testing Library** for component testing
- **Playwright** for end-to-end (E2E) testing

## Test Structure

```
├── e2e/                        # E2E tests with Playwright
│   ├── auth/                   # Authentication flow tests
│   ├── groups/                 # Group management tests
│   ├── results/                # Results and wishlist tests
│   └── example.spec.ts         # Example E2E test
├── src/
│   ├── __tests__/              # Unit and integration tests
│   │   ├── components/         # Component tests
│   │   ├── lib/                # Utility function tests
│   │   └── hooks/              # React hooks tests
│   └── **/*.test.{ts,tsx}      # Tests co-located with source
├── vitest.config.ts            # Vitest configuration
├── vitest.setup.ts             # Vitest setup file
└── playwright.config.ts        # Playwright configuration
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug

# Show test report
npm run test:e2e:report
```

## Writing Unit Tests

### Component Tests

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "@/components/MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("handles user interactions", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<MyComponent onClick={handleClick} />);
    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Utility Function Tests

```typescript
import { describe, it, expect } from "vitest";
import { myUtility } from "@/lib/utils";

describe("myUtility", () => {
  it("returns expected result", () => {
    const result = myUtility("input");
    expect(result).toBe("expected output");
  });
});
```

### Service Tests

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { myService } from "@/lib/services/myService";

// Mock Supabase client
vi.mock("@/db/supabase.client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

describe("myService", () => {
  it("fetches data correctly", async () => {
    const result = await myService.getData();
    expect(result).toBeDefined();
  });
});
```

## Writing E2E Tests

### Basic E2E Test

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should perform action", async ({ page }) => {
    // Navigate to page
    await page.goto("/path");

    // Interact with elements
    await page.click('button:has-text("Click me")');

    // Assert results
    await expect(page.locator(".result")).toContainText("Expected text");
  });
});
```

### Authentication Flow Test

```typescript
test.describe("Authentication", () => {
  test("user can login", async ({ page }) => {
    await page.goto("/login");

    // Fill form
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });
});
```

## Best Practices

### Unit Tests

1. **Test user behavior, not implementation details**
   - Focus on what users see and do
   - Avoid testing internal state or implementation

2. **Use descriptive test names**
   - Describe what the test does and what's expected
   - Follow pattern: "should [expected behavior] when [condition]"

3. **Keep tests isolated and independent**
   - Each test should run independently
   - Use `beforeEach` for setup, `afterEach` for cleanup

4. **Mock external dependencies**
   - Mock API calls, external services
   - Use `vi.mock()` for modules, `vi.fn()` for functions

5. **Use Testing Library best practices**
   - Query by role, label, text (user-visible)
   - Avoid `querySelector`, test IDs when possible

### E2E Tests

1. **Test critical user journeys**
   - Focus on main workflows
   - Cover happy paths and error cases

2. **Use stable selectors**
   - Prefer text content, roles, labels
   - Avoid CSS classes, IDs that may change

3. **Handle asynchronous operations**
   - Wait for elements, network requests
   - Use `waitForLoadState`, `waitForSelector`

4. **Keep tests maintainable**
   - Use Page Object Model for complex flows
   - Extract reusable helpers

5. **Run tests in isolation**
   - Each test should be independent
   - Clean up state between tests

## Coverage Goals

- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

Focus on meaningful coverage rather than hitting arbitrary numbers. Critical business logic and user-facing features should have higher coverage.

## Continuous Integration

Tests are automatically run in CI/CD pipeline:

- Unit tests run on every push
- E2E tests run on pull requests to main branch
- Coverage reports are generated and checked

## Troubleshooting

### Common Issues

**Tests fail with "Cannot find module"**

- Check path aliases in `vitest.config.ts`
- Verify imports use `@/` prefix correctly

**E2E tests timeout**

- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Verify network requests complete

**Coverage thresholds not met**

- Run `npm run test:coverage` to see detailed report
- Focus on critical paths first
- Exclude generated/config files if needed

**React Testing Library warnings**

- Wrap async operations in `act()`
- Use `userEvent` instead of `fireEvent`
- Wait for state updates with `waitFor`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
