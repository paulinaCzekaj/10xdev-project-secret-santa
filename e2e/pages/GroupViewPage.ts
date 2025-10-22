import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model for Group View Page
 * Represents the group management/editing view
 */
export class GroupViewPage extends BasePage {
  // Container
  readonly container: Locator;

  // Group Header
  readonly groupHeader: Locator;
  readonly groupName: Locator;
  readonly groupStatusBadge: Locator;
  readonly groupBudget: Locator;
  readonly groupEndDate: Locator;
  readonly editGroupButton: Locator;
  readonly deleteGroupButton: Locator;

  // Participants Section
  readonly participantsSection: Locator;
  readonly participantsCount: Locator;

  // Buttons and actions
  readonly addParticipantButton: Locator;
  readonly drawButton: Locator;

  constructor(page: Page) {
    super(page);

    // Main container
    this.container = page.getByTestId("group-view-container");

    // Group Header elements
    this.groupHeader = page.getByTestId("group-header");
    this.groupName = page.getByTestId("group-name");
    this.groupStatusBadge = page.getByTestId("group-status-badge");
    this.groupBudget = page.getByTestId("group-budget");
    this.groupEndDate = page.getByTestId("group-end-date");
    this.editGroupButton = page.getByTestId("group-edit-button");
    this.deleteGroupButton = page.getByTestId("group-delete-button");

    // Participants Section
    this.participantsSection = page.getByTestId("participants-section");
    this.participantsCount = page.getByTestId("participants-count");

    // Common buttons (by role)
    this.addParticipantButton = page.getByRole("button", { name: /dodaj uczestnika/i });
    this.drawButton = page.getByRole("button", { name: /rozpocznij losowanie/i });
  }

  /**
   * Navigate to group view by ID
   */
  async gotoGroup(groupId: number): Promise<void> {
    await super.goto(`/groups/${groupId}`);
    await this.waitForPageLoad();
  }

  /**
   * Check if group view container is visible
   */
  async isViewVisible(): Promise<boolean> {
    return await this.container.isVisible();
  }

  /**
   * Get group name text
   */
  async getGroupName(): Promise<string | null> {
    return await this.groupName.textContent();
  }

  /**
   * Get group status badge text
   */
  async getGroupStatus(): Promise<string | null> {
    return await this.groupStatusBadge.textContent();
  }

  /**
   * Get group budget text
   */
  async getBudget(): Promise<string | null> {
    return await this.groupBudget.textContent();
  }

  /**
   * Get group end date text
   */
  async getEndDate(): Promise<string | null> {
    return await this.groupEndDate.textContent();
  }

  /**
   * Check if group is drawn (completed)
   */
  async isGroupDrawn(): Promise<boolean> {
    const status = await this.getGroupStatus();
    return status?.toLowerCase().includes("wylosowano") || false;
  }

  /**
   * Get participants count
   */
  async getParticipantsCount(): Promise<number> {
    const text = await this.participantsCount.textContent();
    if (!text) return 0;

    // Extract number from text like "(3)"
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Check if edit button is visible
   */
  async isEditButtonVisible(): Promise<boolean> {
    return await this.editGroupButton.isVisible();
  }

  /**
   * Check if delete button is visible
   */
  async isDeleteButtonVisible(): Promise<boolean> {
    return await this.deleteGroupButton.isVisible();
  }

  /**
   * Click edit group button
   */
  async clickEditGroup(): Promise<void> {
    await this.editGroupButton.click();
    // Wait for modal to appear
    await this.page.locator("[role='dialog']").waitFor({ state: "visible" });
  }

  /**
   * Click delete group button
   */
  async clickDeleteGroup(): Promise<void> {
    await this.deleteGroupButton.click();
    // Wait for confirmation dialog
    await this.page.locator("[role='alertdialog']").waitFor({ state: "visible" });
  }

  /**
   * Confirm delete in modal
   */
  async confirmDelete(): Promise<void> {
    const dialog = this.page.locator("[role='alertdialog']");
    await dialog.getByRole("button", { name: /potwierdź|usuń/i }).click();
    // Wait for redirect to dashboard
    await this.waitForNavigation(/dashboard/);
  }

  /**
   * Cancel delete in modal
   */
  async cancelDelete(): Promise<void> {
    const dialog = this.page.locator("[role='alertdialog']");
    await dialog.getByRole("button", { name: /anuluj/i }).click();
  }

  /**
   * Add a participant
   */
  async addParticipant(name: string, email?: string): Promise<void> {
    // Fill participant form
    await this.page.getByPlaceholder(/imię/i).fill(name);

    if (email) {
      await this.page.getByPlaceholder(/email/i).fill(email);
    }

    await this.page.getByRole("button", { name: /dodaj uczestnika/i }).click();

    // Wait for participant to be added (list updates)
    await this.page.waitForTimeout(500); // Small delay for UI update
  }

  /**
   * Get all participant rows/cards
   */
  getAllParticipants(): Locator {
    // Returns both table rows (desktop) and cards (mobile)
    return this.page.locator("[role='row'], .participant-card").filter({
      has: this.page.locator("text=/[A-Za-z]+/"),
    });
  }

  /**
   * Get participant by name
   */
  getParticipantByName(name: string): Locator {
    return this.page.locator(`text=${name}`).first();
  }

  /**
   * Check if participant exists
   */
  async hasParticipant(name: string): Promise<boolean> {
    try {
      await this.getParticipantByName(name).waitFor({ state: "visible", timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get exclusions section
   */
  getExclusionsSection(): Locator {
    return this.page.locator("text=/reguły wykluczeń/i").locator("..");
  }

  /**
   * Check if exclusions section is visible
   */
  async hasExclusionsSection(): Promise<boolean> {
    return await this.getExclusionsSection().isVisible();
  }

  /**
   * Add an exclusion rule
   */
  async addExclusion(blockerName: string, blockedName: string): Promise<void> {
    // Open first dropdown (blocker)
    await this.page.getByRole("combobox").first().click();
    await this.page.getByText(blockerName).click();

    // Open second dropdown (blocked)
    await this.page.getByRole("combobox").last().click();
    await this.page.getByText(blockedName).click();

    // Click add exclusion button
    await this.page.getByRole("button", { name: /dodaj wykluczenie/i }).click();
  }

  /**
   * Click draw button (start lottery)
   */
  async clickDrawButton(): Promise<void> {
    await this.drawButton.click();
    // Wait for confirmation modal
    await this.page.locator("[role='dialog']").waitFor({ state: "visible" });
  }

  /**
   * Confirm draw in modal
   */
  async confirmDraw(): Promise<void> {
    const dialog = this.page.locator("[role='dialog']");
    await dialog.getByRole("button", { name: /potwierdź|rozpocznij/i }).click();

    // Wait for draw to complete (page might update)
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Cancel draw in modal
   */
  async cancelDraw(): Promise<void> {
    const dialog = this.page.locator("[role='dialog']");
    await dialog.getByRole("button", { name: /anuluj/i }).click();
  }

  /**
   * Check if draw button is enabled
   */
  async isDrawButtonEnabled(): Promise<boolean> {
    return await this.drawButton.isEnabled();
  }

  /**
   * Get draw validation message (if any)
   */
  async getDrawValidationMessage(): Promise<string | null> {
    const alertBox = this.page.locator("[role='alert']");
    if (await alertBox.isVisible()) {
      return await alertBox.textContent();
    }
    return null;
  }

  /**
   * Check if results section is visible (after draw)
   */
  async hasResultsSection(): Promise<boolean> {
    return await this.page.locator("text=/wyniki losowania/i").isVisible();
  }

  /**
   * Navigate to results page (if available)
   */
  async goToResults(): Promise<void> {
    await this.page.getByRole("button", { name: /zobacz wynik/i }).click();
    await this.waitForNavigation(/result/);
  }

  /**
   * Assertions
   */
  async expectToBeOnGroupPage(groupId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/groups/${groupId}`));
    await expect(this.container).toBeVisible();
  }

  async expectGroupName(name: string): Promise<void> {
    await expect(this.groupName).toContainText(name);
  }

  async expectParticipantsCount(count: number): Promise<void> {
    const text = await this.participantsCount.textContent();
    expect(text).toContain(`(${count})`);
  }

  async expectParticipantVisible(name: string): Promise<void> {
    await expect(this.getParticipantByName(name)).toBeVisible();
  }

  async expectGroupDrawn(): Promise<void> {
    await expect(this.groupStatusBadge).toContainText(/wylosowano/i);
  }

  async expectGroupNotDrawn(): Promise<void> {
    await expect(this.groupStatusBadge).not.toContainText(/wylosowano/i);
  }

  async expectEditButtonVisible(): Promise<void> {
    await expect(this.editGroupButton).toBeVisible();
  }

  async expectEditButtonHidden(): Promise<void> {
    await expect(this.editGroupButton).not.toBeVisible();
  }

  async expectDrawButtonEnabled(): Promise<void> {
    await expect(this.drawButton).toBeEnabled();
  }

  async expectDrawButtonDisabled(): Promise<void> {
    await expect(this.drawButton).toBeDisabled();
  }
}
