// PushSecret model from external-secrets-operator
export const PushSecretModel = {
  group: 'external-secrets.io',
  version: 'v1alpha1',
  kind: 'PushSecret',
};

// ClusterPushSecret model from external-secrets-operator
export const ClusterPushSecretModel = {
  group: 'external-secrets.io',
  version: 'v1alpha1',
  kind: 'ClusterPushSecret',
};

export interface PushSecret {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    refreshInterval?: string;
    secretStoreRefs: Array<{
      name: string;
      kind: string;
    }>;
    selector: {
      secret: {
        name: string;
      };
    };
    data?: Array<{
      match: {
        secretKey: string;
        remoteRef: {
          remoteKey: string;
          property?: string;
        };
      };
    }>;
  };
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
      reason?: string;
      message?: string;
      lastTransitionTime?: string;
    }>;
    refreshTime?: string;
    syncedResourceVersion?: string;
  };
}

export interface ClusterPushSecret {
  metadata: {
    name: string;
    namespace?: string; // ClusterPushSecret is cluster-scoped
    creationTimestamp: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    refreshInterval?: string;
    secretStoreRefs: Array<{
      name: string;
      kind: string;
    }>;
    selector: {
      secret: {
        name: string;
      };
    };
    namespaceSelector?: {
      matchLabels?: Record<string, string>;
    };
    data?: Array<{
      match: {
        secretKey: string;
        remoteRef: {
          remoteKey: string;
          property?: string;
        };
      };
    }>;
  };
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
      reason?: string;
      message?: string;
      lastTransitionTime?: string;
    }>;
    refreshTime?: string;
    syncedResourceVersion?: string;
  };
}

export type PushSecretResource = PushSecret | ClusterPushSecret;

export const isClusterPushSecret = (resource: PushSecretResource): resource is ClusterPushSecret => {
  return !resource.metadata.namespace;
};

