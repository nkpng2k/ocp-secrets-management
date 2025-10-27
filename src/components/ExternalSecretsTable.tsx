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
import { CheckCircleIcon, ExclamationCircleIcon, TimesCircleIcon, SyncAltIcon, EllipsisVIcon } from '@patternfly/react-icons';
import { ResourceTable } from './ResourceTable';
import { useK8sWatchResource, consoleFetch } from '@openshift-console/dynamic-plugin-sdk';

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

interface ExternalSecretsTableProps {
  selectedProject: string;
}

export const ExternalSecretsTable: React.FC<ExternalSecretsTableProps> = ({ selectedProject }) => {
  const { t } = useTranslation('plugin__ocp-secrets-management');
  const [openDropdowns, setOpenDropdowns] = React.useState<Record<string, boolean>>({});
  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean;
    externalSecret: ExternalSecret | null;
    isDeleting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    externalSecret: null,
    isDeleting: false,
    error: null,
  });
  
  const toggleDropdown = (secretId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [secretId]: !prev[secretId]
    }));
  };

  const handleInspect = (externalSecret: ExternalSecret) => {
    const namespace = externalSecret.metadata.namespace || 'demo';
    const name = externalSecret.metadata.name;
    window.location.href = `/secrets-management/inspect/externalsecrets/${namespace}/${name}`;
  };

  const handleDelete = (externalSecret: ExternalSecret) => {
    setDeleteModal({
      isOpen: true,
      externalSecret,
      isDeleting: false,
      error: null,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.externalSecret) return;
    
    setDeleteModal(prev => ({ ...prev, isDeleting: true, error: null }));
    
    try {
      // Manual delete using fetch to bypass k8sDelete API path issues
      const resourceName = deleteModal.externalSecret?.metadata?.name;
      const resourceNamespace = deleteModal.externalSecret?.metadata?.namespace;
      const apiPath = `/api/kubernetes/apis/external-secrets.io/v1beta1/namespaces/${resourceNamespace}/externalsecrets/${resourceName}`;
      
      const response = await consoleFetch(apiPath, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // Close modal on success
      setDeleteModal({
        isOpen: false,
        externalSecret: null,
        isDeleting: false,
        error: null,
      });
    } catch (error: any) {
      setDeleteModal(prev => ({
        ...prev,
        isDeleting: false,
        error: error.message || 'Failed to delete external secret',
      }));
    }
  };

  const cancelDelete = () => {
    setDeleteModal({
      isOpen: false,
      externalSecret: null,
      isDeleting: false,
      error: null,
    });
  };
  
  const [externalSecrets, loaded, loadError] = useK8sWatchResource<ExternalSecret[]>({
    groupVersionKind: ExternalSecretModel,
    namespace: selectedProject === 'all' ? undefined : selectedProject,
    isList: true,
  });

  const columns = [
    { title: t('Name'), width: 16 },
    { title: t('Namespace'), width: 10 },
    { title: t('Target Secret'), width: 16 },
    { title: t('Secret Store'), width: 22 },
    { title: t('Refresh Interval'), width: 14 },
    { title: t('Status'), width: 12 },
    { title: '', width: 10 }, // Actions column
  ];

  const rows = React.useMemo(() => {
    if (!loaded || !externalSecrets) return [];
    
    return externalSecrets.map((externalSecret) => {
      const conditionStatus = getConditionStatus(externalSecret);
      const refreshInterval = externalSecret.spec.refreshInterval || 'Not set';
      const secretId = `${externalSecret.metadata.namespace}-${externalSecret.metadata.name}`;
      
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
          (
            <Dropdown
              isOpen={openDropdowns[secretId] || false}
              onSelect={() => setOpenDropdowns(prev => ({ ...prev, [secretId]: false }))}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  aria-label="kebab dropdown toggle"
                  variant="plain"
                  onClick={() => toggleDropdown(secretId)}
                  isExpanded={openDropdowns[secretId] || false}
                >
                  <EllipsisVIcon />
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <DropdownList>
                <DropdownItem
                  key="inspect"
                  onClick={() => handleInspect(externalSecret)}
                >
                  {t('Inspect')}
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  onClick={() => handleDelete(externalSecret)}
                >
                  {t('Delete')}
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          ),
        ],
      };
    });
  }, [externalSecrets, loaded, openDropdowns, t]);

  return (
    <>
      <ResourceTable
        columns={columns}
        rows={rows}
        loading={!loaded}
        error={loadError?.message}
        emptyStateTitle={t('No external secrets found')}
        emptyStateBody={t('No external-secrets-operator ExternalSecrets are currently available in the demo project.')}
        data-test="external-secrets-table"
      />
      
      <Modal
        variant={ModalVariant.small}
        title={`${t('Delete')} ${t('ExternalSecret')}`}
        isOpen={deleteModal.isOpen}
        onClose={cancelDelete}
      >
        <div style={{ padding: '1.5rem' }}>
          {deleteModal.error && (
            <Alert variant={AlertVariant.danger} title={t('Delete failed')} isInline style={{ marginBottom: '1.5rem' }}>
              {deleteModal.error}
            </Alert>
          )}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.5' }}>
              {`Are you sure you want to delete the ${t('ExternalSecret')} "${deleteModal.externalSecret?.metadata?.name || ''}"?`}
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6a737d' }}>
              <strong>{t('This action cannot be undone.')}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e1e5e9' }}>
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
        </div>
      </Modal>
    </>
  );
};
