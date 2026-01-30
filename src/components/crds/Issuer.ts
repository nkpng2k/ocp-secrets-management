// Issuer and ClusterIssuer models from cert-manager
export const IssuerModel = {
  group: 'cert-manager.io',
  version: 'v1',
  kind: 'Issuer',
};

export const ClusterIssuerModel = {
  group: 'cert-manager.io',
  version: 'v1',
  kind: 'ClusterIssuer',
};

export interface Issuer {
  metadata: {
    name: string;
    namespace?: string;
    creationTimestamp: string;
  };
  spec: {
    acme?: {
      server: string;
      email?: string;
    };
    ca?: {
      secretName: string;
    };
    selfSigned?: {};
    vault?: {
      server: string;
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

