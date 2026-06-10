import type { Page } from '@playwright/test';

/**
 * Check for uncaught JS errors surfaced by the console bridge.
 * The OpenShift console sets `window.windowError` when an unhandled
 * exception is caught by the global error handler.
 *
 * Missing i18n keys are reported through the same mechanism but are
 * non-fatal warnings, so they are filtered out.
 */
export async function checkErrors(page: Page): Promise<void> {
  const windowError: string | undefined = await page.evaluate(() => (window as any).windowError);
  if (!windowError) return;

  const messages = windowError.split('; ').filter(
    (msg) => !msg.startsWith('Missing i18n key'),
  );

  if (messages.length > 0) {
    throw new Error(`Unexpected JS error on page: ${messages.join('; ')}`);
  }
}
