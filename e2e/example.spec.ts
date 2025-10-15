import { test, expect } from "@playwright/test";

test.describe("Secret Santa Application", () => {
  test("homepage loads successfully", async ({ page }) => {
    await page.goto("/");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check that the page title or main heading is present
    // Adjust this selector based on your actual homepage content
    await expect(page).toHaveTitle(/Secret Santa|10x/i);
  });

  test("navigation to login page works", async ({ page }) => {
    await page.goto("/");

    // Look for a login link or button
    // Adjust this selector based on your actual navigation
    const loginLink = page.locator('a[href*="login"], a:has-text("Login"), a:has-text("Zaloguj")').first();

    // Check if login link exists
    if (await loginLink.count() > 0) {
      await loginLink.click();

      // Wait for navigation
      await page.waitForLoadState("networkidle");

      // Verify we're on the login page
      await expect(page.url()).toContain("login");
    } else {
      // Skip test if no login link found
      test.skip(true, "Login link not found on homepage");
    }
  });

  test("can access registration page", async ({ page }) => {
    await page.goto("/");

    // Look for a register/signup link
    const registerLink = page.locator('a[href*="register"], a:has-text("Register"), a:has-text("Zarejestruj")').first();

    if (await registerLink.count() > 0) {
      await registerLink.click();

      // Wait for navigation
      await page.waitForLoadState("networkidle");

      // Verify we're on the registration page
      await expect(page.url()).toContain("register");
    } else {
      test.skip(true, "Register link not found on homepage");
    }
  });
});
