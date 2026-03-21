import { test, expect } from "@playwright/test";

// Khoo Jing Xiang, A0252605L

test.describe("Static and informational page navigation", () => {
  // Khoo Jing Xiang, A0252605L
  test("should load the home page and display Virtual Vault branding", async ({ page }) => {
    // Arrange

    // Act
    await page.goto("/");

    // Assert
    await expect(page.getByText("Virtual Vault")).toBeVisible();
  });

  // Khoo Jing Xiang, A0252605L
  test("should navigate to About from the footer and display About content", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Act
    await page.getByRole("link", { name: /about/i }).click();

    // Assert
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByText("Add text")).toBeVisible();
  });

  // Khoo Jing Xiang, A0252605L
  test("should navigate to Contact from the footer and show contact info", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Act
    await page.getByRole("link", { name: /contact/i }).click();

    // Assert
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByRole("heading", { name: /contact us/i })).toBeVisible();
    await expect(page.getByText("www.help@ecommerceapp.com")).toBeVisible();
    await expect(page.getByText("012-3456789")).toBeVisible();
    await expect(page.getByText("1800-0000-0000")).toBeVisible();
  });

  // Khoo Jing Xiang, A0252605L
  test("should navigate to Privacy Policy from the footer and render policy text", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Act
    await page.getByRole("link", { name: /privacy policy/i }).click();

    // Assert
    await expect(page).toHaveURL(/\/policy$/);
    await expect(
      page.locator("p").filter({ hasText: /add privacy policy/i }).first()
    ).toBeVisible();
  });

  // Khoo Jing Xiang, A0252605L
  test("should render the 404 page for a non-existent route", async ({ page }) => {
    // Arrange

    // Act
    await page.goto("/nonexistent");

    // Assert
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText(/oops ! page not found/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /go back/i })).toBeVisible();
  });

  // Khoo Jing Xiang, A0252605L
  test("should navigate back to the home page from the 404 page", async ({ page }) => {
    // Arrange
    await page.goto("/nonexistent");

    // Act
    await page.getByRole("link", { name: /go back/i }).click();

    // Assert
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Virtual Vault")).toBeVisible();
  });
});
