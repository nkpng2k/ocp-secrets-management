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

interface CertificatesTableProps {
  selectedProject: string;
}

export const CertificatesTable: React.FC<CertificatesTableProps> = ({ selectedProject }) => {
  const { t } = useTranslation('plugin__ocp-secrets-management');
  const [openDropdowns, setOpenDropdowns] = React.useState<Record<string, boolean>>({});
  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean;
    certificate: Certificate | null;
    isDeleting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    certificate: null,
    isDeleting: false,
    error: null,
  });
  
  const toggleDropdown = (certId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [certId]: !prev[certId]
    }));
  };

  const handleInspect = (cert: Certificate) => {
    const namespace = cert.metadata.namespace || 'demo';
    const name = cert.metadata.name;
    window.location.href = `/secrets-management/inspect/certificates/${namespace}/${name}`;
  };

  const handleDelete = (cert: Certificate) => {
    setDeleteModal({
      isOpen: true,
      certificate: cert,
      isDeleting: false,
      error: null,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.certificate) return;
    
    setDeleteModal(prev => ({ ...prev, isDeleting: true, error: null }));
    
    try {
      // Manual delete using fetch to bypass k8sDelete API path issues
      const resourceName = deleteModal.certificate?.metadata?.name;
      const resourceNamespace = deleteModal.certificate?.metadata?.namespace;
      const apiPath = `/api/kubernetes/apis/cert-manager.io/v1/namespaces/${resourceNamespace}/certificates/${resourceName}`;
      
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
        certificate: null,
        isDeleting: false,
        error: null,
      });
    } catch (error: any) {

      setDeleteModal(prev => ({
        ...prev,
        isDeleting: false,
        error: error.message || 'Failed to delete certificate',
      }));
    }
  };

  const cancelDelete = () => {
    setDeleteModal({
      isOpen: false,
      certificate: null,
      isDeleting: false,
      error: null,
    });
  };

  const [certificates, loaded, loadError] = useK8sWatchResource<Certificate[]>({
    groupVersionKind: CertificateModel,
    namespace: selectedProject === 'all' ? undefined : selectedProject,
    isList: true,
  });

  const columns = [
    { title: t('Name'), width: 16 },
    { title: t('Namespace'), width: 10 },
    { title: t('Secret'), width: 16 },
    { title: t('Issuer'), width: 16 },
    { title: t('DNS Names'), width: 20 },
    { title: t('Status'), width: 12 },
    { title: '', width: 10 }, // Actions column
  ];

  const rows = React.useMemo(() => {
    if (!loaded || !certificates) return [];
    
    return certificates.map((cert) => {
      const conditionStatus = getConditionStatus(cert);
      const dnsNames = cert.spec.dnsNames?.join(', ') || cert.spec.commonName || '-';
      const certId = `${cert.metadata.namespace}-${cert.metadata.name}`;
      
      return {
        cells: [
          cert.metadata.name,
          cert.metadata.namespace,
          cert.spec.secretName,
          `${cert.spec.issuerRef.name} (${cert.spec.issuerRef.kind})`,
          dnsNames,
          (
            <Label color={conditionStatus.color as any} icon={conditionStatus.icon}>
              {conditionStatus.status}
            </Label>
          ),
          (
            <Dropdown
              isOpen={openDropdowns[certId] || false}
              onSelect={() => setOpenDropdowns(prev => ({ ...prev, [certId]: false }))}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  aria-label="kebab dropdown toggle"
                  variant="plain"
                  onClick={() => toggleDropdown(certId)}
                  isExpanded={openDropdowns[certId] || false}
                >
                  <EllipsisVIcon />
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <DropdownList>
                <DropdownItem
                  key="inspect"
                  onClick={() => handleInspect(cert)}
                >
                  {t('Inspect')}
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  onClick={() => handleDelete(cert)}
                >
                  {t('Delete')}
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          ),
        ],
      };
    });
  }, [certificates, loaded, openDropdowns, t]);

  return (
    <>
      <ResourceTable
        columns={columns}
        rows={rows}
        loading={!loaded}
        error={loadError?.message}
        emptyStateTitle={t('No certificates found')}
        emptyStateBody={t('No cert-manager certificates are currently available in the demo project.')}
        data-test="certificates-table"
      />
      
      <Modal
        variant={ModalVariant.small}
        title={`${t('Delete')} ${t('Certificate')}`}
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
              {`Are you sure you want to delete the ${t('Certificate')} "${deleteModal.certificate?.metadata?.name || ''}"?`}
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
