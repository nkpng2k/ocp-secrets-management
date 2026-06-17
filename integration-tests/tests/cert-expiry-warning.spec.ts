import { test, expect } from '@playwright/test';
import { checkErrors } from '../support';

test.describe('Certificate with short expiration TTL displays Warning status', () => {
  test.afterEach(async ({ page }) => {
    await checkErrors(page);
  });

  test('cert expiring within 30 days shows warning-colored expiry badge', async ({ page }) => {
    await page.goto('/secrets-management');

    const table = page.locator('[data-test="certificates-table"]');
    await expect(table).toBeVisible({ timeout: 30000 });

    // selfsigned-ca-3 has ~13 days remaining (<= 30 days -> warning)
    const ca3Row = table.locator('tr').filter({ hasText: 'selfsigned-ca-3' });
    await expect(ca3Row).toBeVisible({ timeout: 15000 });

    const expiryLabel = ca3Row.locator('.pf-v6-c-label, .pf-v5-c-label').filter({
      hasText: /days remaining/,
    });
    await expect(expiryLabel).toBeVisible();

    const labelClasses = await expiryLabel.getAttribute('class');
    expect(labelClasses).toMatch(/warning|orange/i);
  });

  test('cert expiring within hours shows danger-colored expiry badge', async ({ page }) => {
    await page.goto('/secrets-management');

    const table = page.locator('[data-test="certificates-table"]');
    await expect(table).toBeVisible({ timeout: 30000 });

    // selfsigned-ca-4 has ~18 hours remaining (<= 2 days -> danger)
    const ca4Row = table.locator('tr').filter({ hasText: 'selfsigned-ca-4' });
    await expect(ca4Row).toBeVisible({ timeout: 15000 });

    const expiryLabel = ca4Row.locator('.pf-v6-c-label, .pf-v5-c-label').filter({
      hasText: /Expires in|hours/,
    });
    await expect(expiryLabel).toBeVisible();

    const labelClasses = await expiryLabel.getAttribute('class');
    expect(labelClasses).toMatch(/danger|red/i);
  });

  test('cert with many days remaining shows success-colored expiry badge', async ({ page }) => {
    await page.goto('/secrets-management');

    const table = page.locator('[data-test="certificates-table"]');
    await expect(table).toBeVisible({ timeout: 30000 });

    // selfsigned-ca-2 has ~728 days remaining (> 30 days -> success)
    const ca2Row = table.locator('tr').filter({ hasText: 'selfsigned-ca-2' });
    await expect(ca2Row).toBeVisible({ timeout: 15000 });

    const expiryLabel = ca2Row.locator('.pf-v6-c-label, .pf-v5-c-label').filter({
      hasText: /days remaining/,
    });
    await expect(expiryLabel).toBeVisible();

    const labelClasses = await expiryLabel.getAttribute('class');
    expect(labelClasses).toMatch(/success|green/i);
  });

  test('all certificates still show Ready status regardless of expiry', async ({ page }) => {
    await page.goto('/secrets-management');

    const table = page.locator('[data-test="certificates-table"]');
    await expect(table).toBeVisible({ timeout: 30000 });

    const readyLabels = table.locator('.pf-v6-c-label, .pf-v5-c-label').filter({
      hasText: 'Ready',
    });
    expect(await readyLabels.count()).toBeGreaterThanOrEqual(3);
  });
});
