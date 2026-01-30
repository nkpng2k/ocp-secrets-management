// SecretStore and ClusterSecretStore models from external-secrets-operator
export const SecretStoreModel = {
  group: 'external-secrets.io',
  version: 'v1',
  kind: 'SecretStore',
};

export const ClusterSecretStoreModel = {
  group: 'external-secrets.io',
  version: 'v1',
  kind: 'ClusterSecretStore',
};

export interface SecretStore {
  metadata: {
    name: string;
    namespace?: string;
    creationTimestamp: string;
  };
  scope?: 'Namespace' | 'Cluster';
  spec: {
    provider: {
      aws?: { service: string; region?: string };
      azurekv?: { vaultUrl: string };
      gcpsm?: { projectId: string };
      vault?: { server: string };
      kubernetes?: { server?: string };
      doppler?: { apiUrl?: string };
      onepassword?: { connectHost: string };
      gitlab?: { url?: string };
      fake?: { data: any[] };
    };
  };
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
      reason?: string;
      message?: string;
    }>;
  };
}

