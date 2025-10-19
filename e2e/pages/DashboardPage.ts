import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model for Dashboard Page
 * Represents the user dashboard with groups list
 */
export class DashboardPage extends BasePage {
  // Locators for CTA buttons
  readonly createGroupCtaButton: Locator;
  readonly createGroupEmptyStateButton: Locator;

  // Sections
  readonly createdGroupsSection: Locator;
  readonly joinedGroupsSection: Locator;

  // Navigation
  readonly navLoginLink: Locator;
  readonly navRegisterLink: Locator;
  readonly dashboardLink: Locator;

  constructor(page: Page) {
    super(page);

    // CTA buttons
    this.createGroupCtaButton = page.getByTestId("create-group-cta-button");
    this.createGroupEmptyStateButton = page.getByTestId("create-group-empty-state-button");

    // Sections (using heading roles)
    this.createdGroupsSection = page.getByRole("heading", { name: /grupy, które stworzyłem/i });
    this.joinedGroupsSection = page.getByRole("heading", { name: /grupy, do których należę/i });

    // Navigation
    this.navLoginLink = page.getByTestId("nav-login-link");
    this.navRegisterLink = page.getByTestId("nav-register-link");
    this.dashboardLink = page.getByRole("link", { name: /pulpit/i });
  }

  /**
   * Navigate to dashboard
   */
  async goto(): Promise<void> {
    await super.goto("/dashboard");
    await this.waitForPageLoad();
  }

  /**
   * Click "Create new group" CTA button (main CTA at bottom)
   */
  async clickCreateGroupCta(): Promise<void> {
    await this.createGroupCtaButton.click();
    await this.waitForNavigation(/groups\/new/);
  }

  /**
   * Click "Create new group" button in empty state
   */
  async clickCreateGroupEmptyState(): Promise<void> {
    await this.createGroupEmptyStateButton.click();
    await this.waitForNavigation(/groups\/new/);
  }

  /**
   * Get a group card by ID
   */
  getGroupCard(groupId: number): Locator {
    return this.page.getByTestId(`group-card-${groupId}`);
  }

  /**
   * Click on a group card to view it
   */
  async clickGroupCard(groupId: number): Promise<void> {
    await this.getGroupCard(groupId).click();
    await this.waitForNavigation(new RegExp(`groups/${groupId}`));
  }

  /**
   * Get all group cards
   */
  getAllGroupCards(): Locator {
    return this.page.locator('[data-testid^="group-card-"]');
  }

  /**
   * Count the number of groups
   */
  async getGroupCount(): Promise<number> {
    return await this.getAllGroupCards().count();
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.createGroupEmptyStateButton.isVisible();
  }

  /**
   * Check if user has created groups
   */
  async hasCreatedGroups(): Promise<boolean> {
    const count = await this.getGroupCount();
    return count > 0;
  }

  /**
   * Get group names from cards
   */
  async getGroupNames(): Promise<string[]> {
    const cards = this.getAllGroupCards();
    const count = await cards.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const heading = card.locator("h3");
      const name = await heading.textContent();
      if (name) {
        names.push(name.trim());
      }
    }

    return names;
  }

  /**
   * Find group card by name
   */
  async findGroupByName(name: string): Promise<Locator | null> {
    const cards = this.getAllGroupCards();
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const heading = card.locator("h3");
      const cardName = await heading.textContent();

      if (cardName && cardName.includes(name)) {
        return card;
      }
    }

    return null;
  }

  /**
   * Click on a group by its name
   */
  async clickGroupByName(name: string): Promise<void> {
    const card = await this.findGroupByName(name);
    if (!card) {
      throw new Error(`Group with name "${name}" not found`);
    }
    await card.click();
  }

  /**
   * Get group status badge text
   */
  async getGroupStatus(groupId: number): Promise<string | null> {
    const card = this.getGroupCard(groupId);
    const badge = card.locator(".inline-flex.items-center");
    return await badge.textContent();
  }

  /**
   * Check if a group is drawn (completed)
   */
  async isGroupDrawn(groupId: number): Promise<boolean> {
    const status = await this.getGroupStatus(groupId);
    return status?.includes("Wylosowano") || false;
  }

  /**
   * Wait for groups to load
   */
  async waitForGroupsToLoad(): Promise<void> {
    // Wait for either empty state or group cards
    await Promise.race([
      this.createGroupEmptyStateButton.waitFor({ state: "visible" }),
      this.getAllGroupCards().first().waitFor({ state: "visible" }),
    ]);
  }

  /**
   * Get welcome message (user name from heading)
   */
  async getWelcomeMessage(): Promise<string | null> {
    const heading = this.page.getByRole("heading", { name: /witaj/i });
    return await heading.textContent();
  }

  /**
   * Assertions
   */
  async expectToBeOnDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard/);
    await expect(this.page.getByRole("heading", { name: /witaj/i })).toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.createGroupEmptyStateButton).toBeVisible();
  }

  async expectGroupCount(count: number): Promise<void> {
    await expect(this.getAllGroupCards()).toHaveCount(count);
  }

  async expectGroupVisible(groupId: number): Promise<void> {
    await expect(this.getGroupCard(groupId)).toBeVisible();
  }

  async expectGroupWithName(name: string): Promise<void> {
    const card = await this.findGroupByName(name);
    expect(card).not.toBeNull();
    if (card) {
      await expect(card).toBeVisible();
    }
  }

  async expectCreateButtonVisible(): Promise<void> {
    await expect(this.createGroupCtaButton).toBeVisible();
  }
}
