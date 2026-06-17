import type { Page, Route } from '@playwright/test';

const CRD_BASE = '/api/kubernetes/apis/apiextensions.k8s.io/v1/customresourcedefinitions';

const CERT_MANAGER_CRDS = ['certificates.cert-manager.io', 'issuers.cert-manager.io'];
const EXTERNAL_SECRETS_CRDS = [
  'externalsecrets.external-secrets.io',
  'secretstores.external-secrets.io',
];
const SECRETS_STORE_CSI_CRDS = ['secretproviderclasses.secrets-store.csi.x-k8s.io'];

function crdResponse(crdName: string) {
  return {
    kind: 'CustomResourceDefinition',
    apiVersion: 'apiextensions.k8s.io/v1',
    metadata: { name: crdName },
  };
}

export interface MockOperatorOptions {
  certManager?: boolean;
  externalSecrets?: boolean;
  secretsStoreCSI?: boolean;
}

/**
 * Intercept operator-detection CRD lookups so the UI thinks specific
 * operators are (or are not) installed.
 */
export async function mockOperatorDetection(
  page: Page,
  opts: MockOperatorOptions = {},
): Promise<void> {
  const { certManager = false, externalSecrets = false, secretsStoreCSI = false } = opts;

  const routes: [string[], boolean][] = [
    [CERT_MANAGER_CRDS, certManager],
    [EXTERNAL_SECRETS_CRDS, externalSecrets],
    [SECRETS_STORE_CSI_CRDS, secretsStoreCSI],
  ];

  for (const [crds, installed] of routes) {
    for (const crd of crds) {
      await page.route(`**${CRD_BASE}/${crd}`, (route: Route) =>
        installed
          ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(crdResponse(crd)) })
          : route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ kind: 'Status', code: 404, message: 'not found' }) }),
      );
    }
  }
}

/**
 * Intercept the WebSocket-based K8s watch that `useK8sWatchResource` uses
 * for resource lists.  For pre-merge mocking we intercept the REST list
 * endpoint and return canned data; the console SDK falls back to polling
 * when the WS isn't available.
 */
export async function mockK8sResourceList(
  page: Page,
  apiGroup: string,
  version: string,
  resource: string,
  items: unknown[],
): Promise<void> {
  const pattern = `**/api/kubernetes/apis/${apiGroup}/${version}/${resource}?*`;
  await page.route(pattern, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        apiVersion: `${apiGroup}/${version}`,
        kind: `${resource.charAt(0).toUpperCase() + resource.slice(1)}List`,
        metadata: { resourceVersion: '1' },
        items,
      }),
    }),
  );

  const nsPattern = `**/api/kubernetes/apis/${apiGroup}/${version}/namespaces/*//${resource}?*`;
  await page.route(nsPattern, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        apiVersion: `${apiGroup}/${version}`,
        kind: `${resource.charAt(0).toUpperCase() + resource.slice(1)}List`,
        metadata: { resourceVersion: '1' },
        items,
      }),
    }),
  );
}

export async function mockNamespaces(page: Page, namespaces: string[]): Promise<void> {
  const items = namespaces.map((ns) => ({
    metadata: { name: ns },
    status: { phase: 'Active' },
  }));
  await page.route('**/api/kubernetes/api/v1/namespaces?*', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        apiVersion: 'v1',
        kind: 'NamespaceList',
        metadata: { resourceVersion: '1' },
        items,
      }),
    }),
  );
}

export async function mockDeleteResource(
  page: Page,
  apiGroup: string,
  version: string,
  resource: string,
  opts: { succeed?: boolean } = {},
): Promise<void> {
  const { succeed = true } = opts;
  const pattern = `**/api/kubernetes/apis/${apiGroup}/${version}/namespaces/*/${resource}/*`;
  await page.route(pattern, (route: Route) => {
    if (route.request().method() !== 'DELETE') {
      return route.fallback();
    }
    if (succeed) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ kind: 'Status', status: 'Success' }),
      });
    }
    return route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ kind: 'Status', status: 'Failure', message: 'forbidden' }),
    });
  });
}
