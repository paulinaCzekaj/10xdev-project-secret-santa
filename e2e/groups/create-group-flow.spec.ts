import { test, expect } from "@playwright/test";

/**
 * E2E Test: Complete user flow for creating a Secret Santa group
 *
 * Test Scenario:
 * 1. Click login link on homepage
 * 2. Login with test user credentials
 * 3. After loading, click "Create new Secret Santa group" button
 * 4. Fill in all form fields (name, budget, date)
 * 5. Verify that group edit view is displayed
 *
 * Expected Results:
 * - Successful login and redirect to dashboard
 * - Form submission creates group
 * - User is redirected to group management page
 * - All sections are visible (header, participants, exclusions, draw)
 * - Creator is listed as first participant
 * - Draw button is disabled (< 3 participants)
 */

test.describe("Create Secret Santa Group Flow", () => {
  // Test credentials from .env.test
  const TEST_EMAIL = process.env.E2E_USERNAME || "iteniahi@gmail.com";
  const TEST_PASSWORD = process.env.E2E_PASSWORD || "Yociom123";

  test.beforeEach(async ({ page }) => {
    // Start from homepage
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should complete full flow: login → create group → view group management", async ({ page }) => {
    // ==========================================
    // STEP 1: Click login link on homepage
    // ==========================================

    const loginLink = page.locator('a[href*="login"]').first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();

    await page.waitForURL("**/login");

    // ==========================================
    // STEP 2: Login with test user
    // ==========================================

    // Fill in email field with typing simulation to trigger onChange validation
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.click();
    await emailInput.pressSequentially(TEST_EMAIL, { delay: 50 });

    // Fill in password field with typing simulation
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await passwordInput.click();
    await passwordInput.pressSequentially(TEST_PASSWORD, { delay: 50 });

    // Wait for form validation to complete (React Hook Form needs time to process)
    await page.waitForTimeout(1000);

    // Click submit button (should be enabled after validation)
    const submitButton = page.locator('button[type="submit"]', {
      hasText: /zaloguj/i,
    });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Verify dashboard loaded
    await expect(page.locator("h1")).toContainText("Witaj");

    // ==========================================
    // STEP 3: Click "Create new group" button
    // ==========================================

    // Look for the create group button
    // It could be in the empty state or in the CTA section
    const createGroupButton = page
      .locator('a[href="/groups/new"]')
      .filter({ hasText: /utwórz.*grup/i })
      .first();

    await expect(createGroupButton).toBeVisible();
    await createGroupButton.click();

    await page.waitForURL("**/groups/new");

    // Verify page heading (use first() to avoid strict mode violation)
    await expect(page.locator("h1").first()).toContainText(/utwórz.*loter/i);

    // ==========================================
    // STEP 4: Fill in form fields
    // ==========================================

    // Generate unique group name with timestamp
    const timestamp = new Date().getTime();
    const groupName = `Test Group ${timestamp}`;
    const groupBudget = "150";

    // Fill in group name with typing simulation
    const nameInput = page.locator('input[placeholder*="Secret Santa"]');
    await expect(nameInput).toBeVisible();
    await nameInput.click();
    await nameInput.pressSequentially(groupName, { delay: 30 });

    // Fill in budget with typing simulation
    const budgetInput = page.locator('input[type="number"]');
    await expect(budgetInput).toBeVisible();
    await budgetInput.click();
    await budgetInput.pressSequentially(groupBudget, { delay: 30 });

    // Select future date (tomorrow + 5 days)
    const futureDateButton = page.getByRole("button", { name: /wybierz|datę/i });
    await expect(futureDateButton).toBeVisible();
    await futureDateButton.click();

    // Wait for calendar popup
    await page.waitForTimeout(500);

    // Select a date in the future (find first available date button that's not disabled)
    const availableDateButton = page.locator('[role="gridcell"]:not([disabled])').filter({ hasText: /^\d+$/ }).nth(10); // Select ~10 days from now

    await availableDateButton.click();

    // Wait for form validation to complete
    await page.waitForTimeout(1500);

    // ==========================================
    // STEP 4.5: Submit the form
    // ==========================================

    const createButton = page.locator('button[type="submit"]', {
      hasText: /utwórz/i,
    });

    // Verify button is enabled (form is valid)
    await expect(createButton).toBeEnabled({ timeout: 10000 });
    await createButton.click();

    // ==========================================
    // STEP 5: Verify redirect to group management
    // ==========================================

    // Wait for redirect to /groups/[id]
    await page.waitForURL(/\/groups\/\d+$/, { timeout: 10000 });

    // Extract group ID from URL
    const currentUrl = page.url();
    const groupIdMatch = currentUrl.match(/\/groups\/(\d+)/);
    expect(groupIdMatch).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const groupId = groupIdMatch![1];

    // ==========================================
    // STEP 5.1: Verify Group Header Section
    // ==========================================

    // Check that group name is displayed
    await expect(page.locator("h2, h3").filter({ hasText: groupName })).toBeVisible();

    // Check that budget is displayed
    await expect(page.getByText(/150.*PLN/)).toBeVisible();

    // Check for edit and delete buttons
    const editButton = page.locator("button", { hasText: /edytuj/i });
    await expect(editButton).toBeVisible();

    const deleteButton = page.locator("button", { hasText: /usuń/i });
    await expect(deleteButton).toBeVisible();

    // ==========================================
    // STEP 5.2: Verify Participants Section
    // ==========================================

    // Check section heading
    await expect(page.locator("h2, h3").filter({ hasText: /uczestnic/i })).toBeVisible();

    // Check that creator is listed as participant
    // Look for the test user's email in the participants list
    const participantEmail = page.getByText(TEST_EMAIL);
    await expect(participantEmail).toBeVisible();

    // Check for "Add participant" form/button
    const addParticipantButton = page.locator("button", {
      hasText: /dodaj.*uczestnic/i,
    });
    await expect(addParticipantButton).toBeVisible();

    // ==========================================
    // STEP 5.3: Verify Exclusions Section
    // ==========================================

    // Check section heading
    await expect(page.locator("h2, h3").filter({ hasText: /wykluczeni/i })).toBeVisible();

    // ==========================================
    // STEP 5.4: Verify Draw Section
    // ==========================================

    // Check for draw section
    await expect(page.locator("h2, h3").filter({ hasText: /losowani/i })).toBeVisible();

    // Check that draw button exists
    const drawButton = page.locator("button", { hasText: /rozpocznij.*losowani/i });
    await expect(drawButton).toBeVisible();

    // Verify draw button is DISABLED (< 3 participants)
    await expect(drawButton).toBeDisabled();

    // ==========================================
    // FINAL SUCCESS MESSAGE
    // ==========================================
  });

  test("should validate form fields before submission", async ({ page }) => {
    // Login first
    await page.goto("/login");
    const emailField = page.locator('input[type="email"]');
    await emailField.click();
    await emailField.pressSequentially(TEST_EMAIL, { delay: 50 });

    const passwordField = page.locator('input[type="password"]');
    await passwordField.click();
    await passwordField.pressSequentially(TEST_PASSWORD, { delay: 50 });

    await page.waitForTimeout(1000);

    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeEnabled({ timeout: 5000 });
    await loginButton.click();
    await page.waitForURL("**/dashboard");

    // Navigate to create group page
    await page.goto("/groups/new");

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();

    // Fill only name
    await page.locator('input[placeholder*="Secret Santa"]').fill("Test Group");
    await expect(submitButton).toBeDisabled();

    // Fill budget as well
    await page.locator('input[type="number"]').fill("100");
    await expect(submitButton).toBeDisabled();

    // Now fill date
    const datePickerButton = page.getByRole("button", { name: /wybierz|datę/i });
    await expect(datePickerButton).toBeVisible();
    await datePickerButton.click();
    await page.waitForTimeout(500);
    await page.locator('[role="gridcell"]:not([disabled])').filter({ hasText: /^\d+$/ }).nth(5).click();

    // Now button should be enabled
    await expect(submitButton).toBeEnabled({ timeout: 2000 });
  });
});
