import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model for Create Group Page
 * Represents the group creation form
 */
export class CreateGroupPage extends BasePage {
  // Form elements
  readonly formContainer: Locator;
  readonly nameInput: Locator;
  readonly budgetInput: Locator;
  readonly datePicker: Locator;
  readonly submitButton: Locator;

  // Alternative selectors (by label)
  readonly nameByLabel: Locator;
  readonly budgetByLabel: Locator;
  readonly dateByLabel: Locator;

  // Info and error messages
  readonly infoBox: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Data-testid selectors (primary)
    this.formContainer = page.getByTestId("create-group-form-container");
    this.nameInput = page.getByTestId("create-group-name-input");
    this.budgetInput = page.getByTestId("create-group-budget-input");
    this.datePicker = page.getByTestId("create-group-date-picker");
    this.submitButton = page.getByTestId("create-group-submit-button");

    // Alternative semantic selectors
    this.nameByLabel = page.getByLabel("Nazwa loterii");
    this.budgetByLabel = page.getByLabel("Limit budżetu");
    this.dateByLabel = page.getByLabel("Data losowania");

    // Messages
    this.infoBox = page.locator(".bg-pink-50");
    this.errorMessage = page.locator(".text-red-700");
  }

  /**
   * Navigate to create group page
   */
  async goto(): Promise<void> {
    await super.goto("/groups/new");
    await this.waitForPageLoad();
  }

  /**
   * Check if form is visible
   */
  async isFormVisible(): Promise<boolean> {
    return await this.formContainer.isVisible();
  }

  /**
   * Fill group name
   */
  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  /**
   * Fill budget
   */
  async fillBudget(budget: number): Promise<void> {
    await this.budgetInput.fill(budget.toString());
  }

  /**
   * Select date using the date picker
   * @param date - Date in format YYYY-MM-DD or Date object
   */
  async selectDate(date: string | Date): Promise<void> {
    await this.datePicker.click();

    // Wait for calendar popover to open
    await this.page.locator("[data-slot='popover-content']").waitFor({ state: "visible" });

    // Parse date
    let targetDate: Date;
    if (typeof date === "string") {
      targetDate = new Date(date);
    } else {
      targetDate = date;
    }

    // Click on the specific date button in the calendar
    const day = targetDate.getDate();
    const dateButton = this.page.locator(`[data-slot='button'][data-day]`).filter({ hasText: day.toString() }).first();
    await dateButton.click();
  }

  /**
   * Alternative: Fill date by typing (if input allows)
   * Note: This might not work with DatePicker component that uses a modal
   */
  async fillDateDirectly(date: string): Promise<void> {
    await this.dateByLabel.fill(date);
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
   * Complete group creation flow
   * @param name - Group name
   * @param budget - Budget amount
   * @param date - Event date (YYYY-MM-DD)
   * @param waitForNavigation - Whether to wait for navigation to group page
   */
  async createGroup(
    name: string,
    budget: number,
    date: string | Date,
    waitForNavigation = true
  ): Promise<void> {
    await this.fillName(name);
    await this.fillBudget(budget);
    await this.selectDate(date);
    await this.clickSubmit();

    if (waitForNavigation) {
      // Wait for redirect to group view page
      await this.waitForNavigation(/groups\/\d+/);
    }
  }

  /**
   * Create group using semantic selectors (labels)
   */
  async createGroupWithLabels(name: string, budget: number, date: string): Promise<void> {
    await this.nameByLabel.fill(name);
    await this.budgetByLabel.fill(budget.toString());
    // For date, we still need to use the picker
    await this.selectDate(date);
    await this.page.getByRole("button", { name: /utwórz loterię/i }).click();
    await this.waitForNavigation(/groups\/\d+/);
  }

  /**
   * Attempt to create group without waiting (for validation testing)
   */
  async attemptCreateGroup(name?: string, budget?: number, date?: string | Date): Promise<void> {
    if (name) await this.fillName(name);
    if (budget !== undefined) await this.fillBudget(budget);
    if (date) await this.selectDate(date);
    await this.clickSubmit();
  }

  /**
   * Get validation error for a specific field
   */
  async getFieldError(fieldLabel: string): Promise<string | null> {
    // Find the form field by label and get its error message
    const field = this.page.getByLabel(fieldLabel);
    const formItem = field.locator("..").locator("..");
    const errorElement = formItem.locator(".text-destructive");

    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }

    return null;
  }

  /**
   * Check if info box is visible
   */
  async isInfoBoxVisible(): Promise<boolean> {
    return await this.infoBox.isVisible();
  }

  /**
   * Get API error message
   */
  async getApiErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Wait for success toast notification
   */
  async waitForSuccessToast(): Promise<void> {
    await this.page.locator("[role='status']").waitFor({ state: "visible" });
  }

  /**
   * Get the created group ID from URL after redirect
   */
  async getCreatedGroupId(): Promise<number | null> {
    const url = await this.getCurrentUrl();
    const match = url.match(/groups\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Assertions
   */
  async expectToBeOnCreatePage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/groups\/new/);
    await expect(this.formContainer).toBeVisible();
  }

  async expectSubmitButtonDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  async expectSubmitButtonEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
  }

  async expectValidationError(fieldLabel: string): Promise<void> {
    const error = await this.getFieldError(fieldLabel);
    expect(error).not.toBeNull();
  }

  async expectRedirectToGroup(): Promise<void> {
    await expect(this.page).toHaveURL(/\/groups\/\d+/);
  }

  async expectSuccessToast(): Promise<void> {
    await expect(this.page.locator("[role='status']")).toBeVisible();
  }

  async expectApiError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
  }
}
