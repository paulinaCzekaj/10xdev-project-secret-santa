# Page Object Model (POM) Documentation

This directory contains Page Object Model classes for E2E testing with Playwright.

## Overview

The Page Object Model (POM) is a design pattern that creates an object repository for web UI elements. It helps to reduce code duplication and improves test maintenance.

## Structure

```
e2e/pages/
├── BasePage.ts          # Base class with common functionality
├── LoginPage.ts         # Login page interactions
├── DashboardPage.ts     # Dashboard page interactions
├── CreateGroupPage.ts   # Group creation form interactions
├── GroupViewPage.ts     # Group management page interactions
├── index.ts             # Centralized exports
└── README.md            # This file
```

## Classes

### BasePage

Base class that provides common functionality for all page objects:

- **Navigation**: `goto()`, `waitForPageLoad()`, `waitForNavigation()`
- **Form interactions**: `fillByLabel()`, `fillByPlaceholder()`, `fillByTestId()`
- **Element interactions**: `clickButton()`, `clickLink()`, `clickByTestId()`
- **Utilities**: `getTextByTestId()`, `waitForApiResponse()`, `takeScreenshot()`

### LoginPage

Handles login page interactions:

```typescript
const loginPage = new LoginPage(page);

// Navigate to login
await loginPage.goto();

// Complete login flow
await loginPage.login("user@example.com", "password123");

// Alternative: Login with semantic selectors
await loginPage.loginWithLabels("user@example.com", "password123");

// Check form state
await loginPage.expectToBeOnLoginPage();
await loginPage.expectSubmitButtonDisabled();
```

**Key Methods**:

- `goto()` - Navigate to login page
- `login(email, password)` - Complete login flow
- `fillEmail(email)` - Fill email field
- `fillPassword(password)` - Fill password field
- `togglePasswordVisibility()` - Toggle password visibility
- `clickForgotPassword()` - Click forgot password link
- `expectRedirectToDashboard()` - Assert redirect after login

### DashboardPage

Handles dashboard page interactions:

```typescript
const dashboardPage = new DashboardPage(page);

// Navigate to dashboard
await dashboardPage.goto();

// Create group actions
await dashboardPage.clickCreateGroupCta();
await dashboardPage.clickCreateGroupEmptyState();

// Group card interactions
await dashboardPage.clickGroupCard(123);
await dashboardPage.clickGroupByName("Test Group");

// Get information
const count = await dashboardPage.getGroupCount();
const names = await dashboardPage.getGroupNames();
const hasGroups = await dashboardPage.hasCreatedGroups();

// Assertions
await dashboardPage.expectToBeOnDashboard();
await dashboardPage.expectGroupCount(5);
await dashboardPage.expectGroupWithName("My Group");
```

**Key Methods**:

- `goto()` - Navigate to dashboard
- `clickCreateGroupCta()` - Click main CTA button
- `clickCreateGroupEmptyState()` - Click empty state button
- `getGroupCard(groupId)` - Get specific group card
- `clickGroupCard(groupId)` - Click on group card
- `getGroupNames()` - Get all group names
- `findGroupByName(name)` - Find group by name
- `waitForGroupsToLoad()` - Wait for groups to appear

### CreateGroupPage

Handles group creation form:

```typescript
const createGroupPage = new CreateGroupPage(page);

// Navigate to create page
await createGroupPage.goto();

// Complete form
await createGroupPage.createGroup("Test Group", 100, "2025-12-25");

// Manual field filling
await createGroupPage.fillName("Test Group");
await createGroupPage.fillBudget(100);
await createGroupPage.selectDate("2025-12-25");
await createGroupPage.clickSubmit();

// Get created group ID
const groupId = await createGroupPage.getCreatedGroupId();

// Validation
await createGroupPage.expectSubmitButtonDisabled();
await createGroupPage.expectValidationError("Nazwa loterii");
```

**Key Methods**:

- `goto()` - Navigate to create group page
- `createGroup(name, budget, date)` - Complete form and submit
- `fillName(name)` - Fill group name
- `fillBudget(budget)` - Fill budget field
- `selectDate(date)` - Select date from picker
- `clickSubmit()` - Submit form
- `getCreatedGroupId()` - Extract group ID from URL after redirect
- `expectSubmitButtonEnabled()` - Assert button is enabled

### GroupViewPage

Handles group management/view page:

```typescript
const groupViewPage = new GroupViewPage(page);

// Navigate to group
await groupViewPage.gotoGroup(123);

// Get group information
const name = await groupViewPage.getGroupName();
const status = await groupViewPage.getGroupStatus();
const budget = await groupViewPage.getBudget();
const participantsCount = await groupViewPage.getParticipantsCount();

// Check states
const isDrawn = await groupViewPage.isGroupDrawn();
const canEdit = await groupViewPage.isEditButtonVisible();

// Actions
await groupViewPage.clickEditGroup();
await groupViewPage.clickDeleteGroup();
await groupViewPage.addParticipant("John Doe", "john@example.com");
await groupViewPage.clickDrawButton();
await groupViewPage.confirmDraw();

// Participants
const hasParticipant = await groupViewPage.hasParticipant("John");
await groupViewPage.expectParticipantVisible("John Doe");

// Assertions
await groupViewPage.expectToBeOnGroupPage(123);
await groupViewPage.expectGroupName("Test Group");
await groupViewPage.expectParticipantsCount(3);
await groupViewPage.expectDrawButtonDisabled();
```

**Key Methods**:

- `gotoGroup(groupId)` - Navigate to group page
- `getGroupName()` - Get group name text
- `getGroupStatus()` - Get status badge text
- `getParticipantsCount()` - Get number of participants
- `isGroupDrawn()` - Check if lottery was drawn
- `clickEditGroup()` - Click edit button
- `clickDeleteGroup()` - Click delete button
- `confirmDelete()` - Confirm deletion in modal
- `addParticipant(name, email)` - Add new participant
- `addExclusion(blocker, blocked)` - Add exclusion rule
- `clickDrawButton()` - Start lottery draw
- `confirmDraw()` - Confirm draw in modal

## Usage Examples

### Basic Test Flow

```typescript
import { test } from "@playwright/test";
import { LoginPage, DashboardPage, CreateGroupPage, GroupViewPage } from "../pages";

test("create group flow", async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  const createGroupPage = new CreateGroupPage(page);
  const groupViewPage = new GroupViewPage(page);

  // Login
  await loginPage.goto();
  await loginPage.login("user@example.com", "password123");

  // Navigate to create group
  await dashboardPage.expectToBeOnDashboard();
  await dashboardPage.clickCreateGroupCta();

  // Create group
  await createGroupPage.createGroup("Test Group", 100, "2025-12-25");

  // Verify group page
  await groupViewPage.expectGroupName("Test Group");
  await groupViewPage.expectParticipantsCount(1);
});
```

### Using Assertions

All page objects include built-in assertion methods using Playwright's `expect`:

```typescript
// Instead of:
await expect(page).toHaveURL(/dashboard/);
await expect(page.getByTestId("group-name")).toContainText("Test");

// Use:
await dashboardPage.expectToBeOnDashboard();
await groupViewPage.expectGroupName("Test");
```

### Accessing Locators

You can access locators directly when needed:

```typescript
const groupViewPage = new GroupViewPage(page);

// Use locators for custom assertions
await expect(groupViewPage.groupName).toBeVisible();
await expect(groupViewPage.drawButton).toHaveAttribute("disabled");
```

## Best Practices

### 1. Use Semantic Selectors First

Prioritize selectors in this order:

1. By test ID (`data-testid`)
2. By role (`getByRole`)
3. By label (`getByLabel`)
4. By text (`getByText`)

```typescript
// Good: Using test ID
this.emailInput = page.getByTestId("login-email-input");

// Alternative: Using label (more semantic)
this.emailByLabel = page.getByLabel("Email");
```

### 2. Keep Methods Focused

Each method should do one thing:

```typescript
// Good
async fillEmail(email: string): Promise<void> {
  await this.emailInput.fill(email);
}

// Bad: Doing too much
async fillEmailAndSubmit(email: string): Promise<void> {
  await this.emailInput.fill(email);
  await this.passwordInput.fill("default");
  await this.submitButton.click();
  await this.page.waitForNavigation();
}
```

### 3. Provide High-Level and Low-Level Methods

```typescript
// High-level: Complete flow
async login(email: string, password: string): Promise<void> {
  await this.fillEmail(email);
  await this.fillPassword(password);
  await this.clickSubmit();
  await this.waitForNavigation(/dashboard/);
}

// Low-level: Individual actions
async fillEmail(email: string): Promise<void> {
  await this.emailInput.fill(email);
}
```

### 4. Use Descriptive Method Names

```typescript
// Good
async clickCreateGroupCta(): Promise<void>
async expectSubmitButtonDisabled(): Promise<void>
async hasParticipant(name: string): Promise<boolean>

// Bad
async click(): Promise<void>
async check(): Promise<void>
async get(): Promise<any>
```

### 5. Handle Waits in Page Objects

Encapsulate waiting logic inside page objects:

```typescript
async clickSubmit(): Promise<void> {
  await this.submitButton.click();
  // Wait for navigation automatically
  await this.waitForNavigation(/groups\/\d+/);
}
```

### 6. Return Useful Information

Return data that tests might need:

```typescript
async getCreatedGroupId(): Promise<number | null> {
  const url = await this.getCurrentUrl();
  const match = url.match(/groups\/(\d+)/);
  return match ? parseInt(match[1]) : null;
}
```

## Testing Guidelines

### 1. Initialize Page Objects in beforeEach

```typescript
test.describe("Group Tests", () => {
  let groupViewPage: GroupViewPage;

  test.beforeEach(async ({ page }) => {
    groupViewPage = new GroupViewPage(page);
  });

  test("should display group name", async () => {
    await groupViewPage.gotoGroup(123);
    await groupViewPage.expectGroupName("Test");
  });
});
```

### 2. Use Assertions from Page Objects

```typescript
// Prefer built-in assertions
await createGroupPage.expectSubmitButtonDisabled();

// Over manual assertions
await expect(createGroupPage.submitButton).toBeDisabled();
```

### 3. Chain Actions Logically

```typescript
// Create readable test flows
await loginPage.goto();
await loginPage.login(email, password);
await dashboardPage.clickCreateGroupCta();
await createGroupPage.createGroup(name, budget, date);
await groupViewPage.expectGroupName(name);
```

## Maintenance

### When to Update Page Objects

1. **New features**: Add new methods for new UI elements
2. **Changed selectors**: Update locators if data-testid or structure changes
3. **New flows**: Add high-level methods for common user journeys
4. **Bug fixes**: Update methods if behavior changes

### Updating Locators

When UI changes, update locators in one place:

```typescript
// Before
this.submitButton = page.getByTestId("old-submit-button");

// After
this.submitButton = page.getByTestId("new-submit-button");
```

All tests using `submitButton` will automatically work with the new locator.

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Locators Guide](https://playwright.dev/docs/locators)
