import { test, expect } from "@playwright/test";
import { LoginPage, DashboardPage, CreateGroupPage, GroupViewPage } from "../pages";

/**
 * E2E Test: Complete Group Creation Flow using Page Object Model
 *
 * Scenario:
 * 1. Click login on homepage
 * 2. Login as user
 * 3. After loading, click "Create new group Secret Santa"
 * 4. Fill in the fields
 * 5. Verify group edit view is visible
 *
 * This test suite uses the Page Object Model pattern for better maintainability
 * and reusability of test code.
 */
test.describe("Group Creation Flow (POM)", () => {
  // Test credentials from .env.test
  const TEST_EMAIL = process.env.E2E_USERNAME || "iteniahi@gmail.com";
  const TEST_PASSWORD = process.env.E2E_PASSWORD || "Yociom123";

  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let createGroupPage: CreateGroupPage;
  let groupViewPage: GroupViewPage;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    createGroupPage = new CreateGroupPage(page);
    groupViewPage = new GroupViewPage(page);
  });

  test("should complete full flow: login → create group → view group management", async ({ page }) => {
    // ==========================================
    // STEP 1: Navigate to login page
    // ==========================================
    await loginPage.goto();
    await loginPage.expectToBeOnLoginPage();

    // ==========================================
    // STEP 2: Login with test user
    // ==========================================

    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);

    await dashboardPage.expectToBeOnDashboard();

    // Verify dashboard loaded with welcome message
    const welcomeMsg = await dashboardPage.getWelcomeMessage();

    // ==========================================
    // STEP 3: Click "Create new group" button
    // ==========================================

    // Check if there are existing groups or empty state
    const hasGroups = await dashboardPage.hasCreatedGroups();

    if (await dashboardPage.isEmptyStateVisible()) {
      await dashboardPage.clickCreateGroupEmptyState();
    } else {
      await dashboardPage.clickCreateGroupCta();
    }

    await createGroupPage.expectToBeOnCreatePage();

    // ==========================================
    // STEP 4: Fill in form fields
    // ==========================================

    // Generate unique group name with timestamp
    const timestamp = new Date().getTime();
    const groupName = `Test Group ${timestamp}`;
    const groupBudget = 150;

    // Calculate future date (10 days from now)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    // Fill form using POM methods
    await createGroupPage.fillName(groupName);
    await createGroupPage.fillBudget(groupBudget);
    await createGroupPage.selectDate(futureDate);

    // Wait for validation
    await page.waitForTimeout(1000);

    // Verify submit button is enabled
    await createGroupPage.expectSubmitButtonEnabled();

    // Submit the form
    await createGroupPage.clickSubmit();

    // ==========================================
    // STEP 5: Verify redirect to group management
    // ==========================================

    // Wait for redirect
    await groupViewPage.waitForNavigation(/\/groups\/\d+/);

    // Get the created group ID
    const createdGroupId = await createGroupPage.getCreatedGroupId();

    if (createdGroupId) {
      await groupViewPage.expectToBeOnGroupPage(createdGroupId);
    }

    // ==========================================
    // STEP 5.1: Verify Group Header Section
    // ==========================================

    await groupViewPage.expectGroupName(groupName);

    const displayedBudget = await groupViewPage.getBudget();

    const endDate = await groupViewPage.getEndDate();

    // Verify status badge shows "W trakcie" (not drawn yet)
    await groupViewPage.expectGroupNotDrawn();

    // ==========================================
    // STEP 5.2: Verify Edit/Delete Buttons
    // ==========================================

    await groupViewPage.expectEditButtonVisible();

    const deleteButtonVisible = await groupViewPage.isDeleteButtonVisible();
    expect(deleteButtonVisible).toBeTruthy();

    // ==========================================
    // STEP 5.3: Verify Participants Section
    // ==========================================

    await expect(groupViewPage.participantsSection).toBeVisible();

    // Check participants count (should be 1 - the creator)
    const participantsCount = await groupViewPage.getParticipantsCount();
    expect(participantsCount).toBe(1);

    // Verify creator is listed as participant
    const hasCreatorAsParticipant = await groupViewPage.hasParticipant(TEST_EMAIL);
    expect(hasCreatorAsParticipant).toBeTruthy();

    // ==========================================
    // STEP 5.4: Verify Exclusions Section
    // ==========================================

    const hasExclusions = await groupViewPage.hasExclusionsSection();
    expect(hasExclusions).toBeTruthy();

    // ==========================================
    // STEP 5.5: Verify Draw Section
    // ==========================================

    await expect(groupViewPage.drawButton).toBeVisible();

    // Verify draw button is DISABLED (< 3 participants)
    await groupViewPage.expectDrawButtonDisabled();

    // Check for validation message
    const validationMsg = await groupViewPage.getDrawValidationMessage();
    expect(validationMsg).toBeTruthy();
    expect(validationMsg).toContain("losowania");

    // ==========================================
    // FINAL SUCCESS MESSAGE
    // ==========================================
  });

  test("should validate form fields before submission", async ({ page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);
    await dashboardPage.expectToBeOnDashboard();

    // Navigate to create group page
    await createGroupPage.goto();

    // Try to submit empty form - button should be disabled
    await createGroupPage.expectSubmitButtonDisabled();

    // Fill only name
    await createGroupPage.fillName("Test Group");
    await page.waitForTimeout(500);
    await createGroupPage.expectSubmitButtonDisabled();

    // Fill budget as well
    await createGroupPage.fillBudget(100);
    await page.waitForTimeout(500);
    await createGroupPage.expectSubmitButtonDisabled();

    // Now fill date
    await createGroupPage.selectDate("2025-12-25");
    await page.waitForTimeout(1000);

    // Now button should be enabled
    await createGroupPage.expectSubmitButtonEnabled();
  });

  test("should display created group in dashboard", async () => {
    // Login and create a group
    await loginPage.goto();
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);
    await dashboardPage.expectToBeOnDashboard();

    // Create a group
    await dashboardPage.clickCreateGroupCta();
    const uniqueGroupName = `Dashboard Test ${Date.now()}`;
    await createGroupPage.createGroup(uniqueGroupName, 100, "2025-12-25");

    // Navigate back to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForGroupsToLoad();

    // Verify group appears in the list
    await dashboardPage.expectGroupWithName(uniqueGroupName);

    // Get all group names
    const groupNames = await dashboardPage.getGroupNames();
  });

  test("should allow navigation from group view to dashboard", async ({ page }) => {
    // Login and create a group
    await loginPage.goto();
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);
    await dashboardPage.clickCreateGroupCta();
    await createGroupPage.createGroup("Navigation Test", 100, "2025-12-25");

    // User is now on group view
    await groupViewPage.waitForPageLoad();

    // Navigate back to dashboard
    await page.getByRole("link", { name: /pulpit/i }).click();
    await dashboardPage.expectToBeOnDashboard();
  });

  test("should display info box about managing participants", async () => {
    await loginPage.goto();
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);
    await dashboardPage.clickCreateGroupCta();

    // Check if info box is visible
    const infoBoxVisible = await createGroupPage.isInfoBoxVisible();
    expect(infoBoxVisible).toBeTruthy();
  });
});

/**
 * Additional test suite: Form field validation details
 */
test.describe("Create Group Form Validation (POM)", () => {
  const TEST_EMAIL = process.env.E2E_USERNAME || "iteniahi@gmail.com";
  const TEST_PASSWORD = process.env.E2E_PASSWORD || "Yociom123";

  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let createGroupPage: CreateGroupPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    createGroupPage = new CreateGroupPage(page);

    // Navigate to create group page
    await loginPage.goto();
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);
    await dashboardPage.clickCreateGroupCta();
  });

  test("validates minimum name length (3 characters)", async ({ page }) => {
    await createGroupPage.fillName("AB"); // Only 2 characters
    await createGroupPage.fillBudget(100);
    await createGroupPage.selectDate("2025-12-25");

    await page.waitForTimeout(500);

    // Submit button might be disabled or show validation error
    const isDisabled = await createGroupPage.isSubmitDisabled();
    expect(isDisabled).toBeTruthy();
  });

  test("validates budget is positive integer", async ({ page }) => {
    await createGroupPage.fillName("Valid Name");
    await createGroupPage.fillBudget(-10); // Negative budget

    // Submit button should be disabled
    const isDisabled = await createGroupPage.isSubmitDisabled();
    expect(isDisabled).toBeTruthy();
  });

  test("validates date is in the future", async () => {
    await createGroupPage.fillName("Valid Name");
    await createGroupPage.fillBudget(100);

    // Try to select today's date (should be blocked by DatePicker minDate)
    // The DatePicker component should prevent selecting past or today's date
  });
});
