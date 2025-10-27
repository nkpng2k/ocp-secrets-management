import * as React from 'react';
import Helmet from 'react-helmet';
import { useTranslation } from 'react-i18next';
import {
  Title,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Badge,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { KeyIcon } from '@patternfly/react-icons';
import { CertificatesTable } from './CertificatesTable';
import { IssuersTable } from './IssuersTable';
import { ExternalSecretsTable } from './ExternalSecretsTable';
import { SecretStoresTable } from './SecretStoresTable';
import { PushSecretsTable } from './PushSecretsTable';
import { SecretProviderClassTable } from './SecretProviderClassTable';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

type OperatorType = 'cert-manager' | 'external-secrets' | 'secrets-store-csi' | 'all';
type ResourceKind = 'certificates' | 'issuers' | 'externalsecrets' | 'secretstores' | 'pushsecrets' | 'secretproviderclasses' | 'all';
type ProjectType = 'all' | string;

// Project/Namespace resource model
const ProjectModel = {
  group: '',
  version: 'v1',
  kind: 'Namespace',
};

interface Project {
  metadata: {
    name: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  status?: {
    phase: string;
  };
}

interface FilterState {
  operator: OperatorType;
  resourceKind: ResourceKind;
  project: ProjectType;
}

export default function SecretsManagement() {
  const { t } = useTranslation('plugin__ocp-secrets-management');
  const [filters, setFilters] = React.useState<FilterState>({
    operator: 'all',
    resourceKind: 'all',
    project: 'all',
  });

  // Fetch all namespaces/projects dynamically
  const [projects, projectsLoaded, projectsError] = useK8sWatchResource<Project[]>({
    groupVersionKind: ProjectModel,
    isList: true,
  });

  const operatorOptions = [
    { value: 'all', label: t('All Operators'), description: t('Show resources from all operators') },
    { value: 'cert-manager', label: 'cert-manager', description: t('Certificate lifecycle management') },
    { value: 'external-secrets', label: 'External Secrets Operator', description: t('External secret synchronization') },
    { value: 'secrets-store-csi', label: 'Secrets Store CSI Driver', description: t('Secret provider integration') },
  ];

  // Generate dynamic project options from fetched namespaces
  const getProjectOptions = React.useMemo(() => {
    const baseOptions = [
      { value: 'all', label: t('All Projects'), description: t('Show resources from all projects') }
    ];

    if (!projectsLoaded || projectsError || !projects) {
      return baseOptions;
    }

    // Filter and sort projects
    const sortedProjects = projects
      .filter((project) => {
        // Filter out system namespaces that are typically not user-relevant
        const name = project.metadata.name;
        const isSystemNamespace = name.startsWith('kube-') || 
                                 name.startsWith('openshift-') ||
                                 name === 'default' ||
                                 name === 'kube-node-lease' ||
                                 name === 'kube-public';
        
        // Include active projects only
        const isActive = !project.status || project.status.phase !== 'Terminating';
        
        return isActive && (!isSystemNamespace || 
                           name === 'default' || 
                           name === 'openshift-operators' ||
                           name === 'openshift-monitoring');
      })
      .sort((a, b) => {
        // Sort with common projects first, then alphabetically
        const commonProjects = ['default', 'openshift-operators', 'openshift-monitoring'];
        const aIsCommon = commonProjects.includes(a.metadata.name);
        const bIsCommon = commonProjects.includes(b.metadata.name);
        
        if (aIsCommon && !bIsCommon) return -1;
        if (!aIsCommon && bIsCommon) return 1;
        return a.metadata.name.localeCompare(b.metadata.name);
      });

    const projectOptions = sortedProjects.map((project) => ({
      value: project.metadata.name,
      label: project.metadata.name,
      description: project.metadata.labels?.['openshift.io/display-name'] || 
                  `${t('Project')}: ${project.metadata.name}`,
    }));

    return [...baseOptions, ...projectOptions];
  }, [projects, projectsLoaded, projectsError, t]);

  const projectOptions = getProjectOptions;

  const getResourceOptions = (operator: OperatorType) => {
    const baseOptions = [{ value: 'all', label: t('All Resources'), description: t('Show all resource types') }];
    
    if (operator === 'all') {
      return [
        ...baseOptions,
        { value: 'certificates', label: t('Certificates'), description: t('cert-manager certificates') },
        { value: 'issuers', label: t('Issuers'), description: t('cert-manager issuers') },
        { value: 'externalsecrets', label: t('External Secrets'), description: t('External secret definitions') },
        { value: 'secretstores', label: t('Secret Stores'), description: t('External secret stores') },
        { value: 'pushsecrets', label: t('Push Secrets'), description: t('External secret push configurations') },
        { value: 'secretproviderclasses', label: t('Secret Provider Classes'), description: t('CSI secret provider configurations') },
      ];
    } else if (operator === 'cert-manager') {
      return [
        ...baseOptions,
        { value: 'certificates', label: t('Certificates'), description: t('TLS certificates') },
        { value: 'issuers', label: t('Issuers'), description: t('Certificate issuers') },
      ];
    } else if (operator === 'external-secrets') {
      return [
        ...baseOptions,
        { value: 'externalsecrets', label: t('External Secrets'), description: t('Secret synchronization rules') },
        { value: 'secretstores', label: t('Secret Stores'), description: t('External secret backends') },
        { value: 'pushsecrets', label: t('Push Secrets'), description: t('Secret push configurations') },
      ];
    } else if (operator === 'secrets-store-csi') {
      return [
        ...baseOptions,
        { value: 'secretproviderclasses', label: t('Secret Provider Classes'), description: t('Secret provider configurations') },
      ];
    }
    return baseOptions;
  };

  const handleOperatorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newOperator = event.target.value as OperatorType;
    setFilters(prev => ({
      ...prev,
      operator: newOperator,
      resourceKind: 'all', // Reset resource filter when operator changes
    }));
  };

  const handleResourceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({
      ...prev,
      resourceKind: event.target.value as ResourceKind,
    }));
  };

  const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({
      ...prev,
      project: event.target.value as ProjectType,
    }));
  };

  const shouldShowComponent = (operator: OperatorType, resourceKind: ResourceKind) => {
    if (filters.operator !== 'all' && filters.operator !== operator) return false;
    if (filters.resourceKind !== 'all' && filters.resourceKind !== resourceKind) return false;
    return true;
  };

  return (
    <>
      <Helmet>
        <title data-test="secrets-management-page-title">
          {t('Secrets Management')}
        </title>
      </Helmet>
      <div className="co-m-pane__body co-m-pane__body--no-top-margin">
        <div className="co-m-pane__heading">
          <Title headingLevel="h1" size="2xl" className="co-m-pane__heading-title">
            <KeyIcon className="co-m-resource-icon co-m-resource-icon--lg" /> {t('Secrets Management')}
          </Title>
          <p className="help-block">
            {t('Manage certificates, external secrets, and secret stores across your cluster.')}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="co-m-pane__filter-bar" style={{ padding: '16px 0', borderBottom: '1px solid #ddd', marginBottom: '16px' }}>
          <Flex spaceItems={{ default: 'spaceItemsMd' }}>
            <FlexItem>
              <label className="co-m-filter-label" style={{ marginRight: '8px', fontWeight: 'bold' }}>
                {t('Project')}:
              </label>
              <select 
                className="form-control" 
                value={filters.project} 
                onChange={handleProjectChange}
                disabled={!projectsLoaded}
                style={{ width: '200px', display: 'inline-block' }}
              >
                {!projectsLoaded ? (
                  <option value="all">{t('Loading projects...')}</option>
                ) : projectsError ? (
                  <option value="all">{t('Error loading projects')}</option>
                ) : (
                  projectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))
                )}
              </select>
            </FlexItem>
            <FlexItem>
              <label className="co-m-filter-label" style={{ marginRight: '8px', fontWeight: 'bold' }}>
                {t('Operator')}:
              </label>
              <select 
                className="form-control" 
                value={filters.operator} 
                onChange={handleOperatorChange}
                style={{ width: '200px', display: 'inline-block' }}
              >
                {operatorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FlexItem>
            <FlexItem>
              <label className="co-m-filter-label" style={{ marginRight: '8px', fontWeight: 'bold' }}>
                {t('Resource Type')}:
              </label>
              <select 
                className="form-control" 
                value={filters.resourceKind} 
                onChange={handleResourceChange}
                style={{ width: '200px', display: 'inline-block' }}
              >
                {getResourceOptions(filters.operator).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FlexItem>
            <FlexItem>
              <Badge isRead>
                {filters.project === 'all' ? t('All Projects') : filters.project}
                {` | ${filters.operator === 'all' ? t('All Operators') : 
                 filters.operator === 'cert-manager' ? 'cert-manager' : 
                 filters.operator === 'external-secrets' ? 'External Secrets' : 'Secrets Store CSI'}`}
                {filters.resourceKind !== 'all' && ` → ${getResourceOptions(filters.operator).find(opt => opt.value === filters.resourceKind)?.label}`}
              </Badge>
            </FlexItem>
          </Flex>
        </div>

        <div className="co-m-pane__body-group">
          <Grid hasGutter>
            {/* cert-manager Resources */}
            {shouldShowComponent('cert-manager', 'certificates') && (
              <GridItem span={12}>
                <Card>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        {t('Certificates')} 
                        <Badge isRead style={{ marginLeft: '8px' }}>cert-manager</Badge>
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <CertificatesTable selectedProject={filters.project} />
                  </CardBody>
                </Card>
              </GridItem>
            )}

            {shouldShowComponent('cert-manager', 'issuers') && (
              <GridItem span={12}>
                <Card>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        {t('Issuers')}
                        <Badge isRead style={{ marginLeft: '8px' }}>cert-manager</Badge>
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <IssuersTable selectedProject={filters.project} />
                  </CardBody>
                </Card>
              </GridItem>
            )}

            {/* External Secrets Resources */}
            {shouldShowComponent('external-secrets', 'externalsecrets') && (
              <GridItem span={12}>
                <Card>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        {t('External Secrets')}
                        <Badge isRead style={{ marginLeft: '8px' }}>External Secrets Operator</Badge>
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <ExternalSecretsTable selectedProject={filters.project} />
                  </CardBody>
                </Card>
              </GridItem>
            )}

            {shouldShowComponent('external-secrets', 'secretstores') && (
              <GridItem span={12}>
                <Card>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        {t('Secret Stores')}
                        <Badge isRead style={{ marginLeft: '8px' }}>External Secrets Operator</Badge>
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <SecretStoresTable selectedProject={filters.project} />
                  </CardBody>
                </Card>
              </GridItem>
            )}

            {shouldShowComponent('external-secrets', 'pushsecrets') && (
              <GridItem span={12}>
                <Card>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        {t('Push Secrets')}
                        <Badge isRead style={{ marginLeft: '8px' }}>External Secrets Operator</Badge>
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <PushSecretsTable selectedProject={filters.project} />
                  </CardBody>
                </Card>
              </GridItem>
            )}

            {/* Secrets Store CSI Driver Resources */}
            {shouldShowComponent('secrets-store-csi', 'secretproviderclasses') && (
              <GridItem span={12}>
                <Card>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        {t('Secret Provider Classes')}
                        <Badge isRead style={{ marginLeft: '8px' }}>Secrets Store CSI Driver</Badge>
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <SecretProviderClassTable selectedProject={filters.project} />
                  </CardBody>
                </Card>
              </GridItem>
            )}
          </Grid>
        </div>
      </div>
    </>
  );
}
