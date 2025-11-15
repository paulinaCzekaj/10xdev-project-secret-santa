import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

// SAFETY CHECK: Prevent tests from running against production database
const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;

if (supabaseUrl?.includes("uiyurwyzsckkkoqthxmv.supabase.co")) {
  console.error("\n❌ CRITICAL ERROR: E2E tests are configured to use PRODUCTION database!");
  console.error(`   Detected URL: ${supabaseUrl}`);
  console.error(`   Expected: http://127.0.0.1:54321 (local Supabase)`);
  console.error("\n   Tests MUST NOT run against production!");
  console.error("   Please check your .env.test file.\n");
  process.exit(1);
}

console.log("✅ E2E Test Safety Check: Using local Supabase");
console.log(`   SUPABASE_URL: ${supabaseUrl || "not set"}\n`);
/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: "html",

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || "http://localhost:3000",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: "npm run dev:e2e",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // Increased timeout to 3 minutes
    stdout: "pipe",
    stderr: "pipe",
  },
});
