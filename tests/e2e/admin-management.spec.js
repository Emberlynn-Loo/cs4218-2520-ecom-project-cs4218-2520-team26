const { test, expect } = require("@playwright/test");
const path = require("path");

const ADMIN_EMAIL = "e2e.admin@example.com";
const ADMIN_PASSWORD = "E2EAdmin123!";

test.use({
  storageState: path.resolve(__dirname, ".auth", "admin.json"),
});

const mockedOrders = [
  {
    _id: "e2e-order-1",
    status: "Not Processed",
    buyer: { name: "E2E Buyer" },
    createdAt: "2024-01-01T00:00:00.000Z",
    payment: { success: true },
    products: [
      {
        _id: "e2e-product-1",
        name: "E2E Product",
        description: "E2E seeded order product",
        price: 123,
      },
    ],
  },
];

const assertAdminSession = async (page) => {
  const isAdmin = await page.evaluate(() => {
    const authRaw = localStorage.getItem("auth");
    if (!authRaw) return false;
    try {
      const auth = JSON.parse(authRaw);
      return auth?.user?.role === 1 && Boolean(auth?.token);
    } catch {
      return false;
    }
  });

  expect(
    isAdmin,
    "Admin storage state is missing or invalid. Re-run Playwright so global setup can seed and authenticate admin state.",
  ).toBeTruthy();
};

const gotoAdminPage = async (page, routePath) => {
  await page.goto(routePath);

  const loginHeading = page.getByRole("heading", { name: /login form/i });
  if (await loginHeading.isVisible().catch(() => false)) {
    await page.getByPlaceholder("Enter Your Email").fill(ADMIN_EMAIL);
    await page.getByPlaceholder("Enter Your Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "LOGIN" }).click();
  }

  await expect(page).toHaveURL(
    new RegExp(`${routePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
  );
};

// Nicholas Koh Zi Lun, A0272806B
test.describe("admin category and order management", () => {
  test("admin can create, edit, and delete category", async ({ page }) => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const categoryName = `E2E Category ${suffix}`;
    const updatedCategoryName = `E2E Category Updated ${suffix}`;

    await page.goto("/");
    await assertAdminSession(page);

    await gotoAdminPage(page, "/dashboard/admin/create-category");
    await expect(
      page.getByRole("heading", { name: "Manage Category" }),
    ).toBeVisible();

    await page.getByPlaceholder("Enter new category").fill(categoryName);
    await page.getByRole("button", { name: "Submit" }).first().click();

    const createdRow = page.locator("tr", { hasText: categoryName }).first();
    await expect(createdRow).toBeVisible();

    await createdRow.getByRole("button", { name: "Edit" }).click();
    const modal = page.locator(".ant-modal-content").first();
    await expect(modal).toBeVisible();

    const modalInput = modal.getByPlaceholder("Enter new category");
    await modalInput.fill("");
    await modalInput.fill(updatedCategoryName);
    await modal.getByRole("button", { name: "Submit" }).click();

    const updatedRow = page
      .locator("tr", { hasText: updatedCategoryName })
      .first();
    await expect(updatedRow).toBeVisible();

    await updatedRow.getByRole("button", { name: "Delete" }).click();
    await expect(
      page.locator("tr", { hasText: updatedCategoryName }),
    ).toHaveCount(0);
  });

  test("shows error toast when creating a duplicate category", async ({
    page,
  }) => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const categoryName = `E2E Duplicate Category ${suffix}`;

    await page.goto("/");
    await assertAdminSession(page);

    await gotoAdminPage(page, "/dashboard/admin/create-category");
    await page.getByPlaceholder("Enter new category").fill(categoryName);
    await page.getByRole("button", { name: "Submit" }).first().click();
    await expect(
      page.locator("tr", { hasText: categoryName }).first(),
    ).toBeVisible();

    await page.getByPlaceholder("Enter new category").fill(categoryName);
    await page.getByRole("button", { name: "Submit" }).first().click();
    await expect(
      page.getByText(/category already exists/i).first(),
    ).toBeVisible();

    const categoryRows = page.locator("tbody tr", { hasText: categoryName });
    await expect(categoryRows).toHaveCount(1);

    await categoryRows.first().getByRole("button", { name: "Delete" }).click();
    await expect(page.locator("tr", { hasText: categoryName })).toHaveCount(0);
  });

  test("shows error toast when renaming category to an existing category name", async ({
    page,
  }) => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const baseName = `E2E Base Category ${suffix}`;
    const targetName = `E2E Target Category ${suffix}`;

    await page.goto("/");
    await assertAdminSession(page);

    await gotoAdminPage(page, "/dashboard/admin/create-category");

    await page.getByPlaceholder("Enter new category").fill(baseName);
    await page.getByRole("button", { name: "Submit" }).first().click();
    await expect(
      page.locator("tr", { hasText: baseName }).first(),
    ).toBeVisible();

    await page.getByPlaceholder("Enter new category").fill(targetName);
    await page.getByRole("button", { name: "Submit" }).first().click();
    await expect(
      page.locator("tr", { hasText: targetName }).first(),
    ).toBeVisible();

    const baseRow = page.locator("tr", { hasText: baseName }).first();
    await baseRow.getByRole("button", { name: "Edit" }).click();

    const modal = page.locator(".ant-modal-content").first();
    const modalInput = modal.getByPlaceholder("Enter new category");
    await modalInput.fill("");
    await modalInput.fill(targetName);
    await modal.getByRole("button", { name: "Submit" }).click();

    await expect(
      page.getByText(/category already exists/i).first(),
    ).toBeVisible();
    await expect(
      page.locator("tr", { hasText: baseName }).first(),
    ).toBeVisible();

    await page.locator(".ant-modal-close").first().click();
    await expect(page.locator(".ant-modal-content").first()).toBeHidden();

    await page
      .locator("tr", { hasText: baseName })
      .first()
      .getByRole("button", { name: "Delete" })
      .click();
    await page
      .locator("tr", { hasText: targetName })
      .first()
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(page.locator("tr", { hasText: baseName })).toHaveCount(0);
    await expect(page.locator("tr", { hasText: targetName })).toHaveCount(0);
  });

  test("shows error toast and keeps category row when delete request fails", async ({
    page,
  }) => {
    await page.goto("/");
    await assertAdminSession(page);

    await gotoAdminPage(page, "/dashboard/admin/create-category");

    const row = page.locator("tbody tr").first();
    await expect(row).toBeVisible();

    const categoryName = (await row.locator("td").first().innerText()).trim();

    await page.route("**/api/v1/category/delete-category/**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Error while deleting category",
        }),
      });
    });

    await row.getByRole("button", { name: "Delete" }).click();
    await expect(
      page.getByText(/error while deleting category/i).first(),
    ).toBeVisible();
    await expect(
      page.locator("tr", { hasText: categoryName }).first(),
    ).toBeVisible();

    await page.unroute("**/api/v1/category/delete-category/**");
  });

  test("admin can view orders and update order status", async ({ page }) => {
    await page.goto("/");
    await assertAdminSession(page);

    await page.route("**/api/v1/auth/all-orders", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockedOrders),
      });
    });

    await gotoAdminPage(page, "/dashboard/admin/orders");
    await expect(
      page.getByRole("heading", { name: "All Orders" }),
    ).toBeVisible();

    const firstOrderCard = page.locator(".border.shadow").first();
    await expect(firstOrderCard).toBeVisible();

    await expect(
      firstOrderCard.getByRole("columnheader", { name: "Status" }),
    ).toBeVisible();
    await expect(
      firstOrderCard.getByRole("columnheader", { name: "Buyer" }),
    ).toBeVisible();
    await expect(
      firstOrderCard.getByRole("columnheader", { name: "Date" }),
    ).toBeVisible();

    const firstOrderRow = firstOrderCard.locator("tbody tr").first();
    await expect(firstOrderRow.locator("td").nth(2)).not.toHaveText(/^\s*$/);
    await expect(firstOrderRow.locator("td").nth(3)).not.toHaveText(/^\s*$/);

    const statusSelect = firstOrderCard.locator(".ant-select").first();
    await expect(statusSelect).toBeVisible();

    const currentStatus = (await statusSelect.innerText()).trim();
    const nextStatus = currentStatus.includes("Shipped")
      ? "Processing"
      : "Shipped";

    let updatedStatusPayload = null;
    await page.route("**/api/v1/auth/order-status/**", async (route) => {
      const body = route.request().postDataJSON();
      updatedStatusPayload = body?.status ?? null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          status: body?.status,
        }),
      });
    });

    await statusSelect.click();
    await page
      .locator(".ant-select-dropdown .ant-select-item-option", {
        hasText: nextStatus,
      })
      .first()
      .click();

    await expect.poll(() => updatedStatusPayload).toBe(nextStatus);
    await expect(statusSelect).toContainText(nextStatus);
    await expect(
      page.getByText(/order status updated successfully/i).first(),
    ).toBeVisible();

    await page.unroute("**/api/v1/auth/order-status/**");
    await page.unroute("**/api/v1/auth/all-orders");
  });

  test("shows error toast when order status update fails", async ({ page }) => {
    await page.goto("/");
    await assertAdminSession(page);

    await page.route("**/api/v1/auth/all-orders", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockedOrders),
      });
    });

    await gotoAdminPage(page, "/dashboard/admin/orders");
    await expect(
      page.getByRole("heading", { name: "All Orders" }),
    ).toBeVisible();

    const firstOrderCard = page.locator(".border.shadow").first();
    const statusSelect = firstOrderCard.locator(".ant-select").first();
    await expect(statusSelect).toBeVisible();

    const currentStatus = (await statusSelect.innerText()).trim();
    const nextStatus = currentStatus.includes("Shipped")
      ? "Processing"
      : "Shipped";

    await page.route("**/api/v1/auth/order-status/**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Unable to update order status",
        }),
      });
    });

    await statusSelect.click();
    await page
      .locator(".ant-select-item-option", { hasText: nextStatus })
      .first()
      .click();

    await expect(
      page.getByText(/unable to update order status/i).first(),
    ).toBeVisible();
    await expect(statusSelect).toContainText(currentStatus);

    await page.unroute("**/api/v1/auth/order-status/**");
    await page.unroute("**/api/v1/auth/all-orders");
  });
});
