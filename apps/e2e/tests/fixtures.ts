import { test as base } from "@playwright/test";

/**
 * Custom test fixture that seeds a dev user in localStorage before each test.
 *
 * When AUTH_DISABLED=true, the app redirects to /login if no dev-user is set.
 * This fixture ensures E2E tests bypass that redirect by pre-selecting a
 * default staff user.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
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
