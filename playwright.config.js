import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.js",
  fullyParallel: true,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run client",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: "3000",
      },
    },
    {
      command: "npm run server",
      port: 6060,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        DEV_MODE: "development",
        PORT: "6060",
        MONGO_URL: process.env.MONGO_URL || "",
        JWT_SECRET: process.env.JWT_SECRET || "",
        BRAINTREE_MERCHANT_ID: process.env.BRAINTREE_MERCHANT_ID || "",
        BRAINTREE_PUBLIC_KEY: process.env.BRAINTREE_PUBLIC_KEY || "",
        BRAINTREE_PRIVATE_KEY: process.env.BRAINTREE_PRIVATE_KEY || "",
      },
    },
  ],
});

