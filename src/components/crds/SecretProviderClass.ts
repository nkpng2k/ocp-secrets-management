// SecretProviderClass custom resource definition from secrets-store-csi-driver
export const SecretProviderClassModel = {
  group: 'secrets-store.csi.x-k8s.io',
  version: 'v1',
  kind: 'SecretProviderClass',
};

export const SecretProviderClassPodStatusModel = {
  group: 'secrets-store.csi.x-k8s.io',
  version: 'v1',
  kind: 'SecretProviderClassPodStatus',
};

export interface SecretProviderClass {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    provider: string;
    parameters?: Record<string, string>;
    secretObjects?: Array<{
      secretName: string;
      type: string;
      data: Array<{
        objectName: string;
        key: string;
      }>;
    }>;
  };
  status?: {
    podStatus?: {
      [podName: string]: {
        mounted: boolean;
        error?: string;
      };
    };
    byPod?: Array<{
      id: string;
      namespace: string;
    }>;
  };
}

export interface SecretProviderClassPodStatus {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp?: string;
  };
  status: {
    mounted: boolean;
    secretProviderClassName: string;
    podName?: string;
    targetPath?: string;
  };
}

