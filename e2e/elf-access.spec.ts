import { test, expect } from "@playwright/test";

/**
 * E2E Test: Elf Access to Results
 *
 * Scenario:
 * 1. Login as an authenticated user who is an elf
 * 2. Navigate to elf result page
 * 3. Verify elf can see the result of the participant they are helping
 * 4. Verify tracking of elf access works
 *
 * Prerequisites:
 * - Test database must have:
 *   - An authenticated user who is assigned as an elf (elf_for_participant_id set)
 *   - The helped participant must have a completed draw (assignment exists)
 *   - The receiver must have a wishlist
 */
test.describe("Elf Access to Results", () => {
  // Test credentials - these should be set up in test database
  const ELF_EMAIL = process.env.E2E_ELF_USERNAME || "elf@example.com";
  const ELF_PASSWORD = process.env.E2E_ELF_PASSWORD || "password123";

  test("authenticated elf can view helped participant's result", async ({ page }) => {
    // ==========================================
    // STEP 1: Navigate to login page and login as elf
    // ==========================================
    await page.goto("/login");

    // Fill login form
    await page.fill('input[name="email"]', ELF_EMAIL);
    await page.fill('input[name="password"]', ELF_PASSWORD);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL(/dashboard/);
    await expect(page).toHaveURL(/dashboard/);

    // ==========================================
    // STEP 2: Navigate to elf result page
    // ==========================================
    // This would typically be accessed via a link or button in the UI
    // For now, we'll assume direct navigation to elf result endpoint
    // In real implementation, this would be a frontend page that calls the API

    // For E2E test, we can test the API endpoint directly
    // or navigate to the frontend page that displays elf results

    // Since we don't have the frontend yet, we'll test the API response
    // by making a direct API call (this requires authentication token)

    // Get authentication token from localStorage or session
    const authToken = await page.evaluate(() => {
      // Try to get from localStorage (adjust based on your auth implementation)
      return localStorage.getItem("supabase.auth.token") || sessionStorage.getItem("supabase.auth.token");
    });

    expect(authToken).toBeTruthy();

    // ==========================================
    // STEP 3: Test elf result API endpoint
    // ==========================================
    // Make API call to get elf result
    const apiResponse = await page.request.get("/api/participants/1/elf-result", {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    expect(apiResponse.status()).toBe(200);

    const elfResult = await apiResponse.json();

    // Verify response structure
    expect(elfResult).toHaveProperty("assignment");
    expect(elfResult).toHaveProperty("group");
    expect(elfResult).toHaveProperty("helpedParticipant");

    // Verify assignment data
    expect(elfResult.assignment).toHaveProperty("receiverName");
    expect(elfResult.assignment).toHaveProperty("receiverWishlist");
    expect(elfResult.assignment).toHaveProperty("receiverWishlistHtml");

    // Verify group data
    expect(elfResult.group).toHaveProperty("id");
    expect(elfResult.group).toHaveProperty("name");
    expect(elfResult.group).toHaveProperty("budget");
    expect(elfResult.group).toHaveProperty("endDate");

    // Verify helped participant data
    expect(elfResult.helpedParticipant).toHaveProperty("id");
    expect(elfResult.helpedParticipant).toHaveProperty("name");

    // ==========================================
    // STEP 4: Test elf access tracking
    // ==========================================
    const trackingResponse = await page.request.post("/api/participants/1/track-elf-access", {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    expect(trackingResponse.status()).toBe(200);

    const trackingResult = await trackingResponse.json();
    expect(trackingResult).toEqual({ success: true });
  });

  test("non-elf user cannot access elf endpoints", async ({ page }) => {
    // ==========================================
    // STEP 1: Login as regular user (not an elf)
    // ==========================================
    const REGULAR_EMAIL = process.env.E2E_REGULAR_USERNAME || "regular@example.com";
    const REGULAR_PASSWORD = process.env.E2E_REGULAR_PASSWORD || "password123";

    await page.goto("/login");

    await page.fill('input[name="email"]', REGULAR_EMAIL);
    await page.fill('input[name="password"]', REGULAR_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard/);

    // Get auth token
    const authToken = await page.evaluate(() => {
      return localStorage.getItem("supabase.auth.token") || sessionStorage.getItem("supabase.auth.token");
    });

    expect(authToken).toBeTruthy();

    // ==========================================
    // STEP 2: Try to access elf endpoint - should be forbidden
    // ==========================================
    const apiResponse = await page.request.get("/api/participants/1/elf-result", {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    // Should return 403 Forbidden
    expect(apiResponse.status()).toBe(403);

    const errorResponse = await apiResponse.json();
    expect(errorResponse.error.code).toBe("FORBIDDEN");
  });

  test("unauthenticated user cannot access elf endpoints", async ({ page }) => {
    // ==========================================
    // STEP 1: Try to access elf endpoint without authentication
    // ==========================================
    const apiResponse = await page.request.get("/api/participants/1/elf-result");

    // Should return 401 Unauthorized
    expect(apiResponse.status()).toBe(401);

    const errorResponse = await apiResponse.json();
    expect(errorResponse.error.code).toBe("UNAUTHORIZED");
  });
});
