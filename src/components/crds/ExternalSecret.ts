// ExternalSecret custom resource definition from external-secrets-operator
export const ExternalSecretModel = {
  group: 'external-secrets.io',
  version: 'v1',
  kind: 'ExternalSecret',
};

// ClusterExternalSecret custom resource definition from external-secrets-operator
export const ClusterExternalSecretModel = {
  group: 'external-secrets.io',
  version: 'v1',
  kind: 'ClusterExternalSecret',
};

export interface ExternalSecret {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    annotations?: Record<string, string>;
  };
  spec: {
    secretStoreRef?: {
      name: string;
      kind: string;
    };
    target?: {
      name?: string;
      creationPolicy?: string;
    };
    refreshInterval?: string;
    data?: Array<{
      secretKey: string;
      remoteRef: {
        key: string;
        property?: string;
      };
    }>;
  };
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
      reason?: string;
      message?: string;
    }>;
    refreshTime?: string;
    syncedResourceVersion?: string;
  };
}

export interface ClusterExternalSecret {
  metadata: {
    name: string;
    namespace?: string; // ClusterExternalSecret is cluster-scoped
    creationTimestamp: string;
    annotations?: Record<string, string>;
  };
  spec: {
    externalSecretSpec: {
      secretStoreRef?: {
        name: string;
        kind: string;
      };
      target?: {
        name?: string;
        creationPolicy?: string;
      };
      refreshInterval?: string;
      data?: Array<{
        secretKey: string;
        remoteRef: {
          key: string;
          property?: string;
        };
      }>;
    };
    namespaceSelector?: {
      matchLabels?: Record<string, string>;
    };
    refreshTime?: string;
  };
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
      reason?: string;
      message?: string;
    }>;
    provisionedNamespaces?: number;
    failedNamespaces?: number;
  };
}

export type ExternalSecretResource = ExternalSecret | ClusterExternalSecret;

export const isClusterExternalSecret = (resource: ExternalSecretResource): resource is ClusterExternalSecret => {
  return 'externalSecretSpec' in resource.spec;
};

