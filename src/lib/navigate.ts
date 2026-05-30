/**
 * Single source of truth for OAuth-redirect navigation. Extracted to its own
 * module because `window.location` and `window.location.assign` are both
 * non-configurable in Chromium — there is no safe way to test the actual
 * navigation statement in a test runner without leaving the page. This file
 * is excluded from the coverage threshold in web-test-runner.config.js.
 */
export function navigateTo(url: string): void {
  window.location.assign(url);
}
