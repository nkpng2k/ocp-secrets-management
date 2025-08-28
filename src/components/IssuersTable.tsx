import * as React from 'react';
import { useTranslation } from 'react-i18next';


import { Label } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';
import { ResourceTable } from './ResourceTable';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

// Issuer and ClusterIssuer models from cert-manager
const IssuerModel = {
  group: 'cert-manager.io',
  version: 'v1',
  kind: 'Issuer',
};

const ClusterIssuerModel = {
  group: 'cert-manager.io',
  version: 'v1',
  kind: 'ClusterIssuer',
};

interface Issuer {
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

const getIssuerType = (issuer: Issuer): string => {
  if (issuer.spec.acme) return 'ACME';
  if (issuer.spec.ca) return 'CA';
  if (issuer.spec.selfSigned) return 'Self-Signed';
  if (issuer.spec.vault) return 'Vault';
  return 'Unknown';
};

const getConditionStatus = (issuer: Issuer) => {
  const readyCondition = issuer.status?.conditions?.find(
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

export const IssuersTable: React.FC = () => {
  const { t } = useTranslation('plugin__ocp-secrets-management');
  
  // Watch both Issuers and ClusterIssuers
  const [issuers, issuersLoaded, issuersError] = useK8sWatchResource<Issuer[]>({
    groupVersionKind: IssuerModel,
    namespace: 'demo', // Focus on demo project
    isList: true,
  });

  const [clusterIssuers, clusterIssuersLoaded, clusterIssuersError] = useK8sWatchResource<Issuer[]>({
    groupVersionKind: ClusterIssuerModel,
    isList: true,
  });

  const loaded = issuersLoaded && clusterIssuersLoaded;
  const loadError = issuersError || clusterIssuersError;

  const columns = [
    { title: t('Name'), width: 20 },
    { title: t('Type'), width: 12 },
    { title: t('Scope'), width: 12 },
    { title: t('Issuer Type'), width: 15 },
    { title: t('Details'), width: 29 },
    { title: t('Status'), width: 12 },
  ];

  const rows = React.useMemo(() => {
    if (!loaded) return [];
    
    const allIssuers = [
      ...(issuers || []).map(issuer => ({ ...issuer, scope: 'Namespace' })),
      ...(clusterIssuers || []).map(issuer => ({ ...issuer, scope: 'Cluster' })),
    ];
    
    return allIssuers.map((issuer) => {
      const conditionStatus = getConditionStatus(issuer);
      const issuerType = getIssuerType(issuer);
      
      let details = '-';
      if (issuer.spec.acme) {
        details = issuer.spec.acme.server;
      } else if (issuer.spec.ca) {
        details = issuer.spec.ca.secretName;
      } else if (issuer.spec.vault) {
        details = issuer.spec.vault.server;
      }
      
      return {
        cells: [
          issuer.metadata.name,
          issuer.scope === 'Namespace' ? 'Issuer' : 'ClusterIssuer',
          issuer.scope,
          issuerType,
          details,
          (
            <Label color={conditionStatus.color as any} icon={conditionStatus.icon}>
              {conditionStatus.status}
            </Label>
          ),
        ],
      };
    });
  }, [issuers, clusterIssuers, loaded]);

  return (
    <ResourceTable
      columns={columns}
      rows={rows}
      loading={!loaded}
      error={loadError?.message}
      emptyStateTitle={t('No issuers found')}
      emptyStateBody={t('No cert-manager issuers are currently available in the demo project or cluster.')}
      data-test="issuers-table"
    />
  );
};
