import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { 
  Label, 
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalVariant,
  Button,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, TimesCircleIcon, EllipsisVIcon } from '@patternfly/react-icons';
import { ResourceTable } from './ResourceTable';
import { useK8sWatchResource, k8sDelete } from '@openshift-console/dynamic-plugin-sdk';

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
  const [openDropdowns, setOpenDropdowns] = React.useState<Record<string, boolean>>({});
  
  const toggleDropdown = (storeId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [storeId]: !prev[storeId]
    }));
  };

  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean;
    secretStore: SecretStore | null;
    isDeleting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    secretStore: null,
    isDeleting: false,
    error: null,
  });

  const handleInspect = (secretStore: SecretStore) => {
    const resourceType = secretStore.metadata.namespace ? 'secretstores' : 'clustersecretstores';
    const name = secretStore.metadata.name;
    if (secretStore.metadata.namespace) {
      window.location.href = `/secrets-management/inspect/${resourceType}/${secretStore.metadata.namespace}/${name}`;
    } else {
      window.location.href = `/secrets-management/inspect/${resourceType}/${name}`;
    }
  };

  const handleDelete = (secretStore: SecretStore) => {
    setDeleteModal({
      isOpen: true,
      secretStore,
      isDeleting: false,
      error: null,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.secretStore) return;
    
    setDeleteModal(prev => ({ ...prev, isDeleting: true, error: null }));
    
    try {
      const isClusterScoped = !deleteModal.secretStore.metadata.namespace;
      const model = isClusterScoped ? ClusterSecretStoreModel : SecretStoreModel;
      const resourceType = isClusterScoped ? 'ClusterSecretStore' : 'SecretStore';
      
      await k8sDelete({
        model: {
          ...model,
          abbr: isClusterScoped ? 'clustersecretstore' : 'secretstore',
          label: resourceType,
          labelPlural: `${resourceType}s`,
          plural: isClusterScoped ? 'clustersecretstores' : 'secretstores',
          apiVersion: `${model.group}/${model.version}`,
        },
        resource: deleteModal.secretStore,
      });
      
      // Close modal on success
      setDeleteModal({
        isOpen: false,
        secretStore: null,
        isDeleting: false,
        error: null,
      });
    } catch (error: any) {
      setDeleteModal(prev => ({
        ...prev,
        isDeleting: false,
        error: error.message || 'Failed to delete secret store',
      }));
    }
  };

  const cancelDelete = () => {
    setDeleteModal({
      isOpen: false,
      secretStore: null,
      isDeleting: false,
      error: null,
    });
  };
  
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
    { title: t('Name'), width: 16 },
    { title: t('Type'), width: 11 },
    { title: t('Scope'), width: 9 },
    { title: t('Provider'), width: 16 },
    { title: t('Details'), width: 26 },
    { title: t('Status'), width: 12 },
    { title: '', width: 10 }, // Actions column
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
      const storeId = `${secretStore.metadata.namespace || 'cluster'}-${secretStore.metadata.name}`;
      
      return {
        cells: [
          secretStore.metadata.name,
          secretStore.scope === 'Namespace' ? 'SecretStore' : 'ClusterSecretStore',
          secretStore.scope,
          providerType,
          providerDetails,
          (
            <Label color={conditionStatus.color as any} icon={conditionStatus.icon}>
              {conditionStatus.status}
            </Label>
          ),
          (
            <Dropdown
              isOpen={openDropdowns[storeId] || false}
              onSelect={() => setOpenDropdowns(prev => ({ ...prev, [storeId]: false }))}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  aria-label="kebab dropdown toggle"
                  variant="plain"
                  onClick={() => toggleDropdown(storeId)}
                  isExpanded={openDropdowns[storeId] || false}
                >
                  <EllipsisVIcon />
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <DropdownList>
                <DropdownItem
                  key="inspect"
                  onClick={() => handleInspect(secretStore)}
                >
                  {t('Inspect')}
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  onClick={() => handleDelete(secretStore)}
                >
                  {t('Delete')}
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          ),
        ],
      };
    });
  }, [secretStores, clusterSecretStores, loaded, openDropdowns, t]);

  return (
    <>
      <ResourceTable
        columns={columns}
        rows={rows}
        loading={!loaded}
        error={loadError?.message}
        emptyStateTitle={t('No secret stores found')}
        emptyStateBody={t('No external-secrets-operator SecretStores are currently available in the demo project or cluster.')}
        data-test="secret-stores-table"
      />
      
      <Modal
        variant={ModalVariant.small}
        title={t('Delete {resourceType}', { 
          resourceType: deleteModal.secretStore?.metadata?.namespace ? t('SecretStore') : t('ClusterSecretStore')
        })}
        isOpen={deleteModal.isOpen}
        onClose={cancelDelete}
      >
        {deleteModal.error && (
          <Alert variant={AlertVariant.danger} title={t('Delete failed')} isInline style={{ marginBottom: '1rem' }}>
            {deleteModal.error}
          </Alert>
        )}
        <p>
          {t('Are you sure you want to delete the {resourceType} "{name}"?', {
            resourceType: deleteModal.secretStore?.metadata?.namespace ? t('SecretStore') : t('ClusterSecretStore'),
            name: deleteModal.secretStore?.metadata?.name || '',
          })}
        </p>
        <p>
          <strong>{t('This action cannot be undone.')}</strong>
        </p>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Button key="cancel" variant="link" onClick={cancelDelete}>
            {t('Cancel')}
          </Button>
          <Button
            key="confirm"
            variant="danger"
            onClick={confirmDelete}
            isDisabled={deleteModal.isDeleting}
            isLoading={deleteModal.isDeleting}
            spinnerAriaValueText={deleteModal.isDeleting ? t('Deleting...') : undefined}
          >
            {deleteModal.isDeleting ? t('Deleting...') : t('Delete')}
          </Button>
        </div>
      </Modal>
    </>
  );
};
