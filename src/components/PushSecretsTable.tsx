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
import { CheckCircleIcon, ExclamationCircleIcon, TimesCircleIcon, EllipsisVIcon, SyncAltIcon } from '@patternfly/react-icons';
import { ResourceTable } from './ResourceTable';
import { useK8sWatchResource, consoleFetch } from '@openshift-console/dynamic-plugin-sdk';

// PushSecret model from external-secrets-operator
const PushSecretModel = {
  group: 'external-secrets.io',
  version: 'v1alpha1',
  kind: 'PushSecret',
};

interface PushSecret {
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

const getPushSecretStatus = (pushSecret: PushSecret) => {
  if (!pushSecret.status?.conditions) {
    return { status: 'Unknown', icon: <ExclamationCircleIcon />, color: 'grey' };
  }

  const readyCondition = pushSecret.status.conditions.find(
    condition => condition.type === 'Ready'
  );

  if (readyCondition) {
    if (readyCondition.status === 'True') {
      return { status: 'Ready', icon: <CheckCircleIcon />, color: 'green' };
    } else if (readyCondition.status === 'False') {
      return { status: 'Not Ready', icon: <TimesCircleIcon />, color: 'red' };
    }
  }
  
  return { status: 'Syncing', icon: <SyncAltIcon />, color: 'blue' };
};

interface PushSecretsTableProps {
  selectedProject: string;
}

export const PushSecretsTable: React.FC<PushSecretsTableProps> = ({ selectedProject }) => {
  const { t } = useTranslation('plugin__ocp-secrets-management');
  const [openDropdowns, setOpenDropdowns] = React.useState<Record<string, boolean>>({});
  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean;
    pushSecret: PushSecret | null;
    isDeleting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    pushSecret: null,
    isDeleting: false,
    error: null,
  });

  const toggleDropdown = (pushSecretId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [pushSecretId]: !prev[pushSecretId],
    }));
  };

  const handleDelete = async (pushSecret: PushSecret) => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true, error: null }));
    
    try {
      const url = `/api/kubernetes/apis/${PushSecretModel.group}/${PushSecretModel.version}/namespaces/${pushSecret.metadata.namespace}/pushsecrets/${pushSecret.metadata.name}`;
      
      await consoleFetch(url, { method: 'DELETE' });
      setDeleteModal({
        isOpen: false,
        pushSecret: null,
        isDeleting: false,
        error: null,
      });
    } catch (error) {
      setDeleteModal(prev => ({
        ...prev,
        isDeleting: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  };

  const openDeleteModal = (pushSecret: PushSecret) => {
    setDeleteModal({
      isOpen: true,
      pushSecret,
      isDeleting: false,
      error: null,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      pushSecret: null,
      isDeleting: false,
      error: null,
    });
  };

  // Watch PushSecrets
  const [pushSecrets, loaded, loadError] = useK8sWatchResource<PushSecret[]>({
    groupVersionKind: PushSecretModel,
    namespace: selectedProject === 'all' ? undefined : selectedProject,
    isList: true,
  });

  const columns = [
    { title: t('Name'), width: 18 },
    { title: t('Namespace'), width: 14 },
    { title: t('Secret Store'), width: 18 },
    { title: t('Source Secret'), width: 18 },
    { title: t('Refresh Interval'), width: 12 },
    { title: t('Status'), width: 10 },
    { title: '', width: 10 }, // Actions column
  ];

  const rows = React.useMemo(() => {
    if (!loaded || !pushSecrets) return [];

    return pushSecrets.map((pushSecret) => {
      const pushSecretId = `${pushSecret.metadata.namespace}-${pushSecret.metadata.name}`;
      const conditionStatus = getPushSecretStatus(pushSecret);
      
      // Get secret store references
      const secretStoreRefs = pushSecret.spec.secretStoreRefs || [];
      const secretStoreText = secretStoreRefs.length > 0 
        ? secretStoreRefs.map(ref => `${ref.name} (${ref.kind})`).join(', ')
        : 'None';

      // Get source secret name
      const sourceSecret = pushSecret.spec.selector?.secret?.name || 'Unknown';

      // Get refresh interval
      const refreshInterval = pushSecret.spec.refreshInterval || 'Default';

      return {
        cells: [
          pushSecret.metadata.name,
          pushSecret.metadata.namespace,
          secretStoreText,
          sourceSecret,
          refreshInterval,
          (
            <Label color={conditionStatus.color as any} icon={conditionStatus.icon}>
              {conditionStatus.status}
            </Label>
          ),
          (
            <Dropdown
              isOpen={openDropdowns[pushSecretId] || false}
              onSelect={() => setOpenDropdowns(prev => ({ ...prev, [pushSecretId]: false }))}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  aria-label="kebab dropdown toggle"
                  variant="plain"
                  onClick={() => toggleDropdown(pushSecretId)}
                  isExpanded={openDropdowns[pushSecretId] || false}
                >
                  <EllipsisVIcon />
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <DropdownList>
                <DropdownItem
                  key="inspect"
                  onClick={() => {
                    const url = `/secrets-management/inspect/pushsecrets/${pushSecret.metadata.namespace}/${pushSecret.metadata.name}`;
                    window.location.href = url;
                  }}
                >
                  {t('Inspect')}
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  onClick={() => openDeleteModal(pushSecret)}
                >
                  {t('Delete')}
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          ),
        ],
      };
    });
  }, [pushSecrets, loaded, openDropdowns, t]);

  // Handle case where PushSecret CRDs might not be installed
  const getErrorMessage = () => {
    if (loadError?.message?.includes('no matches for kind')) {
      return t('PushSecret resources are not available. Please ensure External Secrets Operator v0.9.0+ is installed with PushSecret CRDs.');
    }
    return loadError?.message;
  };

  return (
    <>
      <ResourceTable
        columns={columns}
        rows={rows}
        loading={!loaded}
        error={getErrorMessage()}
        emptyStateTitle={t('No push secrets found')}
        emptyStateBody={t('No external-secrets-operator PushSecrets are currently available in the selected project.')}
        data-test="push-secrets-table"
      />

      {/* Delete Modal */}
      <Modal
        variant={ModalVariant.small}
        title={`${t('Delete')} ${t('PushSecret')}`}
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
      >
        <div style={{ padding: '1.5rem' }}>
          {deleteModal.error && (
            <Alert variant={AlertVariant.danger} title={t('Delete failed')} isInline style={{ marginBottom: '1.5rem' }}>
              {deleteModal.error}
            </Alert>
          )}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.5' }}>
              {t('Are you sure you want to delete the {resourceType} "{name}"?', {
                resourceType: 'PushSecret',
                name: deleteModal.pushSecret?.metadata.name,
              })}
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6a737d' }}>
              <strong>{t('This action cannot be undone.')}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e1e5e9' }}>
            <Button key="cancel" variant="link" onClick={closeDeleteModal}>
              {t('Cancel')}
            </Button>
            <Button
              key="delete"
              variant="danger"
              onClick={() => deleteModal.pushSecret && handleDelete(deleteModal.pushSecret)}
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
