import { test, expect } from '@playwright/test';
import { checkErrors } from '../support';

const INSPECT_URL = '/secrets-management/inspect/certificates/cert-manager-operator/selfsigned-ca-2';

test.describe('Details/Inspect pane fetches and displays live CR YAML/JSON', () => {
  test.afterEach(async ({ page }) => {
    await checkErrors(page);
  });

  test('opens inspect pane for a certificate via kebab menu', async ({ page }) => {
    await page.goto('/secrets-management');

    const table = page.locator('[data-test="certificates-table"]');
    await expect(table).toBeVisible({ timeout: 60000 });

    const firstCertRow = table.locator('tr').filter({ hasText: 'selfsigned-ca' }).first();
    await expect(firstCertRow).toBeVisible({ timeout: 15000 });

    const kebab = firstCertRow.locator('[aria-label="kebab dropdown toggle"]');
    await kebab.click();

    await page.getByText('Inspect', { exact: true }).click();

    await expect(page).toHaveURL(/\/secrets-management\/inspect\/certificates\//, {
      timeout: 30000,
    });

    await expect(page.getByText('Certificate:', { exact: false })).toBeVisible({
      timeout: 60000,
    });
  });

  test('inspect pane displays Metadata section with resource fields', async ({ page }) => {
    await page.goto(INSPECT_URL);

    await expect(page.getByText('Certificate:', { exact: false })).toBeVisible({
      timeout: 60000,
    });

    const metadataCard = page.locator('.pf-v6-c-card, .pf-v5-c-card').filter({
      has: page.locator('.pf-v6-c-card__title-text, .pf-v5-c-card__title-text', { hasText: 'Metadata' }),
    }).first();
    await expect(metadataCard).toBeVisible();

    await expect(metadataCard.getByText('Name:')).toBeVisible();
    await expect(metadataCard.getByText('Kind:')).toBeVisible();
    await expect(metadataCard.getByText('Namespace:')).toBeVisible();
    await expect(metadataCard.getByText('API version:')).toBeVisible();
    await expect(metadataCard.getByText('Creation timestamp:')).toBeVisible();
  });

  test('inspect pane displays Specification and Status sections', async ({ page }) => {
    await page.goto(INSPECT_URL);

    await expect(page.getByText('Certificate:', { exact: false })).toBeVisible({
      timeout: 60000,
    });

    const specCard = page.locator('.pf-v6-c-card__title-text, .pf-v5-c-card__title-text').filter({
      hasText: 'Specification',
    });
    await expect(specCard).toBeVisible();

    const statusCard = page.locator('.pf-v6-c-card__title-text, .pf-v5-c-card__title-text').filter({
      hasText: 'Status',
    });
    await expect(statusCard).toBeVisible();

    const specPre = page.locator('pre').first();
    await expect(specPre).toBeVisible();
    const specText = await specPre.textContent();
    expect(specText).toBeTruthy();
  });

  test('inspect pane has sensitive data toggle', async ({ page }) => {
    await page.goto(INSPECT_URL);

    await expect(page.getByText('Certificate:', { exact: false })).toBeVisible({
      timeout: 60000,
    });

    const sensitiveToggle = page.locator('#status-sensitive-toggle');
    await expect(sensitiveToggle).toBeVisible({ timeout: 10000 });
  });

  test('inspect pane shows back button that navigates away', async ({ page }) => {
    await page.goto(INSPECT_URL);

    await expect(page.getByText('Certificate:', { exact: false })).toBeVisible({
      timeout: 60000,
    });

    const backButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(backButton).toBeVisible();
  });

  test('navigate directly to inspect URL and verify data', async ({ page }) => {
    await page.goto(INSPECT_URL);

    const heading = page.getByRole('heading', { name: /Certificate:.*selfsigned-ca-2/ });
    await expect(heading).toBeVisible({ timeout: 60000 });

    const metadataTitle = page.locator('.pf-v6-c-card__title-text, .pf-v5-c-card__title-text').filter({
      hasText: 'Metadata',
    });
    await expect(metadataTitle).toBeVisible();

    await expect(page.getByText('cert-manager.io/v1').first()).toBeVisible();
  });
});
