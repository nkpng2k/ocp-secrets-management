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
  const [openDropdowns, setOpenDropdowns] = React.useState<Record<string, boolean>>({});
  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean;
    issuer: Issuer | null;
    isDeleting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    issuer: null,
    isDeleting: false,
    error: null,
  });
  
  const toggleDropdown = (issuerId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [issuerId]: !prev[issuerId]
    }));
  };

  const handleInspect = (issuer: Issuer) => {
    const resourceType = issuer.metadata.namespace ? 'issuers' : 'clusterissuers';
    const name = issuer.metadata.name;
    if (issuer.metadata.namespace) {
      window.location.href = `/secrets-management/inspect/${resourceType}/${issuer.metadata.namespace}/${name}`;
    } else {
      window.location.href = `/secrets-management/inspect/${resourceType}/${name}`;
    }
  };

  const handleDelete = (issuer: Issuer) => {
    setDeleteModal({
      isOpen: true,
      issuer,
      isDeleting: false,
      error: null,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.issuer) return;
    
    setDeleteModal(prev => ({ ...prev, isDeleting: true, error: null }));
    
    try {
      const isClusterScoped = !deleteModal.issuer.metadata.namespace;
      const model = isClusterScoped ? ClusterIssuerModel : IssuerModel;
      const resourceType = isClusterScoped ? 'ClusterIssuer' : 'Issuer';
      
      console.log('Deleting issuer:', deleteModal.issuer?.metadata?.name, 'type:', resourceType, 'namespace:', deleteModal.issuer?.metadata?.namespace);
      
      await k8sDelete({
        model: {
          ...model,
          abbr: isClusterScoped ? 'clusterissuer' : 'issuer',
          label: resourceType,
          labelPlural: `${resourceType}s`,
          plural: isClusterScoped ? 'clusterissuers' : 'issuers',
          apiVersion: `${model.group}/${model.version}`,
        },
        resource: deleteModal.issuer,
      });
      
      // Close modal on success
      setDeleteModal({
        isOpen: false,
        issuer: null,
        isDeleting: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Delete issuer error:', error);
      setDeleteModal(prev => ({
        ...prev,
        isDeleting: false,
        error: error.message || 'Failed to delete issuer',
      }));
    }
  };

  const cancelDelete = () => {
    setDeleteModal({
      isOpen: false,
      issuer: null,
      isDeleting: false,
      error: null,
    });
  };
  
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
    { title: t('Name'), width: 16 },
    { title: t('Type'), width: 11 },
    { title: t('Scope'), width: 11 },
    { title: t('Issuer Type'), width: 13 },
    { title: t('Details'), width: 27 },
    { title: t('Status'), width: 12 },
    { title: '', width: 10 }, // Actions column
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
      const issuerId = `${issuer.metadata.namespace || 'cluster'}-${issuer.metadata.name}`;
      
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
          (
            <Dropdown
              isOpen={openDropdowns[issuerId] || false}
              onSelect={() => setOpenDropdowns(prev => ({ ...prev, [issuerId]: false }))}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  aria-label="kebab dropdown toggle"
                  variant="plain"
                  onClick={() => toggleDropdown(issuerId)}
                  isExpanded={openDropdowns[issuerId] || false}
                >
                  <EllipsisVIcon />
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <DropdownList>
                <DropdownItem
                  key="inspect"
                  onClick={() => handleInspect(issuer)}
                >
                  {t('Inspect')}
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  onClick={() => handleDelete(issuer)}
                >
                  {t('Delete')}
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          ),
        ],
      };
    });
  }, [issuers, clusterIssuers, loaded, openDropdowns, t]);

  return (
    <>
      <ResourceTable
        columns={columns}
        rows={rows}
        loading={!loaded}
        error={loadError?.message}
        emptyStateTitle={t('No issuers found')}
        emptyStateBody={t('No cert-manager issuers are currently available in the demo project or cluster.')}
        data-test="issuers-table"
      />
      
      <Modal
        variant={ModalVariant.small}
        title={`${t('Delete')} ${deleteModal.issuer?.metadata?.namespace ? t('Issuer') : t('ClusterIssuer')}`}
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
              {`Are you sure you want to delete the ${deleteModal.issuer?.metadata?.namespace ? t('Issuer') : t('ClusterIssuer')} "${deleteModal.issuer?.metadata?.name || ''}"?`}
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
