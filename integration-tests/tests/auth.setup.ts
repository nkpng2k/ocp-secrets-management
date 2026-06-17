import { test as setup } from '@playwright/test';
import { LoginPage } from '../pages/login';

setup.use({ actionTimeout: 60000 });

// eslint-disable-next-line playwright/expect-expect -- setup test saves storageState, no assertions needed
setup('authenticate', async ({ page }) => {
  setup.setTimeout(120000);

  const loginPage = new LoginPage(page);
  await loginPage.login();

  const skipTour = page.getByTestId('tour-step-footer-secondary').filter({ hasText: 'Skip tour' });
  try {
    await skipTour.click({ timeout: 15000 });
  } catch {
    // tour dialog may not appear on all clusters
  }

  await page.context().storageState({ path: 'integration-tests/.auth/user.json' });
});
