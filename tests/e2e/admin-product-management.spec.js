// Emberlynn Loo, A0255614E
import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@test.sg";
const ADMIN_PASSWORD = "admin@test.sg";

const SEEDED_PRODUCT = {
    name: "Novel",
    slug: "novel",
};

async function loginAsAdmin(page) {
    await page.goto("/login");
    await page.getByPlaceholder("Enter Your Email").fill(ADMIN_EMAIL);
    await page.getByPlaceholder("Enter Your Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /login/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
}

test.describe("Admin product management flow", () => {
    test("admin can log in and view product list", async ({ page }) => {
        // Arrange + Act
        await loginAsAdmin(page);
        await page.goto("/dashboard/admin/products");

        // Assert
        await expect(page).toHaveURL(/\/dashboard\/admin\/products/);
        await expect(
            page.getByRole("link", { name: new RegExp(SEEDED_PRODUCT.name) }).first()
        ).toBeVisible({ timeout: 10000 });
    });

    test("clicking on a product navigates to its update page", async ({ page }) => {
        // Arrange
        await loginAsAdmin(page);
        await page.goto("/dashboard/admin/products");
        await expect(
            page.getByRole("link", { name: new RegExp(SEEDED_PRODUCT.name) }).first()
        ).toBeVisible({ timeout: 10000 });

        // Act
        await page.getByRole("link", { name: new RegExp(SEEDED_PRODUCT.name) }).first().click();

        // Assert
        await expect(page).toHaveURL(/\/dashboard\/admin\/product\/.+/);
    });

    test("update form is prefilled with existing product data", async ({ page }) => {
        // Arrange + Act
        await loginAsAdmin(page);
        await page.goto(`/dashboard/admin/product/${SEEDED_PRODUCT.slug}`);

        // Assert
        await expect(page.getByPlaceholder("write a name")).toHaveValue(
            SEEDED_PRODUCT.name,
            { timeout: 10000 }
        );
        await expect(page.getByPlaceholder("write a Price")).not.toHaveValue("", { timeout: 10000 });
        await expect(page.getByPlaceholder("write a description")).not.toHaveValue("", { timeout: 10000 });
        await expect(page.getByPlaceholder("write a quantity")).not.toHaveValue("", { timeout: 10000 });
    });

    // Emberlynn Loo, A0255614E
    test("creates temp product, updates name, verifies in list, then deletes", async ({ page }) => {
        // Arrange
        await loginAsAdmin(page);
        await page.goto("/dashboard/admin/create-product");
        await page.getByPlaceholder("write a name").fill("Test Product");
        await page.getByPlaceholder("write a description").fill("Temp product for update test");
        await page.getByPlaceholder("write a Price").fill("1");
        await page.getByPlaceholder("write a quantity").fill("1");
        await page.locator(".ant-select-selector").first().click();
        await page.getByTitle("Electronics").click();
        await page.getByRole("button", { name: /create product/i }).click();
        await expect(page).toHaveURL(/\/dashboard\/admin\/products/, { timeout: 10000 });

        await page.getByRole("link", { name: /Test Product/ }).first().click();
        await expect(page.getByPlaceholder("write a name")).toHaveValue("Test Product", { timeout: 10000 });

        // Act
        await page.getByPlaceholder("write a name").fill("Updated Test Product");
        await page.getByRole("button", { name: /update product/i }).click();

        // Assert
        await expect(page.getByText("Product Updated Successfully")).toBeVisible({ timeout: 10000 });

        await page.goto("/dashboard/admin/products");
        await expect(
            page.getByRole("link", { name: /Updated Test Product/ }).first()
        ).toBeVisible({ timeout: 10000 });

        await page.getByRole("link", { name: /Updated Test Product/ }).first().click();
        await expect(page.getByPlaceholder("write a name")).toHaveValue("Updated Test Product", { timeout: 10000 });

        page.on("dialog", async dialog => {
            await dialog.accept("yes");
        });
        await page.getByRole("button", { name: /delete product/i }).click();

        await expect(page).toHaveURL(/\/dashboard\/admin\/products/, { timeout: 10000 });
        await expect(
            page.getByRole("link", { name: /Updated Test Product/ })
        ).toHaveCount(0, { timeout: 10000 });
    });
});