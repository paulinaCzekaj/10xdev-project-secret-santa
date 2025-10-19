import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model for Login Page
 * Represents the login form and its interactions
 */
export class LoginPage extends BasePage {
  // Locators using data-testid
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordToggle: Locator;
  readonly submitButton: Locator;
  readonly formContainer: Locator;

  // Alternative locators (by label - more semantic)
  readonly emailByLabel: Locator;
  readonly passwordByLabel: Locator;

  // Links
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);

    // Data-testid selectors (primary)
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.passwordToggle = page.getByTestId("login-password-toggle");
    this.submitButton = page.getByTestId("login-submit-button");
    this.formContainer = page.getByTestId("login-form-container");

    // Alternative semantic selectors
    this.emailByLabel = page.getByLabel("Email");
    this.passwordByLabel = page.getByLabel("Hasło");

    // Links
    this.forgotPasswordLink = page.getByRole("link", { name: /zapomniałeś hasła/i });
    this.registerLink = page.getByRole("link", { name: /zarejestruj się/i });
  }

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await super.goto("/login");
    await this.waitForPageLoad();
  }

  /**
   * Check if login form is visible
   */
  async isFormVisible(): Promise<boolean> {
    return await this.formContainer.isVisible();
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    await this.passwordToggle.click();
  }

  /**
   * Check if password is visible (input type is "text")
   */
  async isPasswordVisible(): Promise<boolean> {
    const inputType = await this.passwordInput.getAttribute("type");
    return inputType === "text";
  }

  /**
   * Click submit button
   */
  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }

  /**
   * Complete login flow
   * @param email - User email
   * @param password - User password
   * @param waitForNavigation - Whether to wait for navigation after submit
   */
  async login(email: string, password: string, waitForNavigation = true): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();

    if (waitForNavigation) {
      await this.waitForNavigation(/dashboard/);
    }
  }

  /**
   * Login with semantic selectors (using labels)
   */
  async loginWithLabels(email: string, password: string): Promise<void> {
    await this.emailByLabel.fill(email);
    await this.passwordByLabel.fill(password);
    await this.page.getByRole("button", { name: /zaloguj się/i }).click();
    await this.waitForNavigation(/dashboard/);
  }

  /**
   * Attempt login without waiting for navigation (for error cases)
   */
  async attemptLogin(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  /**
   * Click "Forgot Password" link
   */
  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  /**
   * Click "Register" link
   */
  async clickRegister(): Promise<void> {
    await this.registerLink.click();
  }

  /**
   * Wait for error message to appear
   */
  async waitForErrorMessage(): Promise<void> {
    await this.page.getByRole("alert").waitFor({ state: "visible" });
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    const errorElement = this.page.locator(".text-red-700");
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }

  /**
   * Assertions
   */
  async expectToBeOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.formContainer).toBeVisible();
  }

  async expectSubmitButtonDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  async expectSubmitButtonEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
  }

  async expectErrorVisible(): Promise<void> {
    await expect(this.page.locator(".text-red-700")).toBeVisible();
  }

  async expectRedirectToDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }
}
