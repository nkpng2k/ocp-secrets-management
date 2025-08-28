import * as React from 'react';
import { useTranslation } from 'react-i18next';


import { Label } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, TimesCircleIcon, SyncAltIcon } from '@patternfly/react-icons';
import { ResourceTable } from './ResourceTable';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

// ExternalSecret custom resource definition from external-secrets-operator
const ExternalSecretModel = {
  group: 'external-secrets.io',
  version: 'v1beta1',
  kind: 'ExternalSecret',
};

interface ExternalSecret {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
  };
  spec: {
    secretStoreRef: {
      name: string;
      kind: string;
    };
    target: {
      name: string;
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

const getConditionStatus = (externalSecret: ExternalSecret) => {
  const readyCondition = externalSecret.status?.conditions?.find(
    (condition) => condition.type === 'Ready'
  );
  
  if (!readyCondition) {
    return { status: 'Unknown', icon: <ExclamationCircleIcon />, color: 'orange' };
  }
  
  if (readyCondition.status === 'True') {
    return { status: 'Synced', icon: <CheckCircleIcon />, color: 'green' };
  }
  
  const syncCondition = externalSecret.status?.conditions?.find(
    (condition) => condition.type === 'SecretSynced'
  );
  
  if (syncCondition?.status === 'False') {
    return { status: 'Sync Failed', icon: <TimesCircleIcon />, color: 'red' };
  }
  
  return { status: 'Syncing', icon: <SyncAltIcon />, color: 'blue' };
};

export const ExternalSecretsTable: React.FC = () => {
  const { t } = useTranslation('plugin__ocp-secrets-management');
  
  const [externalSecrets, loaded, loadError] = useK8sWatchResource<ExternalSecret[]>({
    groupVersionKind: ExternalSecretModel,
    namespace: 'demo', // Focus on demo project as requested
    isList: true,
  });

  const columns = [
    { title: t('Name'), width: 18 },
    { title: t('Namespace'), width: 12 },
    { title: t('Target Secret'), width: 18 },
    { title: t('Secret Store'), width: 25 },
    { title: t('Refresh Interval'), width: 15 },
    { title: t('Status'), width: 12 },
  ];

  const rows = React.useMemo(() => {
    if (!loaded || !externalSecrets) return [];
    
    return externalSecrets.map((externalSecret) => {
      const conditionStatus = getConditionStatus(externalSecret);
      const refreshInterval = externalSecret.spec.refreshInterval || 'Not set';
      
      return {
        cells: [
          externalSecret.metadata.name,
          externalSecret.metadata.namespace,
          externalSecret.spec.target.name,
          `${externalSecret.spec.secretStoreRef.name} (${externalSecret.spec.secretStoreRef.kind})`,
          refreshInterval,
          (
            <Label color={conditionStatus.color as any} icon={conditionStatus.icon}>
              {conditionStatus.status}
            </Label>
          ),
        ],
      };
    });
  }, [externalSecrets, loaded]);

  return (
    <ResourceTable
      columns={columns}
      rows={rows}
      loading={!loaded}
      error={loadError?.message}
      emptyStateTitle={t('No external secrets found')}
      emptyStateBody={t('No external-secrets-operator ExternalSecrets are currently available in the demo project.')}
      data-test="external-secrets-table"
    />
  );
};
