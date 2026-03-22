// Emberlynn Loo, A0255614E
import { test, expect } from "@playwright/test";

test.describe("Product details and related products", () => {

    test("navigates to product details page when More Details button is clicked from home", async ({ page }) => {
        // Arrange
        await page.goto("/");
        const firstCard = page.locator(".card").first();
        await expect(firstCard).toBeVisible();

        // Act
        await firstCard.getByRole("button", { name: /more details/i }).click();

        // Assert
        await expect(page).toHaveURL(/\/product\/.+/);
        await expect(page.getByText("Product Details")).toBeVisible();
    });

    test("displays product name, description, price and category on product details page", async ({ page }) => {
        // Arrange
        await page.goto("/");
        const firstCard = page.locator(".card").first();
        await expect(firstCard).toBeVisible();

        // Act
        await firstCard.getByRole("button", { name: /more details/i }).click();
        await expect(page).toHaveURL(/\/product\/.+/);

        // Assert
        await expect(page.locator("h6").filter({ hasText: /name/i })).toBeVisible();
        await expect(page.locator("h6").filter({ hasText: /description/i })).toBeVisible();
        await expect(page.locator("h6").filter({ hasText: /price/i })).toBeVisible();
        await expect(page.locator("h6").filter({ hasText: /category/i })).toBeVisible();
    });

    test("displays similar products section when on product details page", async ({ page }) => {
        // Arrange
        await page.goto("/");
        const firstCard = page.locator(".card").first();
        await expect(firstCard).toBeVisible();

        // Act
        await firstCard.getByRole("button", { name: /more details/i }).click();
        await expect(page).toHaveURL(/\/product\/.+/);

        // Assert
        await expect(page.getByRole("heading", { name: /similar products/i })).toBeVisible();
    });

    test("clicking ADD TO CART button on main product shows toast confirmation", async ({ page }) => {
        // Arrange
        await page.goto("/");
        const firstCard = page.locator(".card").first();
        await firstCard.getByRole("button", { name: /more details/i }).click();
        await expect(page).toHaveURL(/\/product\/.+/);

        // Act
        await page.locator(".product-details-info")
            .getByRole("button", { name: /add to cart/i })
            .click();

        // Assert
        await expect(page.getByText("Item Added to cart").first()).toBeVisible();
    });

    test("product added from details page appears in cart", async ({ page }) => {
        // Arrange
        await page.goto("/");
        const firstCard = page.locator(".card").first();
        const productName = await firstCard.locator(".card-title").first().innerText();
        await firstCard.getByRole("button", { name: /more details/i }).click();
        await expect(page).toHaveURL(/\/product\/.+/);

        // Act
        await page.locator(".product-details-info")
            .getByRole("button", { name: /add to cart/i })
            .click();
        await page.getByRole("link", { name: /cart/i }).click();

        // Assert
        await expect(page).toHaveURL(/\/cart$/);
        await expect(
            page.locator(".cart-page").getByText(productName, { exact: true })
        ).toBeVisible();
    });

    test("clicking More Details button for a similar product updates the page with new product info", async ({ page }) => {
        // Arrange
        await page.goto("/");
        const firstCard = page.locator(".card").first();
        await firstCard.getByRole("button", { name: /more details/i }).click();
        await expect(page).toHaveURL(/\/product\/.+/);

        const relatedProducts = page.locator(".similar-products .card");
        const relatedProductCount = await relatedProducts.count();

        if (relatedProductCount === 0) {
            // no related products — skip this test gracefully
            await expect(page.getByText("No Similar Products found")).toBeVisible();
            return;
        }

        const firstRelatedProduct = relatedProducts.first();
        const relatedProductName = await firstRelatedProduct
            .locator(".card-title")
            .first()
            .innerText();

        const currentUrl = page.url();

        // Act
        await firstRelatedProduct
            .getByRole("button", { name: /more details/i })
            .click();

        // Assert
        await expect(page).not.toHaveURL(currentUrl);
        await expect(page).toHaveURL(/\/product\/.+/);
        await expect(
            page.locator("h6").filter({ hasText: relatedProductName })
        ).toBeVisible();
    });

});