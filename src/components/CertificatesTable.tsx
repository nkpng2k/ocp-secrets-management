import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { 
  Label, 
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, TimesCircleIcon, EllipsisVIcon } from '@patternfly/react-icons';
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
  const [openDropdowns, setOpenDropdowns] = React.useState<Record<string, boolean>>({});
  
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

  const [certificates, loaded, loadError] = useK8sWatchResource<Certificate[]>({
    groupVersionKind: CertificateModel,
    namespace: 'demo', // Focus on demo project as requested
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
              </DropdownList>
            </Dropdown>
          ),
        ],
      };
    });
  }, [certificates, loaded, openDropdowns, t]);

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
