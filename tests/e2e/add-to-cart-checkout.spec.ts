import { test, expect } from "@playwright/test";

// Earnest Suprapmo, A0251966U

const TEST_USER_EMAIL =
  process.env.PW_TEST_USER_EMAIL ?? "cs4218@test.com";
const TEST_USER_PASSWORD =
  process.env.PW_TEST_USER_PASSWORD ?? "cs4218@test.com";

// Helper to navigate to home and get the first product
async function gotoHomeAndGetFirstCard(page: import("@playwright/test").Page) {
  await page.goto("/");
  const firstCard = page.locator(".card").first();
  await expect(firstCard).toBeVisible();
  return firstCard;
}

// Helper to add the first product to cart and return its name + price
async function addFirstProductToCart(
  page: import("@playwright/test").Page
): Promise<{ name: string; priceText: string }> {
  const firstCard = await gotoHomeAndGetFirstCard(page);

  const productName = await firstCard
    .locator(".card-title")
    .first()
    .innerText();
  const productPriceText = await firstCard
    .locator(".card-price")
    .innerText();

  await firstCard
    .getByRole("button", { name: /add to cart/i })
    .click();

  await expect(
    page.getByText("Item Added to cart").first()
  ).toBeVisible();

  return { name: productName, priceText: productPriceText };
}

test.describe("Add to cart and checkout flow", () => {
  test("1. Navigate to home page and verify products are displayed", async ({
    page,
  }) => {
    // Arrange & Act
    await page.goto("/");

    // Assert
    await expect(page.locator(".card").first()).toBeVisible();
  });

  test('2. Add to cart shows toast confirmation', async ({ page }) => {
    // Arrange
    const firstCard = await gotoHomeAndGetFirstCard(page);

    // Act
    await firstCard
      .getByRole("button", { name: /add to cart/i })
      .click();

    // Assert
    await expect(
      page.getByText("Item Added to cart").first()
    ).toBeVisible();
  });

  test("3. Cart page shows added product with correct name and price", async ({
    page,
  }) => {
    // Arrange
    const { name, priceText } = await addFirstProductToCart(page);

    // Act
    await page.getByRole("link", { name: /cart/i }).click();
    await expect(page).toHaveURL(/\/cart$/);

    // Assert
    const cartItem = page
      .locator(".cart-page")
      .getByText(name, { exact: true });
    await expect(cartItem).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: `Total : ${priceText}`,
      })
    ).toBeVisible();
  });

  test("4. Total price is correct in cart", async ({ page }) => {
    // Arrange
    const { priceText } = await addFirstProductToCart(page);

    // Act
    await page.getByRole("link", { name: /cart/i }).click();

    // Assert
    await expect(
      page.getByRole("heading", {
        name: `Total : ${priceText}`,
      })
    ).toBeVisible();
  });

  test("5. Removing an item makes it disappear from the cart", async ({ page }) => {
    // Arrange
    const { name } = await addFirstProductToCart(page);
    await page.getByRole("link", { name: /cart/i }).click();
    await expect(page).toHaveURL(/\/cart$/);

    // Act
    await page.getByRole("button", { name: /remove/i }).first().click();

    // Assert
    await expect(
      page
        .locator(".cart-page")
        .getByText(name, { exact: true })
    ).toHaveCount(0);
  });

  test("6. Add duplicate items to the cart", async ({
    page,
  }) => {
    // Arrange
    await addFirstProductToCart(page);
    // Add first product again
    await page.getByRole("link", { name: /home/i }).click();
    const firstCard = page.locator(".card").first();
    await expect(firstCard).toBeVisible();

    // Act
    await firstCard
      .getByRole("button", { name: /add to cart/i })
      .click();

    // Go to cart
    await page.getByRole("link", { name: /cart/i }).click();

    // Assert: there should be at least 2 items (same product twice)
    await expect(
      page.locator(".cart-page .row.card.flex-row")
    ).toHaveCount(2);
  });

  test("7. After login, payment UI appears for cart with items", async ({
    page,
  }) => {
    // Arrange
    await addFirstProductToCart(page);
    await page.getByRole("link", { name: /cart/i }).click();
    await expect(page).toHaveURL(/\/cart$/);

    // Act
    await page.getByRole("link", { name: /login/i }).click();
    await expect(page.getByText(/login form/i)).toBeVisible();

    await page
      .getByPlaceholder("Enter Your Email")
      .fill(TEST_USER_EMAIL);
    await page
      .getByPlaceholder("Enter Your Password")
      .fill(TEST_USER_PASSWORD);
    await page.getByRole("button", { name: /login/i }).click();

    // Assert
    await expect(page).toHaveURL(/\/$/);

    // Go to cart again and verify payment UI
    await page.getByRole("link", { name: /cart/i }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(
      page.getByRole("button", { name: /make payment/i })
    ).toBeVisible();
  });
});

