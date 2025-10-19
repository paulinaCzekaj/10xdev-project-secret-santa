import { Page, Locator } from "@playwright/test";

/**
 * Base Page Object Model class
 * Provides common functionality for all page objects
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get the current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(urlPattern?: string | RegExp): Promise<void> {
    if (urlPattern) {
      await this.page.waitForURL(urlPattern);
    } else {
      await this.page.waitForLoadState("networkidle");
    }
  }

  /**
   * Click an element and wait for navigation
   */
  async clickAndWaitForNavigation(locator: Locator, urlPattern?: string | RegExp): Promise<void> {
    await locator.click();
    await this.waitForNavigation(urlPattern);
  }

  /**
   * Fill a form field by label
   */
  async fillByLabel(label: string, value: string): Promise<void> {
    await this.page.getByLabel(label).fill(value);
  }

  /**
   * Fill a form field by placeholder
   */
  async fillByPlaceholder(placeholder: string, value: string): Promise<void> {
    await this.page.getByPlaceholder(placeholder).fill(value);
  }

  /**
   * Fill a form field by test ID
   */
  async fillByTestId(testId: string, value: string): Promise<void> {
    await this.page.getByTestId(testId).fill(value);
  }

  /**
   * Click a button by role and name
   */
  async clickButton(name: string | RegExp): Promise<void> {
    await this.page.getByRole("button", { name }).click();
  }

  /**
   * Click a link by role and name
   */
  async clickLink(name: string | RegExp): Promise<void> {
    await this.page.getByRole("link", { name }).click();
  }

  /**
   * Click an element by test ID
   */
  async clickByTestId(testId: string): Promise<void> {
    await this.page.getByTestId(testId).click();
  }

  /**
   * Check if an element is visible by test ID
   */
  async isVisibleByTestId(testId: string): Promise<boolean> {
    return await this.page.getByTestId(testId).isVisible();
  }

  /**
   * Wait for an element to be visible by test ID
   */
  async waitForTestId(testId: string, options?: { timeout?: number }): Promise<void> {
    await this.page.getByTestId(testId).waitFor({ state: "visible", ...options });
  }

  /**
   * Get text content by test ID
   */
  async getTextByTestId(testId: string): Promise<string | null> {
    return await this.page.getByTestId(testId).textContent();
  }

  /**
   * Wait for API response
   */
  async waitForApiResponse(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForResponse(urlPattern);
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/${name}.png` });
  }
}
