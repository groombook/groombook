import { test as base } from "@playwright/test";

/**
 * Custom test fixture that bypasses the dev login redirect for E2E tests.
 *
 * When AUTH_DISABLED=true, the app fetches /api/dev/config and redirects to
 * /login if no dev-user is in localStorage. This fixture:
 * 1. Mocks /api/dev/config to return authDisabled: false
 * 2. Seeds localStorage with a dev user as a fallback
 *
 * This ensures E2E tests render pages directly without the login redirect.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Mock the dev config endpoint so the app skips the auth-disabled redirect
    await page.route("**/api/dev/config", (route) =>
      route.fulfill({ json: { authDisabled: false } })
    );
    // Seed localStorage as a fallback in case the mock is bypassed
    await page.addInitScript(() => {
      localStorage.setItem(
        "dev-user",
        JSON.stringify({ type: "staff", id: "dev-user", name: "Dev User" })
      );
    });
    await use(page);
  },
});

export { expect } from "@playwright/test";
