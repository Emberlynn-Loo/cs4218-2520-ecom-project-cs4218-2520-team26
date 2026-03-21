import { test, expect } from "@playwright/test";

const SEEDED_PRODUCT = {
  keyword: "phone",
  name: "Smartphone",
  slug: "smartphone",
  pricePattern: /999\.99/,
  descriptionPattern: /a high-end smartphone/i,
};

const searchFromHeader = async (page, keyword) => {
  const input = page.getByRole("searchbox");
  await expect(input).toBeVisible();
  await input.fill(keyword);
  await page.getByRole("button", { name: /search/i }).click();
};

test.describe("Search feature", () => {
  test("searches from the header and navigates to the search page", async ({ page }) => {
    await page.goto("/");

    await searchFromHeader(page, SEEDED_PRODUCT.keyword);

    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByRole("heading", { name: /search results/i })).toBeVisible();
  });

  test("displays matching product name, price, and description after search", async ({ page }) => {
    await page.goto("/");

    await searchFromHeader(page, SEEDED_PRODUCT.keyword);

    await expect(page).toHaveURL(/\/search$/);
    await expect(
      page.getByRole("heading", { name: SEEDED_PRODUCT.name })
    ).toBeVisible();
    await expect(page.getByText(SEEDED_PRODUCT.pricePattern)).toBeVisible();
    await expect(page.getByText(SEEDED_PRODUCT.descriptionPattern)).toBeVisible();
  });

  test("navigates to the correct product details page when More Details is clicked", async ({ page }) => {
    await page.goto("/");

    await searchFromHeader(page, SEEDED_PRODUCT.keyword);

    await expect(page).toHaveURL(/\/search$/);
    await expect(
      page.getByRole("heading", { name: SEEDED_PRODUCT.name })
    ).toBeVisible();

    await page.getByRole("button", { name: /more details/i }).click();

    await expect(page).toHaveURL(new RegExp(`/product/${SEEDED_PRODUCT.slug}$`));
    await expect(page.getByRole("heading", { name: /product details/i })).toBeVisible();
    await expect(
      page.getByText(new RegExp(`Name\\s*:\\s*${SEEDED_PRODUCT.name}`, "i"))
    ).toBeVisible();
  });

  test("retains the keyword in the search input after navigating to the search page", async ({ page }) => {
    await page.goto("/");

    await searchFromHeader(page, SEEDED_PRODUCT.keyword);

    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByRole("searchbox")).toHaveValue(SEEDED_PRODUCT.keyword);
  });

  test.fixme("shows a no-results message for a non-existent product keyword", async ({ page }) => {
    await page.goto("/");

    await searchFromHeader(page, "zzzz-product-does-not-exist-12345");

    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByRole("heading", { name: /search results/i })).toBeVisible();
    await expect(page.getByText(/no products found|found 0/i)).toBeVisible();
  });
});
