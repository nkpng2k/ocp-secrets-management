// Certificate custom resource definition from cert-manager
export const CertificateModel = {
  group: 'cert-manager.io',
  version: 'v1',
  kind: 'Certificate',
};

export interface Certificate {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    annotations?: Record<string, string>;
  };
  spec: {
    secretName: string;
    issuerRef: {
      name: string;
      kind: string;
    };
    dnsNames?: string[];
    commonName?: string;
  };
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
      reason?: string;
      message?: string;
    }>;
    renewalTime?: string;
    notAfter?: string;
  };
}

