// Emberlynn Loo, A0255614E
import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "fakeemail@gmail.com";
const ADMIN_PASSWORD = "Test1";

const SEEDED_PRODUCT = {
    name: "Iphone",
    slug: "Iphone",
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

    test("updates product name and shows success toast", async ({ page }) => {
        // Arrange
        await loginAsAdmin(page);
        await page.goto(`/dashboard/admin/product/${SEEDED_PRODUCT.slug}`);
        await expect(page.getByPlaceholder("write a name")).toHaveValue(
            SEEDED_PRODUCT.name,
            { timeout: 10000 }
        );

        // Act
        await page.getByPlaceholder("write a name").fill("Iphone Updated");
        await page.getByRole("button", { name: /update product/i }).click();

        // Assert
        await expect(page.getByText("Product Updated Successfully")).toBeVisible({ timeout: 10000 });

        await page.goto("/dashboard/admin/product/Iphone-Updated");
        await expect(page.getByPlaceholder("write a name")).toHaveValue("Iphone Updated", { timeout: 10000 });
        await page.getByPlaceholder("write a name").fill("Iphone");
        await page.getByRole("button", { name: /update product/i }).click();
        await expect(page.getByText("Product Updated Successfully")).toBeVisible({ timeout: 10000 });
    });

    test("updated product name appears in products list", async ({ page }) => {
        // Arrange
        await loginAsAdmin(page);
        await page.goto(`/dashboard/admin/product/${SEEDED_PRODUCT.slug}`);
        await expect(page.getByPlaceholder("write a name")).toHaveValue(
            SEEDED_PRODUCT.name,
            { timeout: 10000 }
        );

        // Act
        await page.getByPlaceholder("write a name").fill("Iphone Renamed");
        await page.getByRole("button", { name: /update product/i }).click();
        await expect(page.getByText("Product Updated Successfully")).toBeVisible({ timeout: 10000 });

        // Assert
        await page.goto("/dashboard/admin/products");
        await expect(
            page.getByRole("link", { name: /Iphone Renamed/ }).first()
        ).toBeVisible({ timeout: 10000 });

        await page.goto("/dashboard/admin/product/Iphone-Renamed");
        await expect(page.getByPlaceholder("write a name")).toHaveValue("Iphone Renamed", { timeout: 10000 });
        await page.getByPlaceholder("write a name").fill("Iphone");
        await page.getByRole("button", { name: /update product/i }).click();
        await expect(page.getByText("Product Updated Successfully")).toBeVisible({ timeout: 10000 });
    });

    test("admin can create a new product and it appears in products list", async ({ page }) => {
        // Arrange
        await loginAsAdmin(page);
        await page.goto("/dashboard/admin/create-product");

        const uniqueName = `Test Product ${Date.now()}`;

        // Act
        await page.getByPlaceholder("write a name").fill(uniqueName);
        await page.getByPlaceholder("write a description").fill("Created for E2E test");
        await page.getByPlaceholder("write a Price").fill("1000");
        await page.getByPlaceholder("write a quantity").fill("5");

        await page.locator(".ant-select-selector").first().click();
        await page.getByTitle("Electronics").click();

        await page.getByRole("button", { name: /create product/i }).click();

        // Assert
        await expect(page).toHaveURL(/\/dashboard\/admin\/products/, { timeout: 10000 });
        await expect(
            page.getByRole("link", { name: new RegExp(uniqueName) }).first()
        ).toBeVisible({ timeout: 10000 });
    });

});