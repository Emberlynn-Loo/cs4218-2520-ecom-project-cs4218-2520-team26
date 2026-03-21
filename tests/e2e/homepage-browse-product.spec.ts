import { test, expect } from "@playwright/test";

// Earnest Suprapmo, A0251966U

// Helper: go to home and wait for filters + at least one product
async function gotoHome(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /filter by category/i })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /all products/i })
  ).toBeVisible();
  await expect(page.locator(".card").first()).toBeVisible();
}

test.describe("HomePage product browsing", () => {
  test("1. Home page shows category filter sidebar and products", async ({
    page,
  }) => {
    // Arrange & Act
    await gotoHome(page);

    // Assert
    await expect(
      page.getByRole("heading", { name: /filter by category/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /filter by price/i })
    ).toBeVisible();
    await expect(page.locator(".card").first()).toBeVisible();
  });

  test("2. Selecting a category filter shows only that category's products", async ({
    page,
  }) => {
    // Arrange
    await gotoHome(page);

    // Act
    await page
      .getByRole("checkbox", { name: "Book" })
      .click();

    // Assert
    await expect(
      page.getByRole("heading", { name: "NUS T-shirt" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Novel" })
    ).toBeVisible();
  });

  test("3. Selecting a price range filter filters products accordingly", async ({
    page,
  }) => {
    // Arrange
    await gotoHome(page);

    // Act
    await page.getByText("$0 to 19").click();

    // Assert
    await expect(
      page.getByRole("heading", { name: "NUS T-shirt" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Laptop" })
    ).toHaveCount(0);
  });

  test("4. Reset Filters restores all products", async ({ page }) => {
    // Arrange
    await gotoHome(page);
    // Apply category + price filters
    await page
      .getByRole("checkbox", { name: "Book" })
      .click();
    await page.getByText("$0 to 19").click();

    await expect(
      page.getByRole("heading", { name: "Laptop" })
    ).toHaveCount(0);

    // Act
    await page.getByRole("button", { name: /reset filters/i }).click();

    // Assert
    await expect(
      page.getByRole("heading", { name: /all products/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Laptop" })
    ).toBeVisible();
  });

  test("5. Loadmore button loads additional products when more pages exist", async ({
    page,
  }) => {
    // Arrange
    await gotoHome(page);

    // Act
    const cards = page.locator(".card");
    const beforeCount = await cards.count();
    const loadMoreButton = page.getByRole("button", { name: /loadmore/i });
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();
      await page.waitForFunction(
        (prev) =>
          document.querySelectorAll(".card.m-2").length >
          (prev as number),
        beforeCount
      );
    }
  });

  test("6. More Details navigates to product details page", async ({
    page,
  }) => {
    // Arrange
    await gotoHome(page);
    const firstCard = page.locator(".card").first();
    const productName = await firstCard
      .locator(".card-title:not(.card-price)")
      .innerText();

    // Act
    await firstCard
      .getByRole("button", { name: /more details/i })
      .click();

    // Assert
    await expect(page).toHaveURL(/\/product\//);
    await expect(
      page.getByRole("heading", { name: /product details/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Name\\s*:\\s*${productName}`),
      })
    ).toBeVisible();
  });
});
