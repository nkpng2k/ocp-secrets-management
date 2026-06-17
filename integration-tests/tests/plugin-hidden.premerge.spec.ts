import { test, expect } from '@playwright/test';
import { mockOperatorDetection, mockNamespaces } from '../support/mock-api';

test.describe('Plugin tab hidden when SMC Operator is not installed', () => {
  test.beforeEach(async ({ page }) => {
    await mockOperatorDetection(page, {
      certManager: false,
      externalSecrets: false,
      secretsStoreCSI: false,
    });
    await mockNamespaces(page, ['default']);
  });

  test('displays empty state when no operators are detected', async ({ page }) => {
    await page.goto('/secrets-management');

    await expect(page.getByText('No supported secrets operators detected')).toBeVisible({
      timeout: 30000,
    });
  });

  test('shows install guidance in empty state', async ({ page }) => {
    await page.goto('/secrets-management');

    await expect(page.getByText('No supported secrets operators detected')).toBeVisible({
      timeout: 30000,
    });

    await expect(
      page.getByText(/Install a supported operator.*cert-manager/s),
    ).toBeVisible();
  });

  test('provides catalog link in empty state', async ({ page }) => {
    await page.goto('/secrets-management');

    await expect(page.getByText('No supported secrets operators detected')).toBeVisible({
      timeout: 30000,
    });

    await expect(page.getByText('Go to Catalog')).toBeVisible();
  });

  test('does not render any resource tables', async ({ page }) => {
    await page.goto('/secrets-management');

    await expect(page.getByText('No supported secrets operators detected')).toBeVisible({
      timeout: 30000,
    });

    await expect(page.locator('[data-test="certificates-table"]')).not.toBeVisible();
  });
});
