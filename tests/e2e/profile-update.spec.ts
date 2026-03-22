import { test, expect } from "@playwright/test";

const TEST_USER_EMAIL = process.env.PW_TEST_USER_EMAIL ?? "cs4218@test.com";
const TEST_USER_PASSWORD =
  process.env.PW_TEST_USER_PASSWORD ?? "cs4218@test.com";

async function loginAsSeededUser(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /login form/i })).toBeVisible();

  await page.getByPlaceholder("Enter Your Email").fill(TEST_USER_EMAIL);
  await page.getByPlaceholder("Enter Your Password").fill(TEST_USER_PASSWORD);
  await page.getByRole("button", { name: /login/i }).click();

  try {
    await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
      timeout: 15000,
    });
  } catch {
    throw new Error(
      `Login did not succeed. Still on /login. Set valid credentials via PW_TEST_USER_EMAIL/PW_TEST_USER_PASSWORD. Current email: ${TEST_USER_EMAIL}`
    );
  }
}

test.describe("User profile update flow", () => {
  test("logs in, updates profile, persists on refresh, and rejects too-short password", async ({
    page,
  }) => {
    // 1. Login with seeded user
    await loginAsSeededUser(page);

    // 2. Go to profile page
    await page.goto("/dashboard/user/profile");
    await expect(page.getByRole("heading", { name: /user profile/i })).toBeVisible();

    const nameInput = page.getByPlaceholder("Enter Your Name");
    const emailInput = page.getByPlaceholder("Enter Your Email");
    const phoneInput = page.getByPlaceholder("Enter Your Phone");
    const addressInput = page.getByPlaceholder("Enter Your Address");
    const passwordInput = page.getByPlaceholder("Enter Your Password");
    const updateButton = page.getByRole("button", { name: "UPDATE" });

    // 3. Verify pre-populated current values
    await expect(nameInput).toHaveValue(/.+/);
    await expect(emailInput).toHaveValue(TEST_USER_EMAIL);
    await expect(phoneInput).toHaveValue(/.+/);
    await expect(addressInput).toHaveValue(/.+/);

    const originalName = await nameInput.inputValue();
    const originalAddress = await addressInput.inputValue();
    const originalPhone = await phoneInput.inputValue();

    const uniqueSuffix = Date.now().toString().slice(-6);
    const updatedName = `${originalName} E2E ${uniqueSuffix}`;
    const updatedAddress = `${originalAddress} Apt ${uniqueSuffix}`;

    // 4. Update name + address and submit
    await nameInput.fill(updatedName);
    await addressInput.fill(updatedAddress);
    await passwordInput.fill("");
    await updateButton.click();

    // 5. Verify success toast
    await expect(page.getByText(/profile updated successfully/i)).toBeVisible();

    // 6. Refresh and verify persistence
    await page.reload();
    await expect(page.getByRole("heading", { name: /user profile/i })).toBeVisible();
    await expect(nameInput).toHaveValue(updatedName);
    await expect(addressInput).toHaveValue(updatedAddress);
    await expect(emailInput).toHaveValue(TEST_USER_EMAIL);
    await expect(phoneInput).toHaveValue(originalPhone);

    // 7. Too-short password should show validation error
    await passwordInput.fill("12345");
    await updateButton.click();
    await expect(
      page.getByText(/password is required to be at least 6 characters long/i)
    ).toBeVisible();
  });
});