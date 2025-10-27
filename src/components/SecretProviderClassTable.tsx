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
import { useK8sWatchResource, consoleFetch } from '@openshift-console/dynamic-plugin-sdk';

// SecretProviderClass custom resource definition from secrets-store-csi-driver
const SecretProviderClassModel = {
  group: 'secrets-store.csi.x-k8s.io',
  version: 'v1',
  kind: 'SecretProviderClass',
};

interface SecretProviderClass {
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

const getProviderIcon = (provider: string) => {
  switch (provider.toLowerCase()) {
    case 'azure':
      return '🔵';
    case 'aws':
      return '🟠';
    case 'gcp':
      return '🔴';
    case 'vault':
      return '🔐';
    case 'kubernetes':
      return '⚙️';
    default:
      return '📦';
  }
};

const getSecretProviderClassStatus = (spc: SecretProviderClass) => {
  if (!spc.status?.podStatus) {
    return { status: 'Unknown', icon: <ExclamationCircleIcon />, color: 'grey' };
  }

  const podStatuses = Object.values(spc.status.podStatus);
  const mountedPods = podStatuses.filter(pod => pod.mounted);
  const errorPods = podStatuses.filter(pod => pod.error);

  if (errorPods.length > 0) {
    return { status: 'Error', icon: <TimesCircleIcon />, color: 'red' };
  }

  if (mountedPods.length > 0) {
    return { status: 'Mounted', icon: <CheckCircleIcon />, color: 'green' };
  }

  return { status: 'Not Mounted', icon: <ExclamationCircleIcon />, color: 'orange' };
};

interface SecretProviderClassTableProps {
  selectedProject: string;
}

export const SecretProviderClassTable: React.FC<SecretProviderClassTableProps> = ({ selectedProject }) => {
  const { t } = useTranslation('plugin__ocp-secrets-management');
  const [openDropdowns, setOpenDropdowns] = React.useState<Record<string, boolean>>({});
  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean;
    secretProviderClass: SecretProviderClass | null;
    isDeleting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    secretProviderClass: null,
    isDeleting: false,
    error: null,
  });

  const toggleDropdown = (spcId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [spcId]: !prev[spcId],
    }));
  };

  const handleDelete = async (secretProviderClass: SecretProviderClass) => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true, error: null }));
    
    try {
      const url = `/api/kubernetes/apis/${SecretProviderClassModel.group}/${SecretProviderClassModel.version}/namespaces/${secretProviderClass.metadata.namespace}/secretproviderclasses/${secretProviderClass.metadata.name}`;
      await consoleFetch(url, { method: 'DELETE' });
      setDeleteModal({
        isOpen: false,
        secretProviderClass: null,
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

  const openDeleteModal = (secretProviderClass: SecretProviderClass) => {
    setDeleteModal({
      isOpen: true,
      secretProviderClass,
      isDeleting: false,
      error: null,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      secretProviderClass: null,
      isDeleting: false,
      error: null,
    });
  };

  const [secretProviderClasses, loaded, loadError] = useK8sWatchResource<SecretProviderClass[]>({
    groupVersionKind: SecretProviderClassModel,
    namespace: selectedProject === 'all' ? undefined : selectedProject,
    isList: true,
  });

  const columns = [
    { title: t('Name'), width: 16 },
    { title: t('Namespace'), width: 12 },
    { title: t('Provider'), width: 12 },
    { title: t('Secret Objects'), width: 14 },
    { title: t('Parameters'), width: 20 },
    { title: t('Status'), width: 12 },
    { title: '', width: 14 }, // Actions column
  ];

  const rows = React.useMemo(() => {
    if (!loaded || !secretProviderClasses) return [];

    return secretProviderClasses.map((spc) => {
      const spcId = `${spc.metadata.namespace}-${spc.metadata.name}`;
      const conditionStatus = getSecretProviderClassStatus(spc);
      
      // Get secret objects count
      const secretObjectsCount = spc.spec.secretObjects?.length || 0;
      const secretObjectsText = secretObjectsCount > 0 
        ? `${secretObjectsCount} secret${secretObjectsCount > 1 ? 's' : ''}`
        : 'None';

      // Get key parameters for display
      const parameters = spc.spec.parameters || {};
      const parameterKeys = Object.keys(parameters);
      const parametersText = parameterKeys.length > 0 
        ? `${parameterKeys.length} parameter${parameterKeys.length > 1 ? 's' : ''}`
        : 'None';

      return {
        cells: [
          spc.metadata.name,
          spc.metadata.namespace,
          (
            <span>
              {getProviderIcon(spc.spec.provider)} {spc.spec.provider}
            </span>
          ),
          secretObjectsText,
          parametersText,
          (
            <Label color={conditionStatus.color as any} icon={conditionStatus.icon}>
              {conditionStatus.status}
            </Label>
          ),
          (
            <Dropdown
              isOpen={openDropdowns[spcId] || false}
              onSelect={() => setOpenDropdowns(prev => ({ ...prev, [spcId]: false }))}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  aria-label="Actions"
                  variant="plain"
                  onClick={() => toggleDropdown(spcId)}
                  isExpanded={openDropdowns[spcId] || false}
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
                    const url = `/secrets-management/inspect/secretproviderclasses/${spc.metadata.namespace}/${spc.metadata.name}`;
                    window.location.href = url;
                  }}
                >
                  {t('Inspect')}
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  onClick={() => openDeleteModal(spc)}
                >
                  {t('Delete')}
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          ),
        ],
      };
    });
  }, [secretProviderClasses, loaded, openDropdowns, t]);

  return (
    <>
      <ResourceTable
        columns={columns}
        rows={rows}
        loading={!loaded}
        error={loadError?.message}
        emptyStateTitle={t('No secret provider classes found')}
        emptyStateBody={t('No secrets-store-csi-driver SecretProviderClasses are currently available in the selected project.')}
        data-test="secret-provider-classes-table"
      />

      {/* Delete Modal */}
      <Modal
        variant={ModalVariant.small}
        title={`${t('Delete')} ${t('SecretProviderClass')}`}
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
              {t('Are you sure you want to delete the SecretProviderClass "{name}"?', {
                name: deleteModal.secretProviderClass?.metadata.name,
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
              onClick={() => deleteModal.secretProviderClass && handleDelete(deleteModal.secretProviderClass)}
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
