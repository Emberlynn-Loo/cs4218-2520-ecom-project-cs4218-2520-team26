// Ashley Chang Le Xuan, A0252633J 
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

async function gotoProfileAsSeededUser(page: import("@playwright/test").Page) {
  await loginAsSeededUser(page);
  await page.goto("/dashboard/user/profile");
  await expect(page.getByRole("heading", { name: /user profile/i })).toBeVisible();

  return {
    nameInput: page.getByPlaceholder("Enter Your Name"),
    emailInput: page.getByPlaceholder("Enter Your Email"),
    phoneInput: page.getByPlaceholder("Enter Your Phone"),
    addressInput: page.getByPlaceholder("Enter Your Address"),
    passwordInput: page.getByPlaceholder("Enter Your Password"),
    updateButton: page.getByRole("button", { name: "UPDATE" }),
  };
}

test.describe("User profile update flow", () => {
  test("1) seeded user can log in and reach profile page", async ({ page }) => {
    // Arrange
    await loginAsSeededUser(page);

    const userMenu = page
      .locator("li.nav-item.dropdown")
      .filter({ has: page.locator('a.dropdown-item[href^="/dashboard/"]') })
      .filter({ has: page.locator('a.dropdown-item[href="/login"]') });
    const userDropdownToggle = userMenu.locator("a.nav-link.dropdown-toggle");
    const dashboardLink = userMenu.locator('a.dropdown-item[href="/dashboard/user"]');
    const profileLink = page.locator('a[href="/dashboard/user/profile"]');
    const emailInput = page.getByPlaceholder("Enter Your Email");

    // Act
    await expect(userDropdownToggle).toBeVisible({ timeout: 15000 });
    await userDropdownToggle.click();
    await expect(dashboardLink).toBeVisible();
    await dashboardLink.click();
    await expect(page).toHaveURL(/\/dashboard\/user$/);

    await profileLink.click();

    // Assert
    await expect(page).toHaveURL(/\/dashboard\/user\/profile/);
    await expect(page.getByRole("heading", { name: /user profile/i })).toBeVisible();
    await expect(emailInput).toHaveValue(TEST_USER_EMAIL);
  });

  test("2) profile form is pre-populated with current user values", async ({ page }) => {
    // Arrange
    const { nameInput, emailInput, phoneInput, addressInput } =
      await gotoProfileAsSeededUser(page);

    // Act
    // No action needed; verification is based on initial hydrated state.

    // Assert
    await expect(nameInput).toHaveValue(/.+/);
    await expect(emailInput).toHaveValue(TEST_USER_EMAIL);
    await expect(phoneInput).toHaveValue(/.+/);
    await expect(addressInput).toHaveValue(/.+/);
  });

  test("3) updating name and address shows success feedback", async ({ page }) => {
    // Arrange
    const { nameInput, addressInput, passwordInput, updateButton } =
      await gotoProfileAsSeededUser(page);

    const originalName = await nameInput.inputValue();
    const originalAddress = await addressInput.inputValue();
    const uniqueSuffix = Date.now().toString().slice(-6);
    const updatedName = `${originalName} E2E ${uniqueSuffix}`;
    const updatedAddress = `${originalAddress} Apt ${uniqueSuffix}`;

    // Act
    await nameInput.fill(updatedName);
    await addressInput.fill(updatedAddress);
    await passwordInput.fill("");
    await updateButton.click();

    // Assert
    await expect(page.getByText(/profile updated successfully/i)).toBeVisible();
  });

  test("4) successful updates persist after page refresh", async ({ page }) => {
    // Arrange
    const {
      nameInput,
      emailInput,
      phoneInput,
      addressInput,
      passwordInput,
      updateButton,
    } = await gotoProfileAsSeededUser(page);

    const originalName = await nameInput.inputValue();
    const originalAddress = await addressInput.inputValue();
    const originalPhone = await phoneInput.inputValue();
    const uniqueSuffix = Date.now().toString().slice(-6);
    const updatedName = `${originalName} Persist ${uniqueSuffix}`;
    const updatedAddress = `${originalAddress} Unit ${uniqueSuffix}`;

    // Act
    await nameInput.fill(updatedName);
    await addressInput.fill(updatedAddress);
    await passwordInput.fill("");
    await updateButton.click();
    await expect(page.getByText(/profile updated successfully/i)).toBeVisible();

    await page.reload();

    // Assert
    await expect(page.getByRole("heading", { name: /user profile/i })).toBeVisible();
    await expect(nameInput).toHaveValue(updatedName);
    await expect(addressInput).toHaveValue(updatedAddress);
    await expect(emailInput).toHaveValue(TEST_USER_EMAIL);
    await expect(phoneInput).toHaveValue(originalPhone);
  });

  test("5) too-short password is rejected and profile values are not persisted", async ({
    page,
  }) => {
    // Arrange
    const { nameInput, addressInput, passwordInput, updateButton } =
      await gotoProfileAsSeededUser(page);

    const originalName = await nameInput.inputValue();
    const originalAddress = await addressInput.inputValue();
    const uniqueSuffix = Date.now().toString().slice(-6);
    const attemptedName = `${originalName} Invalid ${uniqueSuffix}`;
    const attemptedAddress = `${originalAddress} Invalid ${uniqueSuffix}`;

    // Act
    await nameInput.fill(attemptedName);
    await addressInput.fill(attemptedAddress);
    await passwordInput.fill("12345");
    await updateButton.click();

    // Assert
    await expect(
      page.getByText(/password is required to be at least 6 characters long/i)
    ).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: /user profile/i })).toBeVisible();
    await expect(nameInput).toHaveValue(originalName);
    await expect(addressInput).toHaveValue(originalAddress);
  });

  test("6) updating only phone leaves name and address unchanged", async ({ page }) => {
    // Arrange
    const { nameInput, phoneInput, addressInput, passwordInput, updateButton } =
      await gotoProfileAsSeededUser(page);

    const originalName = await nameInput.inputValue();
    const originalAddress = await addressInput.inputValue();
    const originalPhone = await phoneInput.inputValue();
    const uniqueSuffix = Date.now().toString().slice(-6);
    const updatedPhone = `${originalPhone}${uniqueSuffix}`.slice(0, 15);

    // Act
    await phoneInput.fill(updatedPhone);
    await passwordInput.fill("");
    await updateButton.click();
    await expect(page.getByText(/profile updated successfully/i)).toBeVisible();

    await page.reload();

    // Assert
    await expect(page.getByRole("heading", { name: /user profile/i })).toBeVisible();
    await expect(phoneInput).toHaveValue(updatedPhone);
    await expect(nameInput).toHaveValue(originalName);
    await expect(addressInput).toHaveValue(originalAddress);
  });
});