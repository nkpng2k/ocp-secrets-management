import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Label } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';
import { ResourceTable } from './ResourceTable';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

// Certificate custom resource definition from cert-manager
const CertificateModel = {
  group: 'cert-manager.io',
  version: 'v1',
  kind: 'Certificate',
};

interface Certificate {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
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

const getConditionStatus = (certificate: Certificate) => {
  const readyCondition = certificate.status?.conditions?.find(
    (condition) => condition.type === 'Ready'
  );
  
  if (!readyCondition) {
    return { status: 'Unknown', icon: <ExclamationCircleIcon />, color: 'orange' };
  }
  
  if (readyCondition.status === 'True') {
    return { status: 'Ready', icon: <CheckCircleIcon />, color: 'green' };
  }
  
  return { status: 'Not Ready', icon: <TimesCircleIcon />, color: 'red' };
};

export const CertificatesTable: React.FC = () => {
  const { t } = useTranslation('plugin__ocp-secrets-management');
  
  const [certificates, loaded, loadError] = useK8sWatchResource<Certificate[]>({
    groupVersionKind: CertificateModel,
    namespace: 'demo', // Focus on demo project as requested
    isList: true,
  });

  const columns = [
    { title: t('Name'), width: 20 },
    { title: t('Namespace'), width: 15 },
    { title: t('Secret'), width: 20 },
    { title: t('Issuer'), width: 15 },
    { title: t('Status'), width: 15 },
    { title: t('DNS Names'), width: 15 },
  ];

  const rows = React.useMemo(() => {
    if (!loaded || !certificates) return [];
    
    return certificates.map((cert) => {
      const conditionStatus = getConditionStatus(cert);
      const dnsNames = cert.spec.dnsNames?.join(', ') || cert.spec.commonName || '-';
      
      return {
        cells: [
          cert.metadata.name,
          cert.metadata.namespace,
          cert.spec.secretName,
          `${cert.spec.issuerRef.name} (${cert.spec.issuerRef.kind})`,
          (
            <Label color={conditionStatus.color as any} icon={conditionStatus.icon}>
              {conditionStatus.status}
            </Label>
          ),
          dnsNames,
        ],
      };
    });
  }, [certificates, loaded]);

  return (
    <ResourceTable
      columns={columns}
      rows={rows}
      loading={!loaded}
      error={loadError?.message}
      emptyStateTitle={t('No certificates found')}
      emptyStateBody={t('No cert-manager certificates are currently available in the demo project.')}
      data-test="certificates-table"
    />
  );
};
