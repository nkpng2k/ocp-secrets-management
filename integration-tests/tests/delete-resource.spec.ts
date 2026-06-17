import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { checkErrors } from '../support';

const TEST_NAMESPACE = 'e2e-smc-delete';
const TEST_CERT_NAME = 'e2e-delete-test-cert';

const OC_SERVER = process.env.OC_SERVER ?? '';
const OC_TOKEN_OR_PASS = process.env.BRIDGE_KUBEADMIN_PASSWORD ?? '';

function ocLogin(): string {
  if (!OC_SERVER && !OC_TOKEN_OR_PASS) return '';
  return exec(
    `oc login -u kubeadmin -p '${OC_TOKEN_OR_PASS}' ${OC_SERVER} --insecure-skip-tls-verify 2>&1`,
  );
}

function exec(command: string, timeoutMs = 120000) {
  try {
    return execSync(command, { timeout: timeoutMs, encoding: 'utf-8' });
  } catch (e) {
    console.error('Command failed:', command, e);
    return '';
  }
}

test.describe('Successfully delete SMC resource via UI action', () => {
  test.beforeAll(() => {
    ocLogin();

    exec(`oc create namespace ${TEST_NAMESPACE} --dry-run=client -o yaml | oc apply -f -`);

    const certYaml = `
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${TEST_CERT_NAME}
  namespace: ${TEST_NAMESPACE}
spec:
  secretName: ${TEST_CERT_NAME}-secret
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
  dnsNames:
    - e2e-delete-test.example.com
  duration: 2160h
`;
    exec(`echo '${certYaml}' | oc apply -f -`);
    exec(`oc wait --for=condition=Ready certificate/${TEST_CERT_NAME} -n ${TEST_NAMESPACE} --timeout=60s`);
  });

  test.afterAll(() => {
    ocLogin();
    exec(`oc delete certificate ${TEST_CERT_NAME} -n ${TEST_NAMESPACE} --ignore-not-found`);
    exec(`oc delete namespace ${TEST_NAMESPACE} --ignore-not-found`);
  });

  test.afterEach(async ({ page }) => {
    await checkErrors(page);
  });

  test('delete certificate via kebab menu and confirm modal', async ({ page }) => {
    await page.goto('/secrets-management');

    const table = page.locator('[data-test="certificates-table"]');
    await expect(table).toBeVisible({ timeout: 60000 });

    await expect(table.getByText(TEST_CERT_NAME, { exact: true })).toBeVisible({ timeout: 15000 });

    const certRow = table.locator('tr').filter({ has: page.getByRole('cell', { name: TEST_CERT_NAME, exact: true }) });
    const kebab = certRow.locator('[aria-label="kebab dropdown toggle"]');
    await kebab.click();

    await page.getByText('Delete', { exact: true }).click();

    const modal = page.locator('.pf-v6-c-modal-box, .pf-v5-c-modal-box, .pf-c-modal-box');
    await expect(modal).toBeVisible({ timeout: 5000 });

    await expect(modal).toContainText('Are you sure you want to delete');
    await expect(modal).toContainText(TEST_CERT_NAME);

    const confirmInput = modal.locator('#delete-confirmation-input');
    await confirmInput.fill(TEST_CERT_NAME);

    const deleteButton = modal.getByRole('button', { name: /^Delete$/ });
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click();

    await expect(modal).not.toBeVisible({ timeout: 10000 });

    await expect(table.getByText(TEST_CERT_NAME, { exact: true })).not.toBeVisible({ timeout: 15000 });
  });
});
