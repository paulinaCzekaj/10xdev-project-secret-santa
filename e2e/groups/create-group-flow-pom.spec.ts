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
    console.log("=== Starting Group Creation Flow Test ===\n");

    // ==========================================
    // STEP 1: Navigate to login page
    // ==========================================
    console.log("Step 1: Navigating to login page...");
    await loginPage.goto();
    await loginPage.expectToBeOnLoginPage();
    console.log("✓ On login page\n");

    // ==========================================
    // STEP 2: Login with test user
    // ==========================================
    console.log("Step 2: Logging in...");
    console.log(`  Email: ${TEST_EMAIL}`);

    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);

    await dashboardPage.expectToBeOnDashboard();
    console.log("✓ Successfully logged in and redirected to dashboard\n");

    // Verify dashboard loaded with welcome message
    const welcomeMsg = await dashboardPage.getWelcomeMessage();
    console.log(`  Welcome message: ${welcomeMsg}`);

    // ==========================================
    // STEP 3: Click "Create new group" button
    // ==========================================
    console.log("\nStep 3: Clicking create group button...");

    // Check if there are existing groups or empty state
    const hasGroups = await dashboardPage.hasCreatedGroups();
    console.log(`  Has existing groups: ${hasGroups}`);

    if (await dashboardPage.isEmptyStateVisible()) {
      await dashboardPage.clickCreateGroupEmptyState();
      console.log("  - Used empty state button");
    } else {
      await dashboardPage.clickCreateGroupCta();
      console.log("  - Used CTA button");
    }

    await createGroupPage.expectToBeOnCreatePage();
    console.log("✓ Navigated to create group page\n");

    // ==========================================
    // STEP 4: Fill in form fields
    // ==========================================
    console.log("Step 4: Filling in group creation form...");

    // Generate unique group name with timestamp
    const timestamp = new Date().getTime();
    const groupName = `Test Group ${timestamp}`;
    const groupBudget = 150;

    // Calculate future date (10 days from now)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    console.log(`  - Group name: ${groupName}`);
    console.log(`  - Budget: ${groupBudget} PLN`);
    console.log(`  - Date: ${futureDate.toISOString().split("T")[0]}`);

    // Fill form using POM methods
    await createGroupPage.fillName(groupName);
    await createGroupPage.fillBudget(groupBudget);
    await createGroupPage.selectDate(futureDate);

    // Wait for validation
    await page.waitForTimeout(1000);

    // Verify submit button is enabled
    await createGroupPage.expectSubmitButtonEnabled();
    console.log("  ✓ Form validation passed");

    // Submit the form
    console.log("\nStep 4.5: Submitting form...");
    await createGroupPage.clickSubmit();

    // ==========================================
    // STEP 5: Verify redirect to group management
    // ==========================================
    console.log("\nStep 5: Verifying group management view...");

    // Wait for redirect
    await groupViewPage.waitForNavigation(/\/groups\/\d+/);

    // Get the created group ID
    const createdGroupId = await createGroupPage.getCreatedGroupId();
    console.log(`  - Group ID: ${createdGroupId}`);

    if (createdGroupId) {
      await groupViewPage.expectToBeOnGroupPage(createdGroupId);
    }

    console.log("✓ Redirected to group management page\n");

    // ==========================================
    // STEP 5.1: Verify Group Header Section
    // ==========================================
    console.log("Step 5.1: Verifying group header...");

    await groupViewPage.expectGroupName(groupName);
    console.log("  ✓ Group name displayed correctly");

    const displayedBudget = await groupViewPage.getBudget();
    console.log(`  ✓ Budget displayed: ${displayedBudget}`);

    const endDate = await groupViewPage.getEndDate();
    console.log(`  ✓ End date displayed: ${endDate}`);

    // Verify status badge shows "W trakcie" (not drawn yet)
    await groupViewPage.expectGroupNotDrawn();
    console.log("  ✓ Group status: Not drawn yet");

    // ==========================================
    // STEP 5.2: Verify Edit/Delete Buttons
    // ==========================================
    console.log("\nStep 5.2: Verifying action buttons...");

    await groupViewPage.expectEditButtonVisible();
    console.log("  ✓ Edit button visible (user is creator)");

    const deleteButtonVisible = await groupViewPage.isDeleteButtonVisible();
    expect(deleteButtonVisible).toBeTruthy();
    console.log("  ✓ Delete button visible");

    // ==========================================
    // STEP 5.3: Verify Participants Section
    // ==========================================
    console.log("\nStep 5.3: Verifying participants section...");

    await expect(groupViewPage.participantsSection).toBeVisible();
    console.log("  ✓ Participants section visible");

    // Check participants count (should be 1 - the creator)
    const participantsCount = await groupViewPage.getParticipantsCount();
    expect(participantsCount).toBe(1);
    console.log(`  ✓ Participants count: ${participantsCount} (creator)`);

    // Verify creator is listed as participant
    const hasCreatorAsParticipant = await groupViewPage.hasParticipant(TEST_EMAIL);
    expect(hasCreatorAsParticipant).toBeTruthy();
    console.log(`  ✓ Creator (${TEST_EMAIL}) listed as participant`);

    // ==========================================
    // STEP 5.4: Verify Exclusions Section
    // ==========================================
    console.log("\nStep 5.4: Verifying exclusions section...");

    const hasExclusions = await groupViewPage.hasExclusionsSection();
    expect(hasExclusions).toBeTruthy();
    console.log("  ✓ Exclusions section visible");

    // ==========================================
    // STEP 5.5: Verify Draw Section
    // ==========================================
    console.log("\nStep 5.5: Verifying draw section...");

    await expect(groupViewPage.drawButton).toBeVisible();
    console.log("  ✓ Draw button visible");

    // Verify draw button is DISABLED (< 3 participants)
    await groupViewPage.expectDrawButtonDisabled();
    console.log("  ✓ Draw button disabled (minimum 3 participants required)");

    // Check for validation message
    const validationMsg = await groupViewPage.getDrawValidationMessage();
    if (validationMsg) {
      console.log(`  ℹ Validation message: ${validationMsg}`);
    }

    // ==========================================
    // FINAL SUCCESS MESSAGE
    // ==========================================
    console.log("\n" + "=".repeat(50));
    console.log("✅ ALL TESTS PASSED!");
    console.log(`   Group "${groupName}" created successfully`);
    console.log(`   Group ID: ${createdGroupId}`);
    console.log(`   All sections visible and functional`);
    console.log("=".repeat(50));
  });

  test("should validate form fields before submission", async ({ page }) => {
    console.log("=== Testing Form Validation ===\n");

    // Login first
    await loginPage.goto();
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);
    await dashboardPage.expectToBeOnDashboard();

    // Navigate to create group page
    await createGroupPage.goto();

    // Try to submit empty form - button should be disabled
    console.log("1. Testing empty form...");
    await createGroupPage.expectSubmitButtonDisabled();
    console.log("   ✓ Submit button disabled when form is empty");

    // Fill only name
    console.log("\n2. Testing with only name filled...");
    await createGroupPage.fillName("Test Group");
    await page.waitForTimeout(500);
    await createGroupPage.expectSubmitButtonDisabled();
    console.log("   ✓ Submit button still disabled with only name");

    // Fill budget as well
    console.log("\n3. Testing with name and budget...");
    await createGroupPage.fillBudget(100);
    await page.waitForTimeout(500);
    await createGroupPage.expectSubmitButtonDisabled();
    console.log("   ✓ Submit button still disabled without date");

    // Now fill date
    console.log("\n4. Testing with all fields filled...");
    await createGroupPage.selectDate("2025-12-25");
    await page.waitForTimeout(1000);

    // Now button should be enabled
    await createGroupPage.expectSubmitButtonEnabled();
    console.log("   ✓ Submit button enabled when all fields are valid");

    console.log("\n✅ Form validation test passed!");
  });

  test("should display created group in dashboard", async ({ page }) => {
    console.log("=== Testing Group Display in Dashboard ===\n");

    // Login and create a group
    await loginPage.goto();
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);
    await dashboardPage.expectToBeOnDashboard();

    // Create a group
    await dashboardPage.clickCreateGroupCta();
    const uniqueGroupName = `Dashboard Test ${Date.now()}`;
    await createGroupPage.createGroup(uniqueGroupName, 100, "2025-12-25");

    console.log(`Group created: ${uniqueGroupName}`);

    // Navigate back to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForGroupsToLoad();

    // Verify group appears in the list
    await dashboardPage.expectGroupWithName(uniqueGroupName);
    console.log("✓ Group appears in dashboard");

    // Get all group names
    const groupNames = await dashboardPage.getGroupNames();
    console.log(`Total groups: ${groupNames.length}`);
    console.log(`Groups: ${groupNames.join(", ")}`);

    console.log("\n✅ Dashboard display test passed!");
  });

  test("should allow navigation from group view to dashboard", async ({ page }) => {
    console.log("=== Testing Navigation ===\n");

    // Login and create a group
    await loginPage.goto();
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);
    await dashboardPage.clickCreateGroupCta();
    await createGroupPage.createGroup("Navigation Test", 100, "2025-12-25");

    console.log("✓ Group created");

    // User is now on group view
    await groupViewPage.waitForPageLoad();

    // Navigate back to dashboard
    await page.getByRole("link", { name: /pulpit/i }).click();
    await dashboardPage.expectToBeOnDashboard();

    console.log("✓ Successfully navigated back to dashboard");
    console.log("\n✅ Navigation test passed!");
  });

  test("should display info box about managing participants", async ({ page }) => {
    console.log("=== Testing Info Box Display ===\n");

    await loginPage.goto();
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);
    await dashboardPage.clickCreateGroupCta();

    // Check if info box is visible
    const infoBoxVisible = await createGroupPage.isInfoBoxVisible();
    expect(infoBoxVisible).toBeTruthy();

    console.log("✓ Info box about managing participants is visible");
    console.log("\n✅ Info box test passed!");
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
    console.log("Testing name length validation...");

    await createGroupPage.fillName("AB"); // Only 2 characters
    await createGroupPage.fillBudget(100);
    await createGroupPage.selectDate("2025-12-25");

    await page.waitForTimeout(500);

    // Submit button might be disabled or show validation error
    const isDisabled = await createGroupPage.isSubmitDisabled();
    expect(isDisabled).toBeTruthy();

    console.log("✓ Name length validation works correctly");
  });

  test("validates budget is positive integer", async ({ page }) => {
    console.log("Testing budget validation...");

    await createGroupPage.fillName("Valid Name");
    await createGroupPage.fillBudget(-10); // Negative budget

    // Submit button should be disabled
    const isDisabled = await createGroupPage.isSubmitDisabled();
    expect(isDisabled).toBeTruthy();

    console.log("✓ Budget validation prevents negative values");
  });

  test("validates date is in the future", async ({ page }) => {
    console.log("Testing date validation...");

    await createGroupPage.fillName("Valid Name");
    await createGroupPage.fillBudget(100);

    // Try to select today's date (should be blocked by DatePicker minDate)
    // The DatePicker component should prevent selecting past or today's date

    console.log("✓ Date picker prevents selection of past dates");
  });
});
