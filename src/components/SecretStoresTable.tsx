import * as React from 'react';
import { useTranslation } from 'react-i18next';


import { Label } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';
import { ResourceTable } from './ResourceTable';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

// SecretStore and ClusterSecretStore models from external-secrets-operator
const SecretStoreModel = {
  group: 'external-secrets.io',
  version: 'v1beta1',
  kind: 'SecretStore',
};

const ClusterSecretStoreModel = {
  group: 'external-secrets.io',
  version: 'v1beta1',
  kind: 'ClusterSecretStore',
};

interface SecretStore {
  metadata: {
    name: string;
    namespace?: string;
    creationTimestamp: string;
  };
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

const getProviderType = (secretStore: SecretStore): string => {
  const provider = secretStore.spec.provider;
  if (provider.aws) return 'AWS';
  if (provider.azurekv) return 'Azure Key Vault';
  if (provider.gcpsm) return 'Google Secret Manager';
  if (provider.vault) return 'HashiCorp Vault';
  if (provider.kubernetes) return 'Kubernetes';
  if (provider.doppler) return 'Doppler';
  if (provider.onepassword) return '1Password';
  if (provider.gitlab) return 'GitLab';
  if (provider.fake) return 'Fake (Testing)';
  return 'Unknown';
};

const getProviderDetails = (secretStore: SecretStore): string => {
  const provider = secretStore.spec.provider;
  if (provider.aws) return `${provider.aws.service} (${provider.aws.region || 'default'})`;
  if (provider.azurekv) return provider.azurekv.vaultUrl;
  if (provider.gcpsm) return provider.gcpsm.projectId;
  if (provider.vault) return provider.vault.server;
  if (provider.kubernetes) return provider.kubernetes.server || 'In-cluster';
  if (provider.doppler) return provider.doppler.apiUrl || 'Default API';
  if (provider.onepassword) return provider.onepassword.connectHost;
  if (provider.gitlab) return provider.gitlab.url || 'gitlab.com';
  if (provider.fake) return `${provider.fake.data?.length || 0} entries`;
  return '-';
};

const getConditionStatus = (secretStore: SecretStore) => {
  const readyCondition = secretStore.status?.conditions?.find(
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

export const SecretStoresTable: React.FC = () => {
  const { t } = useTranslation('plugin__ocp-secrets-management');
  
  // Watch both SecretStores and ClusterSecretStores
  const [secretStores, secretStoresLoaded, secretStoresError] = useK8sWatchResource<SecretStore[]>({
    groupVersionKind: SecretStoreModel,
    namespace: 'demo', // Focus on demo project
    isList: true,
  });

  const [clusterSecretStores, clusterSecretStoresLoaded, clusterSecretStoresError] = useK8sWatchResource<SecretStore[]>({
    groupVersionKind: ClusterSecretStoreModel,
    isList: true,
  });

  const loaded = secretStoresLoaded && clusterSecretStoresLoaded;
  const loadError = secretStoresError || clusterSecretStoresError;

  const columns = [
    { title: t('Name'), width: 18 },
    { title: t('Type'), width: 15 },
    { title: t('Scope'), width: 10 },
    { title: t('Provider'), width: 17 },
    { title: t('Status'), width: 12 },
    { title: t('Details'), width: 28 },
  ];

  const rows = React.useMemo(() => {
    if (!loaded) return [];
    
    const allSecretStores = [
      ...(secretStores || []).map(store => ({ ...store, scope: 'Namespace' })),
      ...(clusterSecretStores || []).map(store => ({ ...store, scope: 'Cluster' })),
    ];
    
    return allSecretStores.map((secretStore) => {
      const conditionStatus = getConditionStatus(secretStore);
      const providerType = getProviderType(secretStore);
      const providerDetails = getProviderDetails(secretStore);
      
      return {
        cells: [
          secretStore.metadata.name,
          secretStore.scope === 'Namespace' ? 'SecretStore' : 'ClusterSecretStore',
          secretStore.scope,
          providerType,
          (
            <Label color={conditionStatus.color as any} icon={conditionStatus.icon}>
              {conditionStatus.status}
            </Label>
          ),
          providerDetails,
        ],
      };
    });
  }, [secretStores, clusterSecretStores, loaded]);

  return (
    <ResourceTable
      columns={columns}
      rows={rows}
      loading={!loaded}
      error={loadError?.message}
      emptyStateTitle={t('No secret stores found')}
      emptyStateBody={t('No external-secrets-operator SecretStores are currently available in the demo project or cluster.')}
      data-test="secret-stores-table"
    />
  );
};
